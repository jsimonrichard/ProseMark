import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distWasm = join(pkgRoot, 'dist', 'wasm');

const resolveWasmDir = (pkg) => {
  const rel = join('node_modules', '@myriaddreamin', pkg, 'pkg');
  const candidates = [
    join(pkgRoot, rel),
    join(pkgRoot, '..', '..', rel),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(
    `Could not find @myriaddreamin/${pkg} under ${candidates.join(' or ')}. Run install from the repo root.`,
  );
};

const compilerDir = resolveWasmDir('typst-ts-web-compiler');
const rendererDir = resolveWasmDir('typst-ts-renderer');

mkdirSync(distWasm, { recursive: true });
copyFileSync(
  join(compilerDir, 'typst_ts_web_compiler_bg.wasm'),
  join(distWasm, 'typst_ts_web_compiler_bg.wasm'),
);
copyFileSync(
  join(rendererDir, 'typst_ts_renderer_bg.wasm'),
  join(distWasm, 'typst_ts_renderer_bg.wasm'),
);
