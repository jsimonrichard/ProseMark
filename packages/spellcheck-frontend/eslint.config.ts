import baseConfig from '@prosemark/eslint-config';
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
        projectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 14,
          allowDefaultProject: ['tsdown.config.ts', 'eslint.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
