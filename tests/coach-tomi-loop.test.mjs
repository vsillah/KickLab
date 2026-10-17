import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';

const root=process.cwd(),source=readFileSync(join(root,'src/shared/coach-tomi.js'),'utf8'),context={globalThis:{}};
vm.runInNewContext(source,context);const TOMI=context.globalThis.KickLabCoachTomi;
const read=file=>readFileSync(join(root,file),'utf8');

test('selects first-look and experienced coaching from profile-local progress',()=>{
  assert.equal(TOMI.experience({plays:0,wins:0,cleared:0}).tier,'novice');
  assert.equal(TOMI.experience({plays:4,wins:2,cleared:1}).tier,'developing');
  assert.equal(TOMI.experience({plays:8,wins:5,cleared:2}).tier,'experienced');
  assert.equal(TOMI.experience({plays:3,wins:1,cleared:3}).tier,'experienced');
  const cockpit=read('src/game/54-web-cockpit.js');
  assert.match(cockpit,/coachTomiProfileKey\(\).*profileManager\.active\(\)\.id/);
  assert.match(cockpit,/const key=`\$\{coachTomiProfileKey\(\)\}:\$\{mode\}`/);
  assert.match(cockpit,/plays:best\.stats\.plays\[mode\].*wins:best\.stats\.wins\[mode\].*cleared:best\.ch\[mode\]/);
});

test('gives Fight, Race, and Kick one beginning observation and action',()=>{
  const novice={plays:0,wins:0,cleared:0},experienced={plays:10,wins:6,cleared:4};
  const plans=[
    TOMI.beginning({mode:'fight',history:novice,variables:{dt:15}}),
    TOMI.beginning({mode:'race',history:experienced,variables:{limit:84}}),
    TOMI.beginning({mode:'kick',history:novice,variables:{speed:24,angle:32},context:{shot:'free'}}),
    TOMI.beginning({mode:'kick',history:experienced,variables:{passSpeed:20},context:{pass:true}})
  ];
  for(const plan of plans){assert.ok(plan.observation.length>8);assert.ok(plan.cue.length>8);assert.ok(plan.variable);assert.ok(plan.formula);}
  assert.notEqual(plans[0].cue,TOMI.beginning({mode:'fight',history:experienced,variables:{dt:15}}).cue);
});

test('fires real-time help only for observable need rules',()=>{
  assert.equal(TOMI.need({mode:'fight',grade:'A',title:'SOLID HIT',history:{plays:4}}),null);
  assert.equal(TOMI.need({mode:'race',grade:'A',title:'FINISHED',sub:'12.00 s · corner entry 70 of 82 km/h',history:{plays:4}}),null);
  assert.equal(TOMI.need({mode:'kick',grade:'A',title:'GOAL!',history:{plays:4}}),null);
  assert.equal(TOMI.need({mode:'fight',grade:'D',title:'OFF THE GREEN',history:{plays:1}}).code,'timing');
  assert.equal(TOMI.need({mode:'race',grade:'D',title:'OFF THE TRACK',sub:'Slid wide at 92 km/h. Limit: 78 km/h',history:{plays:5}}).code,'unsafe-speed');
  assert.equal(TOMI.need({mode:'kick',grade:'D',title:'BLOCKED',sub:'1.10 m at the wall',history:{plays:9}}).code,'wall');
  assert.match(TOMI.need({mode:'race',grade:'D',title:'OFF THE TRACK',history:{plays:9},recent:['unsafe-speed','unsafe-speed']}).observation,/repeated/i);
});

test('explains end results with actual telemetry and one next adjustment',()=>{
  const fight=TOMI.result({mode:'fight',grade:'D',title:'OFF THE GREEN',sub:'980 N · 2.8 m/s · Δt 15 ms',history:{plays:1}});
  const race=TOMI.result({mode:'race',grade:'D',title:'OFF THE TRACK',sub:'Slid wide at 92 km/h. Limit: 78 km/h',history:{plays:9}});
  const kick=TOMI.result({mode:'kick',grade:'D',title:'BLOCKED',sub:'1.10 m at the wall · 1.65 m at the line',history:{plays:9}});
  assert.equal(fight.observation,'980 N · 2.8 m/s · Δt 15 ms');assert.match(fight.cue,/green/i);
  assert.equal(race.observation,'Slid wide at 92 km/h. Limit: 78 km/h');assert.match(race.cue,/√\(μgR\)/);
  assert.equal(kick.observation,'1.10 m at the wall · 1.65 m at the line');assert.match(kick.cue,/angle|speed/i);
});

test('keeps post-GO cues pending and local without adding storage',()=>{
  const pacing=read('src/game/61-gameplay-pacing.js'),cockpit=read('src/game/54-web-cockpit.js');
  assert.match(pacing,/onComplete\(meta\).*showPendingCoachMathNudge\(\)/);
  assert.doesNotMatch(pacing,/onComplete\(meta\).*maybeShowCoachMathNudge\(meta\)/);
  assert.match(cockpit,/function maybeShowCoachMathNudge\(meta=\{\}\)\{\s*const need=meta\.need;if\(!need\)return false/);
  assert.match(cockpit,/COACH_MATH_NUDGE=\{sequence:0,current:null,seen:new Set\(\),lastShownAt:0,timer:null,cooldown:18000\}/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket/);
});
