import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const guide=vm.runInNewContext(read('src/shared/race-preflight-guide.js')+'\nglobalThis.KickLabRacePreflightGuide',{});
const preflightUi=read('src/game/65-race-preflight.js'),styles=read('src/styles.css');
const cleared={raceModes:{version:1,best:{drag:1200,circuit:850}}};

test('the four-step Race lifecycle keeps full accessible names and compact responsive labels',()=>{
  assert.match(preflightUi,/RACE_PREFLIGHT_PHASE_SHORT=\['Track','Car','Garage','Grid'\]/);
  assert.match(preflightUi,/aria-label="Step \$\{index\+1\} of \$\{RACE_PREFLIGHT_PHASES\.length\}: \$\{name\}"/);
  assert.match(styles,/\.race-preflight-steps button::after\{content:attr\(data-short\)/);
});

test('each inspection category and option has a unique, nonempty local icon',()=>{
  const keys=['whole','suspension','suspension:soft','suspension:balanced','suspension:firm','tires','tires:narrow','tires:balanced','tires:wide','brakes','brakes:standard','brakes:sport','brakes:endurance'];
  assert.equal(new Set(keys.map(key=>guide.ICONS[key])).size,keys.length);
  for(const key of keys){assert.match(guide.icon(key),/<svg[^>]+aria-hidden="true"/);assert.match(guide.icon(key),/<path|<circle/);}
  assert.equal(guide.icon('unknown'),'');
  assert.match(guide.thumbsUp,/race-coach-thumb/);
});

test('track and demonstrated Race clears determine beginner and practiced recommendations',()=>{
  assert.equal(guide.skillTier({xp:90000,raceModes:{version:1,best:{}}}),'beginner','cross-lab XP is not Race skill');
  assert.equal(guide.skillTier({raceModes:{version:1,best:{drag:1200}}}),'beginner');
  assert.equal(guide.skillTier(cleared),'practiced');
  assert.equal(guide.recommend('drag',{}).vehicle,'cobalt');
  assert.equal(guide.recommend('drag',cleared).vehicle,'kestrel');
  assert.equal(guide.recommend('endurance',{}).parts.tires,'balanced');
  assert.equal(guide.recommend('endurance',cleared).parts.tires,'wide');
  assert.equal(guide.recommend('drift',cleared).parts.tires,'narrow');
});

test('profile and track recomputation is read-only and never changes a selected setup',()=>{
  const profileA={raceModes:{version:1,selected:'hill',best:{drag:350}}},profileB={raceModes:{version:1,selected:'drag',best:{drag:350,hill:400}}};
  const draft={mode:'drag',vehicle:'aegis',garage:{body:'race',suspension:'firm',tires:'narrow',brakes:'sport'}};
  const before=JSON.stringify({profileA,profileB,draft});
  const first=guide.recommend(draft.mode,profileA),trackChanged=guide.recommend('hill',profileA),profileChanged=guide.recommend('hill',profileB);
  assert.equal(first.vehicle,'cobalt');
  assert.equal(trackChanged.parts.brakes,'sport');
  assert.equal(profileChanged.vehicle,'kestrel');
  assert.equal(JSON.stringify({profileA,profileB,draft}),before);
  assert.equal(draft.vehicle,'aegis');
  assert.equal(draft.garage.tires,'narrow');
});
