import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src', 'index.html'), 'utf8');
const built = readFileSync(join(root, 'dist', 'kicklab.html'), 'utf8');
const game = readFileSync(join(root, 'dist', 'game.js'), 'utf8');

assert.match(source, /^<!doctype html>/i, 'source must be a complete HTML document');
assert.match(source, /<html lang="en">/, 'document language must be declared');
assert.match(source, /<meta charset="utf-8">/, 'UTF-8 must be declared before visible content');
assert.match(source, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/, 'mobile viewport contract must be present');
assert.ok(source.indexOf('charset="utf-8"') < source.indexOf('<title>'), 'charset must precede the title');

for (const label of ['Fight', 'Race', 'Kick']) {
  assert.match(built, new RegExp(`data-mode="${label.toLowerCase()}"`), `${label} lab must remain in the build`);
}

for (const feature of ['impactlab.v1', 'impactlab.nick', 'Family board', 'Weekly challenge']) {
  assert.ok(source.includes(feature) || built.includes(feature) || game.includes(feature), `${feature} continuity marker must remain`);
}
assert.match(readFileSync(join(root, 'scripts', 'build.mjs'), 'utf8'), /vendor\/three\.min\.js/, 'local Three.js bundle must remain wired into the build');
assert.ok(readFileSync(join(root, 'src', 'vendor', 'three.min.js'), 'utf8').length > 100_000, 'local Three.js bundle must remain populated');

for (const inputContract of ['keydown', 'keyup', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
  assert.ok(game.includes(inputContract), `${inputContract} input contract must remain`);
}

assert.ok(!built.includes('{{STYLES}}') && !built.includes('{{VENDOR}}') && !built.includes('{{GAME}}'), 'build placeholders must be resolved');
console.log('web contract checks passed');
