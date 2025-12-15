import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: 'lib/main.ts',
    noExternal: [/^(?!vscode).*/],
    external: 'vscode',
    dts: true,
    sourcemap: true,
  },
  { entry: 'lib/webview.ts', dts: true, sourcemap: true },
  { entry: 'lib/types.ts', dts: { emitDtsOnly: true }, sourcemap: true },
]);
