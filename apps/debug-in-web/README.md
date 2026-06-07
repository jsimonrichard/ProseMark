# debug-in-web

Minimal Vite app to reproduce ProseMark / CodeMirror behavior in a real browser **without** VS Code message passing or extension host setup.

Compared to `apps/debug-vsc-extn-in-web`:

- Same core idea: Markdown + `prosemarkBasicSetup` + light theme.
- **Adds `drawSelection()`** so caret and selection drawing match setups that hide the native caret (needed to reproduce fixed-tab / overlay caret bugs).
- **No** spellcheck harness, paste extensions, LaTeX, render-html, or VS Code–specific flows.

## Run

From repo root (installs workspace deps):

```bash
bun install
cd apps/debug-in-web && bun run dev
```

Or:

```bash
bunx turbo dev -F debug-in-web
```

## Tab / caret repro

1. Open the app, click **Load `a\tb`** (or **Load line with tabs**).
2. Use **Caret before tab** / **Caret after tab**.
3. Click **Log coords + overlay caret** to print `coordsAtPos` and the `.cm-cursor-primary` box (check for zero width/height).

In the devtools console, `window.debugEditor` is the `EditorView`.
