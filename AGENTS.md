# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ProseMark is a Bun workspaces monorepo using Turborepo. It builds WYSIWYM markdown editor extensions for CodeMirror 6, plus VS Code extensions and a demo/docs site. No external services or databases are required.

### Runtime

- **Bun** (`packageManager: bun@1.2.17`) is the package manager. It is installed at `~/.bun/bin/bun` and added to PATH via `~/.bashrc`.
- **Node.js** (v22+) is also available (needed by some tooling).

### Key commands (all run from repo root)

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Build all | `bun turbo build` |
| Typecheck all | `bun turbo check-types` |
| Lint all | `bun turbo lint` |
| Dev (demo app) | `cd apps/demo && npx vite --host 0.0.0.0` |
| Dev (all deps for demo) | `cd apps/demo && bun run dev-all` |
| Dev (docs site) | `cd apps/docs && bun run dev` |

### Gotchas

- Shell sessions in the cloud VM use non-login, non-interactive shells. Bun must be explicitly on PATH. The update script handles this by exporting `BUN_INSTALL` and prepending `$BUN_INSTALL/bin` to PATH before running `bun install`.
- VS Code extensions (`apps/vscode-extensions/*`) cannot be tested end-to-end without VS Code, but their `build`, `check-types`, and `lint` scripts work fine via `bun turbo build/check-types/lint`.
- The demo app (`apps/demo`) is a Vite app that depends on all library packages. Running `bun turbo build` first ensures workspace packages have their `dist/` output.
- There is no test suite beyond the VS Code extension tests (which require VS Code Electron).
