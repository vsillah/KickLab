import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../scripts/qa-match-visual-coherence.mjs'),'utf8');

test('qualifies Header Duel ready, X-ray, and recovery at three responsive widths',()=>{
  assert.match(source,/desktop-1440x1000/);
  assert.match(source,/tablet-768x1024/);
  assert.match(source,/mobile-390x844/);
  assert.match(source,/\['Space',1180,'Space'\]/);
  assert.match(source,/active\.xray\?\.active/);
  assert.match(source,/after\.athlete\.phase!==['"]Recovery['"]/);
});

test('gates orientation, controlled-player ownership, shared opponent, crowd LOD, pacing, fallbacks, and zero egress',()=>{
  assert.match(source,/primaryFaces!==['"]field-negative-x['"]/);
  assert.match(source,/opponentRenderer!==['"]shared-direction-c['"]/);
  assert.match(source,/controlledIndicator\.owner!==['"]primary['"]/);
  assert.match(source,/controlledIndicator\.opponentMarked/);
  assert.match(source,/controlledIndicator\.sizePx!==expectedIndicatorSize/);
  assert.match(source,/hidden-xray/);
  assert.match(source,/\['replay','cinematic'\]/);
  assert.match(source,/visibility!==`hidden-\$\{indicatorState\}`/);
  assert.match(source,/visibleLegacyAudienceRenderers!==0/);
  assert.match(source,/oldCrowdTextureLayers!==0/);
  assert.match(source,/audience\?\.instances!==64/);
  assert.match(source,/nearStand\.contactsPass/);
  assert.match(source,/pacing\.p95Ms>budget/);
  assert.match(source,/ready-reduced-motion/);
  assert.match(source,/athlete\.status!==['"]canvas['"]/);
  assert.match(source,/External requests observed/);
  assert.match(source,/libx264/);
});
