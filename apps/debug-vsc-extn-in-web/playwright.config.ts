import { defineConfig } from '@playwright/test';

const PORT = 4173;
const HOST = '127.0.0.1';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://${HOST}:${PORT.toString()}/`,
    headless: true,
  },
  webServer: {
    command: `bun run build && bun run preview -- --host ${HOST} --port ${PORT.toString()}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
