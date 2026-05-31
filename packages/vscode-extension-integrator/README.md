# `@prosemark/vscode-extension-integrator`

Utilities for building **ProseMark VS Code companion extensions** that register sub-extensions against the main [ProseMark](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark) editor: typed RPC between the extension host and the CodeMirror webview, shared bundling of CodeMirror externals, and helpers to append CodeMirror extensions at runtime.

Published on npm: [`@prosemark/vscode-extension-integrator`](https://www.npmjs.com/package/@prosemark/vscode-extension-integrator).

## Subpath exports

| Import                                                   | Purpose                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `@prosemark/vscode-extension-integrator`                 | `SubExtensionManager`, `SubExtensionCallbackManager` (extension host)   |
| `@prosemark/vscode-extension-integrator/webview`         | Webview message handlers, `appendToExtraCodeMirrorExtensions`           |
| `@prosemark/vscode-extension-integrator/types`           | `ProseMarkExtensionApi`, `SubExtensionCallback`, proc maps, `Change`, … |
| `@prosemark/vscode-extension-integrator/rolldown-plugin` | Rolldown/Vite plugin for webview bundles                                |

## Architecture

1. The **core ProseMark** extension exposes `registerSubExtension(extId, callback)` on its API.
2. A **companion extension** (cSpell, LaTeX, etc.) calls that API from `activate`.
3. The callback receives a typed bridge to register webview procedures and push CodeMirror extensions into `window.proseMark.extraCodeMirrorExtensions`.

Extension IDs must not contain `:` (used as a namespace separator in messages).

## Extension host example

```ts
import * as vscode from 'vscode';
import type { ProseMarkExtensionApi } from '@prosemark/vscode-extension-integrator/types';
import { createMyIntegration, extId } from './sub-extension';

export function activate(context: vscode.ExtensionContext): void {
  const proseMark = vscode.extensions.getExtension<ProseMarkExtensionApi>(
    'jsimonrichard.vscode-prosemark',
  );
  if (!proseMark) throw new Error('ProseMark extension not found');

  proseMark.exports.registerSubExtension(
    extId,
    createMyIntegration(context.extensionUri),
  );
}
```

See [`apps/vscode-extensions/cspell-integration`](https://github.com/jsimonrichard/ProseMark/tree/main/apps/vscode-extensions/cspell-integration) and [`latex-integration`](https://github.com/jsimonrichard/ProseMark/tree/main/apps/vscode-extensions/latex-integration) for full examples.

## Webview example

```ts
import {
  registerWebviewMessageHandler,
  appendToExtraCodeMirrorExtensions,
} from '@prosemark/vscode-extension-integrator/webview';
import { myEditorExtensions } from './extensions';

// After the editor is ready:
appendToExtraCodeMirrorExtensions(view, myEditorExtensions);

registerWebviewMessageHandler(
  extId,
  {
    someProc: (arg) => {
      /* ... */
    },
  },
  vscode,
);
```

Use **`appendToExtraCodeMirrorExtensions`** instead of `StateEffect.appendConfig` so multiple integrations can share the same `Compartment`.

## Bundling (Rolldown / Vite)

The default plugin keeps a single copy of shared modules on `window.proseMark.externalModules`:

- `@codemirror/state`
- `@codemirror/view`
- `@prosemark/core`

```ts
import proseMarkVSCodeExtensionIntegratorPlugin from '@prosemark/vscode-extension-integrator/rolldown-plugin';

export default defineConfig({
  plugins: [proseMarkVSCodeExtensionIntegratorPlugin()],
  // ...
});
```

The core ProseMark webview must populate `window.proseMark.externalModules` before sub-extension scripts run.

## Reference implementations

- [ProseMark - Code Spell Checker Integration](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-cspell-integration)
- [ProseMark - LaTeX math (MathJax) integration](https://marketplace.visualstudio.com/items?itemName=jsimonrichard.vscode-prosemark-latex-integration)
