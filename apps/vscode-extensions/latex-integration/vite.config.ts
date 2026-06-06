import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import proseMarkVSCodeExtensionIntegratorPlugin from '@prosemark/vscode-extension-integrator/rolldown-plugin';

import { copyMathjaxSreAssets } from './vite-plugin-mathjax-sre';

const webviewOutDir = resolve(__dirname, 'dist/webview');

export default defineConfig({
  plugins: [
    proseMarkVSCodeExtensionIntegratorPlugin(),
    copyMathjaxSreAssets(webviewOutDir),
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
