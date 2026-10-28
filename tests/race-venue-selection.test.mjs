import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const context={globalThis:{},location:{search:'?raceProgression=prototype'}};
context.globalThis.KickLabRaceOrigin={trusted:()=>true};
runInNewContext(readFileSync(new URL('../src/shared/race-progression.js',import.meta.url),'utf8'),context);
runInNewContext(readFileSync(new URL('../src/shared/race-venue-selection.js',import.meta.url),'utf8'),context);
const {ROUTES,compatible,normalize,clearHighland}=context.globalThis.KickLabRaceVenueSelection;
const progression=context.globalThis.KickLabRaceProgression;

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

test('a passed solo Highland format opens Marine without changing the selected route',()=>{
  const initial={version:1,unlocked:0,selected:0,heats:0,brakeHeat:0,tireHeat:0};
  assert.equal(clearHighland(initial,false).unlocked,0);
  assert.equal(clearHighland(initial,true).unlocked,1);
  assert.equal(clearHighland({...initial,unlocked:2,selected:1},true).selected,1);
});

test('progression venues provide distinct route labels, targets, and guidance for the grid',()=>{
  const marine=progression.LEVELS[1],forest=progression.LEVELS[2];
  assert.equal(marine.routeLabel,'Damp corner');
  assert.equal(forest.routeLabel,'Descending left turn');
  assert.match(progression.preview(marine),/≤19s/);
  assert.match(progression.preview(forest),/≤22s/);
  assert.match(marine.challenge,/damp terrace/);
  assert.match(forest.challenge,/descent.*left turn/);
  assert.doesNotMatch(`${marine.routeLabel} ${forest.routeLabel}`,/Switchback corner/);
  assert.equal(progression.level({version:1,selected:1,unlocked:1,heats:1}).eventName,'Brake Consistency');
  assert.equal(progression.level({version:1,selected:2,unlocked:2,heats:2}).eventName,'Heat Control');
});
