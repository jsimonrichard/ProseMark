import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'dictionary-loader',
      load(id) {
        // Handle dictionary files from dictionary-en package
        if (
          id.includes('dictionary-en') &&
          (id.endsWith('.aff') || id.endsWith('.dic'))
        ) {
          try {
            // Extract the filename from the import path
            const fileName = id.split('dictionary-en/').pop() || '';
            const filePath = resolve(
              process.cwd(),
              'node_modules',
              'dictionary-en',
              fileName,
            );
            const content = readFileSync(filePath);
            return `export default new Uint8Array([${Array.from(content).join(',')}]);`;
          } catch (error) {
            console.error(`Failed to load dictionary file: ${id}`, error);
            return null;
          }
        }
      },
    },
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    exclude: ['dictionary-en'],
  },
});
