import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    outDir: 'dist/extension',
    noExternal: [/^(?!vscode).*/],
    external: 'vscode',
    name: 'extension backend',
    entry: 'src/extension.ts',
    platform: 'node',
    format: 'cjs',
  },
]);
