import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const glbPath = new URL('../evaluation/3d-pipeline/assets/kicklab-placeholder-athlete.glb', import.meta.url);

async function readGlbJson() {
  const file = await readFile(glbPath);
  assert.equal(file.readUInt32LE(0), 0x46546c67, 'asset should use GLB magic');
  assert.equal(file.readUInt32LE(4), 2, 'asset should use glTF 2.0');
  const jsonLength = file.readUInt32LE(12);
  assert.equal(file.readUInt32LE(16), 0x4e4f534a, 'first chunk should be JSON');
  return { file, json: JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8').trimEnd()) };
}

test('placeholder GLB stays small and carries the shared-skeleton contract', async () => {
  const { file, json } = await readGlbJson();
  assert.ok(file.length < 350_000, `GLB budget exceeded: ${file.length} bytes`);
  assert.equal(json.skins.length, 1);
  assert.ok(json.skins[0].joints.length >= 20);
  const nodes = new Map(json.nodes.map(node => [node.name, node]));
  assert.equal(nodes.get('AthleteSurface').skin, 0);
  assert.equal(nodes.get('SharedSkeletonAnatomy').skin, 0);
  assert.equal(nodes.get('FootContact_R').extras.role, 'exact-foot-contact-marker');
  assert.equal(nodes.get('FootContact_R').extras.contactFrame, 18);
  assert.equal(nodes.get('ContactBall').extras.role, 'contact-target');
});

test('placeholder GLB includes named runtime clips without embedded images', async () => {
  const { json } = await readGlbJson();
  assert.deepEqual(json.animations.map(animation => animation.name).sort(), ['Idle', 'KickContact']);
  assert.equal(json.images?.length || 0, 0);
  assert.equal(json.textures?.length || 0, 0);
  assert.ok(json.materials.length <= 10);
});

test('evaluation harness is local-only and exposes degradation controls', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../evaluation/3d-pipeline/harness/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../evaluation/3d-pipeline/harness/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /\.\.\/\.\.\/\.\.\/src\/vendor\/three\.min\.js/);
  assert.doesNotMatch(`${html}\n${app}`, /https?:\/\//);
  assert.match(html, /2D fallback off/);
  assert.match(html, /Reduced off/);
  assert.match(app, /InstancedMesh/);
  assert.match(app, /new THREE\.LOD/);
});
