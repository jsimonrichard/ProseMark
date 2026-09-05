# AGENTS.md

ProseMark is a WYSIWYM Markdown toolkit built as CodeMirror 6 extensions:
`packages/core` plus opt-in `packages/{latex,render-html,paste-rich-text,spellcheck-frontend}`,
consumed by `apps/vscode-extensions/*`, `apps/demo`, and `apps/docs`. Bun +
Turborepo; releases via Changesets.

Gates (what CI runs): `bun run turbo build check-types lint format:check`.

## House rules

These apply to **every** change, in every language. A narrower rule in
`.cursor/rules/` may override one of them; nothing else does. They exist because
each has come up repeatedly in review — following them up front saves a round.

### 1. No silent fallbacks

- If a state is impossible, **throw**. A fallback that hides a broken invariant
  is a defect even when it makes a test pass.
- If a permission, scope, or identity is unclear, **deny** — fail closed.
- A guard for a dangerous capability is a **required** argument, never an
  optional one with a safe-looking default.
- An error a user can hit must reach the **UI**, not only the log or console.
- Expected failures — validation, authorization, not-found, business rules — are
  not exceptions. Return them as data and display them.

Before writing `?? fallback`, an empty-collection return, or a `catch` that
swallows: decide whether the condition means an invariant broke. If it does,
throw instead.

### 2. Read upstream before writing a workaround

- Check what the framework, SDK, or platform already provides, and prefer its
  supported mechanism — **even at the cost of deleting local code that works**.
- If a workaround is genuinely needed, name the upstream mechanism you checked
  and why it did not work, in the commit body or PR description.
- Derive values from their authoritative source. A version, path, or expected
  value restated in a second place is a bug while it is still correct.
- Reach for a type guard before a cast, and for a documented API before
  coordinate math or DOM probing.
- A cross-cutting problem (release scripting, lockfiles, a Result type, a CI
  gate) may already be solved in a sibling repo. Port that solution rather than
  inventing a second one.

### 3. Generalize; do not special-case

- When a fix applies to one case, check whether the general rule holds for all
  cases and unify on **one path**. Two code paths where one would do is a defect
  even when both are correct.
- A host never branches on the identity of a plugin, extension, or backend. If
  it needs to know _which_ one it is handling, the contract is missing a hook —
  add the optional hook so every implementation can opt in.
- After a general fix lands, **delete** the special case or fallback it
  replaced. Leaving both is the most common way this rule half-lands.

### 4. One concern per change

- One concern per commit and per PR. Never batch unrelated modules.
- Migrating a pattern across N modules is N changes, not one.
- Stop at each step of a multi-step feature and hand back for review rather than
  running the whole plan.
- A change that is narrower than asked but complete beats a wider one that needs
  unpicking. If scope has to grow, say so and stop.

### 5. Plan before building anything substantial

Write the plan to a file first, in this shape:

- **Goal** — one paragraph.
- **Principles** — the decisions that constrain everything else, including what
  backward compatibility (if any) is actually required.
- **Numbered work sections** — in shipping order, one concern each.
- **Out of scope** — explicit non-goals.
- **Success criteria** — numbered and observable.

Get the plan reviewed before writing code. Correcting a plan is cheaper than
correcting an implementation.

### 6. State what is not done

- Report gaps, deferrals, and residual assumptions with the same specificity as
  the work. Never let a summary imply coverage the change does not have.
- If a check was skipped, say it was skipped. If a test fails, quote the output.
- Establish which checks were already failing **before** you started. Report an
  inherited failure as inherited; do not silently fix it inside an unrelated
  change, and do not let it mask yours.
- When touching docs, verify each claim against current behavior rather than
  against the surrounding prose. Correct stale claims and date the
  reconciliation.
- A plan or note that reality has overtaken gets a status banner saying what
  superseded it — not a quiet edit.

### Required outputs

Two things are part of the deliverable, not optional extras.

1. **Reuse survey — before writing code.** Name the existing modules, tables,
   routes, and helpers that already touch this area, and say which you are
   extending. If you are adding rather than extending, say why the existing
   abstraction did not fit.
2. **Diff shape — at handoff.** Report files changed and lines added/removed,
   and say what the change let you delete. A diff that adds far more than it
   removes is a signal to re-check, not a sign of progress.

## Where these bite in this repo

- **Layer first.** `packages/core` is the CodeMirror toolkit. `packages/{latex,
render-html,paste-rich-text,spellcheck-frontend}` are opt-in extensions.
  `apps/vscode-extensions/*`, `apps/demo`, `apps/docs` are hosts. A behavior that
  belongs to an optional feature is a package, not a core flag.
- **Rule 1** — a missing `.cm-line`, a null `syntaxTree` node, or an absent
  webview API means a broken editor state: throw rather than fall back. See
  ProseMark #147, which removed exactly such a `coordsAtPos` fallback.
- **Rule 2** — CodeMirror, MathJax, and the VS Code webview API are upstream.
  Prefer a documented facet, `eq()`, or a type guard over coordinate math,
  `posAtDOM` probing, or an `as` cast.
- **Rule 3** — one measurement/decoration path for all nesting levels, not a
  branch per case. A single keymap facet, not per-field maps.
- **Rule 6** — user-facing changes get a `.changeset/` file; never hand-edit a
  package `CHANGELOG.md` (`.cursor/rules/changesets.mdc`).

Gate before every push: **enforced by hooks, not by your memory of this file.**
See § Enforced gate below.

## Enforced gate

The quality gate is executed by the harness, so skipping it is not an option
available to you:

| When                                    | What runs              | Effect on failure                                          |
| --------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| A `git push` command                    | `.claude/gate.sh full` | The push is **denied**; the failure is handed to you       |
| End of a turn, with uncommitted changes | `.claude/gate.sh fast` | The failure is handed back for you to fix before finishing |

Wiring lives in `.claude/settings.json` (Claude Code) and `.cursor/hooks.json`
(Cursor). Run it yourself at any point — don't wait to be blocked:

```bash
.claude/gate.sh fast       # the quick checks
.claude/gate.sh full       # everything, same as the push gate
.claude/gate.sh full -v    # stream every command's output
```

It prints each check's label before running it and `ok`/`FAILED` with a
duration after, so a slow `full` run never looks hung. A failure names the
failing step. Under a hook that progress goes to stderr, because a hook's
stdout is parsed as JSON.

Do not work around the gate. `CLAUDE_GATE_SKIP=1` exists for a failure that is
pre-existing or that the user has explicitly accepted for a specific change —
per rule 6, establish that baseline and **ask** before using it.

Works under **git and Jujutsu**, colocated or not (`jj` wins when both are
present, matching `vcs_kind_at()` in tsk-core). `git push` and `jj git push` are
both gated, including behind a `cd x &&`. If no repo or no gate script is found,
the push is denied rather than allowed unverified.

`fast` = `turbo run check-types lint` + format:check. `full` runs
`bun run turbo build check-types lint format:check`, the exact set CI runs.
Requires `bun install`.
