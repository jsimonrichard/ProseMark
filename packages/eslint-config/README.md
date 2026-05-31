# `@prosemark/eslint-config`

Shared [ESLint 9 flat config](https://eslint.org/docs/latest/use/configure/configuration-files) for the ProseMark monorepo. This package is **private** and not published to npm.

## Usage

In a package’s `eslint.config.ts`:

```ts
import baseConfig from '@prosemark/eslint-config';
import { defineConfig } from 'eslint/config';

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
```

The shared config enables:

- `@eslint/js` recommended rules
- `typescript-eslint` **strict** and **stylistic** type-checked presets
- TypeScript project service (`projectService: true`)
- Stricter unused-vars and **`explicit-module-boundary-types`** for `.ts` files

Packages extend it locally with `tsconfigRootDir` (and any package-specific overrides).

## Dependencies

Dev-only in this package: `@eslint/js`, `eslint`, `typescript-eslint`, `@types/node`.
