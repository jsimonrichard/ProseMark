import baseConfig from '../../eslint.config-base.ts';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  { ignores: ['scripts/**'] },
  ...baseConfig,
]);
