import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'src/extension.ts'],
  outDir: 'dist',
  format: 'cjs',
  sourcemap: true,
  clean: true,
  // required until https://github.com/marijnh/style-mod/pull/14 merges
  minify: true,
  external: ['vscode'],
  platform: 'node',
});
