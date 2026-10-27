import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/shared/profile-avatar-art.js');
const art=globalThis.KickLabProfileAvatarArt;

test('legacy preset IDs produce distinct local portraits without changing their IDs',()=>{
  const ids=['rocket','wiz','tower','trick','cannon'];
  const portraits=ids.map(id=>art.svg(null,id));
  assert.equal(new Set(portraits).size,ids.length);
  for(const portrait of portraits){assert.match(portrait,/^<svg/);assert.doesNotMatch(portrait,/<script|(?:src|href)=["']https?:|data:|onload=|onerror=/i);}
});

test('all creator fields are bounded and corrupt values return a known preset',()=>{
  const expected=art.normalize(null,'wiz');
  assert.deepEqual(art.normalize({skin:'bad',hair:'<img>',face:'?',detail:'?',outfit:'?',expression:'?'},'wiz'),expected);
  const chosen=art.normalize({skin:'deep',hair:'wrap',face:'angular',detail:'freckles',outfit:'amber',expression:'focus'},'rocket');
  assert.equal(chosen.skin,'deep');assert.equal(chosen.hair,'wrap');assert.equal(chosen.face,'angular');
  assert.notEqual(art.svg(chosen,'rocket'),art.svg(null,'rocket'));
  assert.doesNotMatch(art.svg({hair:'" onload="alert(1)'},'rocket'),/onload=/i);
});
