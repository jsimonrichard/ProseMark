// @ts-check
/**
 * @import { Config } from 'prettier';
 */

export default /** @type {Config} */ ({
  plugins: ['prettier-plugin-astro'],
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 80,
  overrides: [{ files: 'turbo.json', options: { parser: 'json-stringify' } }],
});
