import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
await import('../src/shared/profile-avatar-art.js');
const art=globalThis.KickLabProfileAvatarArt;
const ids=['rocket','wiz','tower','trick','cannon'];

test('stable legacy IDs select five distinct bounded local portrait assets',()=>{
  assert.equal(new Set(ids.map(id=>art.asset(id))).size,ids.length);
  for(const id of ids){
    const path=`src/${art.asset(id)}`,data=readFileSync(path);
    assert.equal(data.toString('ascii',0,4),'RIFF');
    assert.equal(data.toString('ascii',8,12),'WEBP');
    assert.ok(statSync(path).size<70_000,`${id} exceeds mobile portrait budget`);
    assert.match(art.description(null,id),/driver in a racing suit/);
  }
  assert.equal(art.asset('../../elsewhere'),'assets/drivers/v2/rocket.webp');
});

test('legacy look choices remain bounded and persist independently of curated portrait mapping',()=>{
  const expected=art.normalize(null,'wiz');
  assert.deepEqual(art.normalize({skin:'bad',hair:'<img>',face:'?',detail:'?',outfit:'?',expression:'?'},'wiz'),expected);
  const chosen=art.normalize({skin:'deep',hair:'wrap',face:'angular',detail:'freckles',outfit:'amber',expression:'focus'},'wiz');
  assert.equal(chosen.hair,'wrap');
  assert.equal(art.asset('wiz'),'assets/drivers/v2/wiz.webp');
  assert.equal(art.portraitId('wiz'),'wiz');
});
