import fs from 'fs';
import {
  parse,
  modify,
  applyEdits,
  printParseErrorCode,
  ParseError,
} from 'jsonc-parser';

// Path to bun.lock
const lockPath = 'bun.lock';
let text = fs.readFileSync(lockPath, 'utf8');

// Parse once to get current structure and detect syntax errors
const errors: ParseError[] = [];
const lock = parse(text, errors, {
  allowTrailingComma: true,
  disallowComments: false,
});

if (errors.length > 0) {
  console.warn('⚠️  bun.lock parse warnings:');
  for (const e of errors)
    console.warn(` - ${printParseErrorCode(e.error)} at ${e.offset}`);
}

// Collect all edits
let allEdits = [];

for (const workspacePath in lock.workspaces) {
  // Read each package.json for updated version
  const pkgPath = `./${workspacePath}/package.json`;
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const current = lock.workspaces[workspacePath]?.version;
  const next = pkg.version;

  if (current !== next) {
    console.log(`Updating ${workspacePath} → ${next}`);

    // Path within JSON structure
    const jsonPath = ['workspaces', workspacePath, 'version'];
    const edits = modify(text, jsonPath, next, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    });

    // Apply immediately so that subsequent modifications have the up‑to‑date text
    text = applyEdits(text, edits);
  }
}

// Write back only if changes were applied
if (text !== fs.readFileSync(lockPath, 'utf8')) {
  fs.writeFileSync(lockPath, text);
  console.log('✔️  bun.lock workspace versions patched');
} else {
  console.log('No workspace version changes detected.');
}
