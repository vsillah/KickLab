import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
function glb(name){const path=join(root,'src/assets/3d',name==='cobalt'?'kicklab-race-direction-a':`kicklab-race-${name}`,'v1',name==='cobalt'?'direction-a-atlas.glb':`${name}-original.glb`),bytes=readFileSync(path),size=bytes.readUInt32LE(12);return JSON.parse(bytes.subarray(20,20+size).toString());}
function paint(document,label){const material=document.materials.find(item=>item.name===label);assert.ok(material,`${label} material is present`);return material.pbrMetallicRoughness.baseColorFactor.slice(0,3);}

test('the three local Race cars have distinct body and aero material identities',()=>{
  const kestrel=glb('kestrel'),aegis=glb('aegis');
  const orange=paint(kestrel,'body · solar orange lacquer');
  const crimson=paint(aegis,'body · deep crimson lacquer');
  const cobaltBytes=readFileSync(join(root,'src/assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb'));
  assert.equal(createHash('sha256').update(cobaltBytes).digest('hex'),'97658df10425c45043f35778872d25d4bb674e701b13548e0a0a16139cfafbcc','Cobalt remains the original cobalt-blue atlas asset');
  assert.ok(orange[0]>.8&&orange[1]>.12&&orange[1]<.3&&orange[2]<.05,'Kestrel is vivid orange');
  assert.ok(crimson[0]>.25&&crimson[0]<.45&&crimson[1]<.05&&crimson[2]<.08,'Aegis is deep crimson');
  for(const [document,label] of [[kestrel,'aero · dark graphite sill'],[aegis,'aero · black carbon surfaces']]){
    const carbon=paint(document,label);assert.ok(carbon.every(component=>component<.08),`${label} remains dark`);
  }
});
