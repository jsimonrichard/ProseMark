import baseConfig from './index.ts';
import { defineConfig } from 'eslint/config';

declare global {
  interface ImportMeta {
    dirname: string;
  }
}

export default defineConfig([
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
