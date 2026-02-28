import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const playwrightModulePath = process.env.PLAYWRIGHT_MODULE ?? 'playwright';
let chromium;
try {
  ({ chromium } = await import(playwrightModulePath));
} catch (error) {
  console.error(
    'Could not load Playwright. Install it in an isolated directory and set PLAYWRIGHT_MODULE, or add it to this workspace before running repro:codefence.',
  );
  console.error(String(error));
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const port = 4310;

const contentTypeByExt = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

const server = http.createServer(async (req, res) => {
  try {
    const rawPath = req.url?.split('?')[0] ?? '/';
    const safePath = rawPath.replace(/^\/+/, '');
    const targetPath = path.join(distDir, safePath || 'index.html');
    const normalizedTarget = path.normalize(targetPath);

    if (!normalizedTarget.startsWith(path.normalize(distDir))) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    let filePath = normalizedTarget;
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch {
      filePath = path.join(distDir, 'index.html');
    }

    const body = await fs.readFile(filePath);
    res.setHeader(
      'Content-Type',
      contentTypeByExt.get(path.extname(filePath)) ?? 'application/octet-stream',
    );
    res.end(body);
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});

const listen = (server_, port_) =>
  new Promise((resolve, reject) => {
    server_.listen(port_, '127.0.0.1', () => resolve());
    server_.on('error', reject);
  });

const closeServer = (server_) =>
  new Promise((resolve, reject) => {
    server_.close((error) => (error ? reject(error) : resolve()));
  });

const pageErrors = [];

try {
  await listen(server, port);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  await page.goto(`http://127.0.0.1:${String(port)}/`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => Boolean(window.debugEditor));

  await page.click('#load-code-fence-fixture');
  await page.click('#select-code-fence-body');

  for (let i = 0; i < 20; i++) {
    await page.click('#stress-selection');
  }

  await page.waitForTimeout(250);
  await browser.close();
} finally {
  await closeServer(server);
}

const fatalErrors = pageErrors.filter((error) =>
  error.includes('Invalid child in posBefore'),
);

if (fatalErrors.length > 0) {
  console.error('Reproduced Invalid child in posBefore');
  for (const error of fatalErrors) {
    console.error(error);
  }
  process.exit(1);
}

if (pageErrors.length > 0) {
  console.error('Encountered page errors:');
  for (const error of pageErrors) {
    console.error(error);
  }
  process.exit(2);
}

console.log('No page errors in code-fence repro script.');
