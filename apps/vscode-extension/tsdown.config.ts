import { defineConfig } from 'tsdown';

const defaultConfig = defineConfig({
  outDir: 'dist',
  sourcemap: true,
  external: 'vscode',
});

export default defineConfig([
  {
    ...defaultConfig,
    name: 'webview',
    entry: 'src/webview/main.ts',
    format: 'iife',
  },
  {
    ...defaultConfig,
    name: 'extension backend',
    entry: 'src/extension.ts',
    platform: 'node',
    format: 'cjs',
  },
]);
