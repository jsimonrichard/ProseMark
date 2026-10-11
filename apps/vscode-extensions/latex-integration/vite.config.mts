import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import proseMarkVSCodeExtensionIntegratorPlugin from '@prosemark/vscode-extension-integrator/rolldown-plugin';
import {
  copyMathJaxAssets,
  MATHJAX_TEX_SVG_COPY_ENTRIES,
} from '@prosemark/latex/vite-plugin-mathjax';

const webviewOutDir = resolve(__dirname, 'dist/webview');

export default defineConfig({
  plugins: [
    proseMarkVSCodeExtensionIntegratorPlugin(),
    copyMathJaxAssets({
      outDir: webviewOutDir,
      // Include sre/ for hosts that enable MathJax a11y (e.g. Cursor). Stock VS
      // Code disables a11y at runtime — see host-mathjax-a11y.ts.
      copy: MATHJAX_TEX_SVG_COPY_ENTRIES,
    }),
  ],
  build: {
    outDir: 'dist/webview',
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/webview/main.ts'),
      name: 'webview',
      formats: ['iife'],
      fileName: () => 'webview.js',
    },
    rollupOptions: {
      external: ['vscode'],
    },
  },
});
