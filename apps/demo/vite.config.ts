import { defineConfig } from 'vite';
import { appendFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'spellcheck-debug-log-endpoint',
      configureServer(server) {
        server.middlewares.use('/__spellcheck_debug_log', (req, res, next) => {
          if (req.method !== 'POST') {
            next();
            return;
          }
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body) as unknown;
              appendFileSync(
                '/opt/cursor/logs/debug.log',
                `${JSON.stringify(parsed)}\n`,
              );
              res.statusCode = 204;
              res.end();
            } catch {
              res.statusCode = 400;
              res.end('invalid debug payload');
            }
          });
        });
      },
    },
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
