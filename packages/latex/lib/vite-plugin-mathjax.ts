import { cpSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

/** Default copy set for self-hosted `tex-svg` + speech worker (VS Code webviews, static apps). */
export const MATHJAX_TEX_SVG_COPY_ENTRIES = ['tex-svg.js', 'sre'] as const;

export interface CopyMathJaxAssetsOptions {
  /** Directory Vite writes bundles to (e.g. `dist/webview`). */
  outDir: string;
  /**
   * Folder under `outDir` where MathJax files are placed.
   * @default 'mathjax'
   */
  destDir?: string;
  /**
   * Paths relative to the `mathjax` npm package root (files or directories).
   * Each entry is copied to `{outDir}/{destDir}/{entry}`.
   */
  copy: readonly string[];
}

/** Absolute path to the installed `mathjax` package root. */
export const resolveMathJaxPackageRoot = (): string =>
  resolve(require.resolve('mathjax/package.json'), '..');

const copyPath = (src: string, dest: string): void => {
  if (!existsSync(src)) {
    throw new Error(`MathJax copy source not found: ${src}`);
  }
  mkdirSync(dirname(dest), { recursive: true });
  if (statSync(src).isDirectory()) {
    cpSync(src, dest, { recursive: true });
  } else {
    cpSync(src, dest);
  }
};

/**
 * Vite plugin: copy selected files/directories from the `mathjax` npm package
 * into your build output (for self-hosted {@link mathJaxLoadMode} `url-import`).
 */
export function copyMathJaxAssets(options: CopyMathJaxAssetsOptions): Plugin {
  const { outDir, destDir = 'mathjax', copy } = options;

  return {
    name: '@prosemark/latex/copy-mathjax-assets',
    closeBundle() {
      const mathjaxRoot = resolveMathJaxPackageRoot();
      const destRoot = resolve(outDir, destDir);

      for (const entry of copy) {
        copyPath(resolve(mathjaxRoot, entry), resolve(destRoot, entry));
      }
    },
  };
}
