import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'lib/main.ts',
  tsconfig: 'tsconfig.src.json',
  dts: true,
  sourcemap: true,
});
