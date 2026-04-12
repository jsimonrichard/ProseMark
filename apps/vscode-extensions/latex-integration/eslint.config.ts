import baseConfig from '../../../eslint.config-base.ts';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'warn',
    },
  },
]);
