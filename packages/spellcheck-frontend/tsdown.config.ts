/// <reference types="node" />
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'lib/main.ts',
  dts: true,
  sourcemap: true,
});
