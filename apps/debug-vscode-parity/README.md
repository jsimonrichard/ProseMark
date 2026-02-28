# ProseMark VS Code Parity Debugger

This Vite app is a local debugging surface for ProseMark editor behavior that
is otherwise easier to hit inside the VS Code extension webview.

It includes:

- the same core ProseMark editor setup used by the extension frontend
- paste and markdown behavior from workspace packages
- an async spellcheck harness with stale-result guard toggles
- controls for code-fence selection stress scenarios
- browser-side error logging (`window.error` and `unhandledrejection`)

## Run

```bash
bun --cwd apps/debug-vscode-parity dev
```

## Build

```bash
bun --cwd apps/debug-vscode-parity build
```

## Optional reproducibility script

After building, you can run:

```bash
bun --cwd apps/debug-vscode-parity repro:codefence
```

By default this expects `playwright` to be resolvable. You can point to an
alternate module path with `PLAYWRIGHT_MODULE`.
