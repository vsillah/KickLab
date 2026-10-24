import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Color} from 'three';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('athlete palette CSS colors receive one sRGB conversion',()=>{
  const source=read('src/game/50a-direction-c-athlete.js');
  const renderer=read('src/game/50-renderer-3d.js');
  const intended=new Color('#175da0');
  assert.equal(intended.getHexString(),'175da0');
  assert.notEqual(intended.clone().convertSRGBToLinear().getHexString(),'175da0');
  assert.match(source,/mat\.color\.set\(palette\[mat\.name\]\)/);
  assert.doesNotMatch(source,/mat\.color\.set\(palette\[mat\.name\]\)\.convertSRGBToLinear/);
  assert.doesNotMatch(renderer,/mat\.color\.convertSRGBToLinear\(\)/);
  assert.doesNotMatch(renderer,/L\.sole\.material\.color\.convertSRGBToLinear\(\)/);
});

test('opaque mapped skin writes depth and keeps distinct textured complexions',()=>{
  const glb=readFileSync(resolve(root,'src/assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb'));
  const jsonLength=glb.readUInt32LE(12);
  const asset=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8'));
  const body=asset.materials.find(material=>material.name==='KickLabMakeHumanAthlete.body');
  assert.equal(body.alphaMode,'BLEND');
  assert.equal(body.pbrMetallicRoughness.baseColorFactor?.[3]??1,1);
  const pngView=asset.bufferViews[asset.images[0].bufferView];
  const pngStart=20+jsonLength+8+pngView.byteOffset;
  assert.equal(glb.subarray(pngStart,pngStart+8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(glb[pngStart+25],2,'body texture must be RGB without alpha');
  const source=read('src/game/50a-direction-c-athlete.js');
  assert.match(source,/if\(body\)\{mat\.transparent=false;mat\.depthWrite=true;\}/);
  const primary=new Color('#ffffff'),opponent=new Color('#ead9cf');
  assert.ok(opponent.r<primary.r&&opponent.g<primary.g&&opponent.b<primary.b);
  assert.match(source,/SkinTint:'#ffffff'/);
  assert.match(source,/SkinTint:'#ead9cf'/);
});
