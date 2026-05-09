/**
 * Copies the installed `mathjax` npm package into dist/webview/mathjax so the
 * VS Code webview can dynamic-import tex-svg.js from a vscode-resource URL.
 */
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const extRoot = join(here, '..');
const require = createRequire(join(extRoot, 'package.json'));
const mjRoot = dirname(require.resolve('mathjax/package.json'));
const dest = join(extRoot, 'dist', 'webview', 'mathjax');

mkdirSync(dirname(dest), { recursive: true });
cpSync(mjRoot, dest, { recursive: true });
