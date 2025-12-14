import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: 'lib/main.ts',
    noExternal: [/^(?!vscode).*/],
    external: 'vscode',
    dts: true,
  },
  { entry: 'lib/webview.ts', dts: true },
]);
