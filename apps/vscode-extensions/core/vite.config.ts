import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist/webview',
    target: 'es2020',
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
