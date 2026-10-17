import assert from 'node:assert/strict';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = join(root, '.github', 'workflows', 'pages-prepare.yml');
const workflow = readFileSync(workflowPath, 'utf8');
const pagesRoot = join(root, 'dist', 'pages');
const pagesEntries = readdirSync(pagesRoot).sort();

assert.deepEqual(pagesEntries, ['index.html'], 'Pages root must contain only the self-contained entry point');
assert.ok(!lstatSync(join(pagesRoot, 'index.html')).isSymbolicLink(), 'Pages entry point must be a regular file');
assert.equal(
  readFileSync(join(pagesRoot, 'index.html'), 'utf8'),
  readFileSync(join(root, 'dist', 'kicklab.html'), 'utf8'),
  'Pages entry point must exactly match the checked KickLab build',
);

assert.match(workflow, /^permissions:\n  contents: read$/m, 'workflow permissions must remain read-only');
assert.match(workflow, /actions\/upload-pages-artifact@v5/, 'workflow must package a Pages artifact');
assert.match(workflow, /path: dist\/pages/, 'workflow must upload the prepared Pages root');
assert.match(workflow, /run: npm run check/, 'workflow must preserve the full repository check contract');

for (const forbidden of [
  /pages:\s*write/i,
  /id-token:\s*write/i,
  /^\s+[a-z-]+:\s*write\s*$/im,
  /actions\/deploy-pages/i,
  /^\s*environment:/m,
  /^\s*deployment:/m,
  /^\s*push:/m,
  /\$\{\{\s*secrets\./i,
]) {
  assert.doesNotMatch(workflow, forbidden, `prepare-only workflow contains forbidden deployment capability: ${forbidden}`);
}

console.log('prepare-only Pages contract checks passed');
