import { defineConfig } from 'tsdown';

const defaultConfig = defineConfig({
  outDir: 'dist',
  sourcemap: true,
  external: 'vscode',
});

export default defineConfig([
  {
    ...defaultConfig,
    entry: 'src/main.ts',
    format: 'iife',
  },
  {
    ...defaultConfig,
    entry: 'src/extension.ts',
    platform: 'node',
    format: 'cjs',
  },
]);
