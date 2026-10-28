import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const context={globalThis:{},location:{search:'?raceProgression=prototype'}};
context.globalThis.KickLabRaceOrigin={trusted:()=>true};
runInNewContext(readFileSync(new URL('../src/shared/race-progression.js',import.meta.url),'utf8'),context);
runInNewContext(readFileSync(new URL('../src/shared/race-venue-selection.js',import.meta.url),'utf8'),context);
const {ROUTES,compatible,normalize}=context.globalThis.KickLabRaceVenueSelection;

test('only canonical venue and route combinations are offered',()=>{
  assert.deepEqual(Array.from(ROUTES.highland),['drag','drift','circuit','hill','endurance']);
  assert.deepEqual(Array.from(ROUTES.marine),['marine']);
  assert.deepEqual(Array.from(ROUTES.forest),['forest']);
  for(const [venue,routes] of Object.entries(ROUTES))for(const route of routes)assert.equal(compatible(venue,route),true);
  for(const venue of Object.keys(ROUTES))for(const route of ['drag','drift','circuit','hill','endurance','marine','forest'])if(!ROUTES[venue].includes(route))assert.equal(compatible(venue,route),false);
});

test('stale or locked saved venues recover to Highland for the active profile',()=>{
  const locked={version:1,unlocked:0,selected:0};
  assert.equal(normalize('marine',locked),'highland');
  assert.equal(normalize('forest',locked),'highland');
  assert.equal(normalize('unsupported',{version:1,unlocked:2,selected:2}),'highland');
  assert.equal(normalize('marine',{version:1,unlocked:1,selected:1}),'marine');
  assert.equal(normalize('forest',{version:1,unlocked:2,selected:2}),'forest');
});
