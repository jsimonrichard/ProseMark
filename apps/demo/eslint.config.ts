import baseConfig from '@prosemark/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

declare global {
  interface ImportMeta {
    dirname: string;
  }
}

export default defineConfig([
  ...baseConfig,
  globalIgnores(['.astro/']),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 14,
          allowDefaultProject: [
            'tsdown.config.ts',
            'eslint.config.ts',
            'vite.config.ts',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
