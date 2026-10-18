import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const focused = readFileSync(new URL('../scripts/qa-header-duel-xray.mjs', import.meta.url), 'utf8');

test('waits for canonical gameplay pacing before the Header Duel two-input cadence', () => {
  assert.match(focused, /gamePacingOverlay'\)\.waitFor\(\{ state: 'hidden', timeout: 10000 \}\)/);
  assert.match(focused, /page\.keyboard\.press\('Space'\);\n  await page\.waitForTimeout\(1180\);\n  await page\.keyboard\.press\('Space'\)/);
});

test('requires Header Duel to enter and leave live X-ray without egress at every responsive viewport', () => {
  for (const viewport of ['desktop-1440x1000', 'tablet-768x1024', 'mobile-390x844']) assert.match(focused, new RegExp(viewport));
  assert.match(focused, /__KICKLAB_PHYSICS_VISION__\?\.active === true/);
  assert.match(focused, /active\.xray\.annotations !== false \|\| active\.xray\.persistentMath !== false/);
  assert.match(focused, /__KICKLAB_PHYSICS_VISION__\?\.active === false/);
  assert.match(focused, /after\.athlete\?\.phase !== 'Recovery'/);
  assert.match(focused, /external requests observed/);
});
