#!/usr/bin/env bash
# Quality gate. Run by Claude Code and Cursor hooks; also runnable by hand.
#
#   .claude/gate.sh fast            the quick checks
#   .claude/gate.sh full            everything the push gate runs
#   .claude/gate.sh full --event=<claude-pretooluse|claude-stop|cursor-shell|cursor-stop>
#
# Wiring: .claude/settings.json (Claude Code), .cursor/hooks.json (Cursor).
# Works under git and Jujutsu (jj), colocated or not; jj wins when both are
# present, matching vcs_kind_at() in tsk-core.
#
# Escape hatch for a failure you have knowingly accepted, with the user's
# agreement:  CLAUDE_GATE_SKIP=1 <your push command>
set -uo pipefail

MODE="${1:-full}"
EVENT="cli"
for a in "$@"; do case "$a" in --event=*) EVENT="${a#--event=}" ;; esac; done

is_hook=1; case "$EVENT" in cli) is_hook=0 ;; esac

# --- emit a refusal in whatever dialect the caller speaks -------------------
fail() {
  local reason="$1"
  case "$EVENT" in
    claude-pretooluse)
      jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
      exit 0 ;;
    claude-stop)
      jq -nc --arg r "$reason" '{decision:"block",reason:$r}'
      exit 0 ;;
    cursor-shell|cursor-stop)
      # Cursor documents exit code 2 as "block"; don't guess at its JSON shape.
      printf '%s\n' "$reason" >&2; exit 2 ;;
    *)
      printf '%s\n' "$reason" >&2; exit 1 ;;
  esac
}

# --- cheapest possible exit for the common case ----------------------------
# On shell events this runs for every command, so match the push before doing
# any repo detection.
case "$EVENT" in
  claude-pretooluse|cursor-shell)
    STDIN_JSON="$(timeout 2 cat 2>/dev/null || true)"
    case "$EVENT" in
      claude-pretooluse) CMD="$(printf '%s' "$STDIN_JSON" | jq -r '.tool_input.command // ""' 2>/dev/null)" ;;
      cursor-shell)      CMD="$(printf '%s' "$STDIN_JSON" | jq -r '.command // ""' 2>/dev/null)" ;;
    esac
    # `git push`, `jj git push`, and either behind a `cd x &&` or after a `;`.
    printf '%s' "$CMD" | grep -Eq \
      -e '(^|[;&|])[[:space:]]*git([[:space:]]+-[^[:space:]]+)*[[:space:]]+push([[:space:]]|$)' \
      -e '(^|[;&|])[[:space:]]*jj([[:space:]]+-[^[:space:]]+)*[[:space:]]+git([[:space:]]+-[^[:space:]]+)*[[:space:]]+push([[:space:]]|$)' \
      || exit 0
    ;;
esac

if [ -n "${CLAUDE_GATE_SKIP:-}" ]; then
  [ "$is_hook" = 0 ] && echo "gate: skipped (CLAUDE_GATE_SKIP set)"
  exit 0
fi

# --- VCS shim ---------------------------------------------------------------
VCS=""; ROOT=""
if command -v jj >/dev/null 2>&1 && R="$(jj root 2>/dev/null)" && [ -d "$R/.jj" ]; then
  VCS=jj; ROOT="$R"
elif R="$(git rev-parse --show-toplevel 2>/dev/null)" && [ -n "$R" ]; then
  VCS=git; ROOT="$R"
else
  # Refuse rather than silently allowing an unverified push.
  case "$EVENT" in
    claude-pretooluse|cursor-shell)
      fail "Gate could not run: no git or jj repository found here, so nothing was verified." ;;
    *) exit 0 ;;   # end-of-turn outside a repo is not interesting
  esac
fi
cd "$ROOT" 2>/dev/null || fail "Gate could not run: cannot enter repo root $ROOT."

case "$VCS" in
  jj)
    STATE_DIR="$ROOT/.jj"
    # jj snapshots the working copy on every command, and the working copy IS a
    # commit, so @'s commit_id changes whenever the tree changes.
    state_hash() { jj log -r @ --no-graph -T 'commit_id' 2>/dev/null; }
    has_pending() { [ "$(jj log -r @ --no-graph -T 'if(empty,"empty","dirty")' 2>/dev/null)" = dirty ]; }
    ;;
  git)
    STATE_DIR="$ROOT/.git"
    state_hash() {
      { git rev-parse HEAD 2>/dev/null || echo nohead
        git status --porcelain=v1 2>/dev/null
        git diff HEAD 2>/dev/null
      } | sha256sum | cut -d' ' -f1
    }
    has_pending() { [ -n "$(git status --porcelain 2>/dev/null)" ]; }
    ;;
esac
SENTINEL="$STATE_DIR/claude-gate-state"

# --- end-of-turn: skip when idle, and never report the same tree twice ------
case "$EVENT" in
  claude-stop|cursor-stop)
    has_pending || exit 0
    NOW="$(state_hash)"
    if [ -n "$NOW" ] && [ -f "$SENTINEL" ] && [ "$(cat "$SENTINEL" 2>/dev/null)" = "$NOW" ]; then
      exit 0   # already reported on this exact tree; do not loop
    fi
    ;;
esac

# --- checks (per repo) ------------------------------------------------------
preflight() {
  [ -d node_modules ] || { echo "dependencies are not installed - run 'bun install' in the repo root."; return 1; }
}
run_checks() {
  set -o pipefail
  bunx turbo run check-types lint || return 1
  bun run format:check            || return 1
  [ "$MODE" = "full" ] || return 0
  # The exact set CI runs (.github/workflows/ci.yml "Merge checks"):
  bun run turbo build check-types lint format:check || return 1
}

# --- an unconfigured gate must not pretend to have checked anything ---------
if [ -n "${GATE_UNCONFIGURED:-}" ]; then
  case "$EVENT" in
    claude-pretooluse|cursor-shell)
      fail "Push blocked: this repo's quality gate is not configured yet.
$GATE_UNCONFIGURED
Fill in run_checks in .claude/gate.sh (recipes are in the file), then delete the
GATE_UNCONFIGURED line. Do not stub run_checks out to get past this." ;;
    claude-stop|cursor-stop)
      # Warn, but do not block every turn on a setup task.
      printf 'gate: not configured for this repo (%s); end-of-turn checks skipped.\n' \
        "$GATE_UNCONFIGURED" >&2
      exit 0 ;;
    *)
      printf 'gate: not configured (%s)\n' "$GATE_UNCONFIGURED" >&2
      exit 1 ;;
  esac
fi

# --- run --------------------------------------------------------------------
# preflight runs at top level, NOT inside a command substitution, so a fail()
# here can actually emit its decision and exit. Anything meaning "cannot
# verify" belongs here, never inside run_checks.
if declare -F preflight >/dev/null 2>&1; then
  PRE="$(preflight 2>&1)"; PRC=$?
  [ "$PRC" -ne 0 ] && fail "Gate could not run, so nothing was verified: $PRE"
fi

OUT="$(run_checks 2>&1)"; RC=$?

case "$EVENT" in
  claude-stop|cursor-stop) state_hash > "$SENTINEL" 2>/dev/null || true ;;
esac

if [ "$RC" -eq 0 ]; then
  [ "$is_hook" = 0 ] && echo "gate: $MODE checks passed ($VCS)"
  exit 0
fi

DETAIL="$(printf '%s' "$OUT" | tail -n 40 | tail -c 3000)"
case "$EVENT" in
  claude-pretooluse|cursor-shell)
    fail "Push blocked: this repo's full quality gate failed. Fix these, then push again.
Re-run yourself with: .claude/gate.sh full
If the failure is pre-existing or knowingly accepted, ask the user before overriding with CLAUDE_GATE_SKIP=1.

$DETAIL" ;;
  *)
    fail "This repo's fast checks are failing on your pending changes. Fix them before finishing.
Re-run yourself with: .claude/gate.sh fast

$DETAIL" ;;
esac
