import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig({
  plugins: [
    externalizeDeps(),
    dts({
      entryRoot: 'lib',
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'lib/main.ts'),
      name: 'ProseMarkRenderHTML',
      formats: ['es'],
      // the proper extensions will be added
      fileName: (_, entryName) => `${entryName}.mjs`,
    },
  },
});
