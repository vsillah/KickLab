import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const athlete=read('src/game/50a-direction-c-athlete.js');
const multiQa=read('scripts/qa-multi-activity-athlete.mjs');
const scopeQa=read('scripts/qa-competitor-renderer-scope.mjs');
const identityQa=read('scripts/qa-competitor-identity-diversity.mjs');

test('maps every full-renderer competitor path to the shared athlete pool',()=>{
  assert.match(athlete,/o\.wall\?['"]wall['"]/);
  assert.match(athlete,/o\.keeper\?['"]keeper['"]/);
  assert.match(athlete,/o\.headX!==undefined\?['"]marker['"]/);
  assert.match(athlete,/if\(o\.gloves\)return['"]keeper['"]/);
  assert.match(athlete,/if\(o\.back&&o\.tag\)return['"]teammate['"]/);
  assert.match(athlete,/if\(D\.state===['"]keep['"]&&!o\.back\)return['"]striker['"]/);
  assert.match(athlete,/return this\.prepareCompetitor/);
});

test('gives competitors role kits, fictional identities, role clips, and no controlled marker',()=>{
  for(const id of ['amara','biko','sade','kwame','nala','sekou','zola','issa'])assert.match(athlete,new RegExp(`id:'${id}'`));
  for(const role of ['keeper','wall','defender','marker','striker','teammate'])assert.match(athlete,new RegExp(`${role}:\\[`));
  for(const clip of ['KeeperReady','KeeperDive','HeaderReady','HeaderContact','PenaltyStrike','RunUp','DribbleCycle','PassContact'])assert.match(athlete,new RegExp(`['"]${clip}['"]`));
  assert.match(athlete,/marked:false/);
  assert.match(athlete,/opponentMarked:false/);
});

test('changes visible face, complexion, build, and hairstyle geometry instead of metadata alone',()=>{
  for(const style of ['crown-curls','high-top','side-puff','short-locs','double-puffs','flat-top','braided-bun','close-fade'])assert.match(athlete,new RegExp(`hairStyle:'${style}'`));
  for(const face of ['oval','broad','heart','angular','round','long','diamond','square'])assert.match(athlete,new RegExp(`face:'${face}'`));
  assert.match(athlete,/morphIdentityFace\(actor,identity\)/);
  assert.match(athlete,/object\.geometry=object\.geometry\.clone\(\)/);
  assert.match(athlete,/KickLabIdentity-\$\{identity\.id\}-\$\{identity\.face\}-\$\{identity\.hairStyle\}/);
  assert.match(athlete,/'KickLabMakeHumanAthlete\.body':identity\.bodyTint/);
  assert.match(athlete,/feature=this\.identityMaterial\(identity\.highlight/);
  assert.match(athlete,/browWidth=\.036\*identity\.faceWidth/);
  assert.match(athlete,/mat\.name===['"]KickLabMakeHumanAthlete\.body['"]\?null:mat\.map/);
  assert.match(athlete,/featureProfile:actor\.identityVisual\.featureProfile/);
  assert.match(athlete,/visualSignature:actor\.identityVisual\.signature/);
  assert.match(athlete,/complexion:actor\.target\.identity\.bodyTint/);
});

test('qualifies competitor counts, responsive pacing, fallbacks, and renderer scope',()=>{
  assert.match(multiQa,/competitorContracts=/);
  assert.match(multiQa,/competitorCount<contract\.min/);
  assert.match(multiQa,/new Set\(actors\.map\(actor=>actor\.root\)\)\.size!==actors\.length/);
  assert.match(multiQa,/pacing\.desktop\.p95Ms/);
  assert.match(multiQa,/externalRequests\.size===0/);
  assert.match(scopeQa,/\['desktop',1440,1000\]/);
  assert.match(scopeQa,/\['tablet',768,1024\]/);
  assert.match(scopeQa,/\['mobile',390,844\]/);
  assert.match(scopeQa,/mode of \['fight','race'\]/);
  assert.match(scopeQa,/fullRendererActive:false/);
  assert.match(identityQa,/distinct:4/);
  assert.match(identityQa,/roles:\['keeper','teammate','defender'\]/);
  assert.match(identityQa,/values\('visualSignature'\)\.size<scenario\.distinct/);
  assert.match(identityQa,/values\('complexion'\)\.size<scenario\.distinct/);
  assert.match(identityQa,/values\('featureProfile'\)\.size<scenario\.distinct/);
  assert.match(identityQa,/__KICKLAB_DIRECTION_C_TEAM_FOCUS__/);
});

test('keeps implementation and QA free of external runtime egress',()=>{
  assert.doesNotMatch(athlete,/fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
  assert.doesNotMatch(scopeQa,/fetch\(|XMLHttpRequest|sendBeacon/);
});
