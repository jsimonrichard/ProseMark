import { cpSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

/**
 * MathJax `tex-svg` loads `sre/speech-worker.js` at runtime via `importScripts`
 * inside a web worker. Vite inlines the main bundle but not that file, so copy
 * the npm package's `sre/` tree next to `webview.js` after each build.
 */
export function copyMathjaxSreAssets(outDir: string): Plugin {
  return {
    name: 'copy-mathjax-sre',
    closeBundle() {
      const mathjaxRoot = resolve(
        require.resolve('mathjax/package.json'),
        '..',
      );
      const sreSrc = resolve(mathjaxRoot, 'sre');
      if (!existsSync(sreSrc)) {
        throw new Error(
          `MathJax sre directory not found at ${sreSrc}. Is the mathjax package installed?`,
        );
      }

      const sreDest = resolve(outDir, 'sre');
      cpSync(sreSrc, sreDest, { recursive: true });
    },
  };
}
