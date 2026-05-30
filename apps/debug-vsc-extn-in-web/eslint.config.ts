import baseConfig from '@prosemark/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  ...baseConfig,
  globalIgnores(['.astro/']),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
