# Plan: VS Code TextDocument owns undo/redo

## Goal

Stop the first-undo flash by making the backing `TextDocument` the sole undo
stack for document content in the ProseMark custom editor, matching VS Code’s
CustomTextEditor model and the markdown custom editor’s history forwarding.

## Principles

- One undo stack for document text: VS Code’s. CodeMirror must not keep a
  competing document history in the VS Code webview.
- Prefer upstream mechanisms: `vscode.commands.executeCommand('undo'|'redo')`
  after draining in-flight `applyEdit`s; sync the resulting document change
  through the existing `onTextDocumentChange` → webview `update` path.
- Fail closed: if the panel is not active, do not run undo/redo against another
  document.
- Layer: VS Code host/webview wiring in `apps/vscode-extensions/core`; optional
  history in `@prosemark/core` only if needed so demo/docs keep CM history.
- One concern: document-undo ownership. EDH flash harness stays deferred.
- Cursor mapping on `update`/`set` from prior work stays; do not reintroduce
  `selection: { anchor: 0 }` on sync.

## Reuse survey

| Existing                                                              | Role                         | Action                                                                              |
| --------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `Core.#enqueueWebviewUpdate` / `#pendingWebviewUpdates`               | Serializes webview→doc edits | Drain before host undo/redo                                                         |
| `DocumentChangeEchoGate`                                              | Drops applyEdit echoes       | Keep for typing sync; host undo is _not_ gated (no `beginApply`) so changes forward |
| `webview/main.ts` `update` + `planDocumentReplace` / mapped selection | Applies host→webview changes | Reuse for undo results                                                              |
| `prosemarkBasicSetup()` `history()` + `historyKeymap`                 | CM document history          | Disable for VS Code webview only                                                    |
| `VSCodeExtensionProcMap` / integrator message procs                   | Webview↔host RPC             | Add `undo` / `redo`                                                                 |
| `SubExtensionCallbackContext`                                         | Has `webview`, not panel     | Extend with `webviewPanel` for `active` check (markdown pattern)                    |
| Demo/docs `prosemarkBasicSetup()`                                     | Keep stock CM history        | Unchanged default                                                                   |

## Work sections

1. **Integrator context** — Pass `webviewPanel` into `SubExtensionCallbackContext` from `buildExtensionManager` / `ProseMarkEditor`.
2. **Host `undo`/`redo` procs** — Await pending updates; if `webviewPanel.active`, `executeCommand('undo'|'redo')`.
3. **Core setup option** — `prosemarkBasicSetup({ history?: boolean })` default `true`; VS Code passes `false`.
4. **Webview keymap** — `Prec.highest` Mod-z / Mod-y / Mod-Shift-z → host procs (covers menu/chrome if any still hit the view; primary path is host command after chord).
5. **Tests + changeset** — Host unit test for drain-then-command; adjust documentReplace tests that assumed CM history in the extension package; changeset for `vscode-prosemark` (+ integrator/core if API changes).
6. **Update HANDOFF constraint note** — Stock CM history exception now applied for the VS Code host.

## Out of scope

- `@vscode/test-electron` / EDH flash harness (next if flash remains).
- Vim `u` / redo bindings (may still expect CM history — report as gap).
- Removing the echo gate (still needed for typing sync).
- Changing demo/docs undo behavior.

## Success criteria

1. Typing then Ctrl+Z in the ProseMark custom editor undoes via the TextDocument; the webview reflects the change once without a visible flash of the pre-undo text.
2. Redo restores the same way.
3. Demo app still uses CodeMirror history.
4. Gate: `.claude/gate.sh fast` (and full before any push).
5. Gaps stated: no EDH harness yet; vim undo not redirected.
