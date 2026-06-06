import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: 'lib/main.ts',
    dts: true,
    sourcemap: true,
  },
  {
    entry: 'lib/vite-plugin-mathjax.ts',
    dts: true,
    sourcemap: true,
  },
]);
