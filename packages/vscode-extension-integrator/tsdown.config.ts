import { defineConfig } from 'tsdown';

const libTsconfig = 'tsconfig.lib.json';

export default defineConfig([
  {
    entry: 'lib/main.ts',
    tsconfig: libTsconfig,
    noExternal: [/^(?!vscode).*/],
    external: 'vscode',
    dts: true,
    sourcemap: true,
  },
  {
    entry: 'lib/webview.ts',
    tsconfig: libTsconfig,
    dts: true,
    sourcemap: true,
  },
  {
    entry: 'lib/types.ts',
    tsconfig: libTsconfig,
    dts: { emitDtsOnly: true },
    sourcemap: true,
  },
  {
    entry: 'lib/rolldown-plugin.ts',
    tsconfig: libTsconfig,
    dts: true,
    sourcemap: true,
  },
]);
