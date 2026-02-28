import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.config-base.ts';

export default defineConfig([
  ...baseConfig,
  {
    ignores: ['tests/**'],
  },
]);
