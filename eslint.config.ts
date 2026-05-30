import baseConfig from '@prosemark/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  ...baseConfig,
  globalIgnores(['./scripts/', './*.config.{js,ts}']),
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 14,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
