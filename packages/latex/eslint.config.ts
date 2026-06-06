/// <reference types="node" />
import baseConfig from '@prosemark/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
