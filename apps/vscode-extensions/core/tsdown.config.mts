import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    outDir: 'dist',
    noExternal: [/^(?!vscode).*/],
    external: 'vscode',
    name: 'webview',
    entry: 'src/webview/main.ts',
    format: ['iife'],
    platform: 'browser',
    target: 'es2020',
  },
  {
    outDir: 'dist',
    noExternal: [/^(?!vscode).*/],
    external: 'vscode',
    name: 'extension backend',
    entry: 'src/extension.ts',
    platform: 'node',
    format: 'cjs',
  },
]);
