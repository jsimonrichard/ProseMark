import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'lib/main.ts',
  tsconfig: 'tsconfig.lib.json',
  dts: true,
  sourcemap: true,
});
