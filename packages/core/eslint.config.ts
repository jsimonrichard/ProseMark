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
  {
    files: ['tests/*.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
]);
