import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/shared/profile-store.js');

const { PROFILE_KEY, createManager } = globalThis.KickLabProfiles;

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    value: key => values.get(key)
  };
}

test('migrates legacy progress and nickname without deleting either key', () => {
  const legacy = { xp: 850, punch: 3010, badges: { f_3k: 10 } };
  const storage = memoryStorage({ 'impactlab.v1': JSON.stringify(legacy), 'impactlab.nick': 'Vector Fox' });
  const manager = createManager(storage, { now: () => 100, makeId: () => 'unused' });
  assert.equal(manager.active().nickname, 'Vector Fox');
  assert.deepEqual(manager.active().progress, legacy);
  assert.equal(storage.value('impactlab.v1'), JSON.stringify(legacy));
  assert.equal(storage.value('impactlab.nick'), 'Vector Fox');
  assert.ok(storage.value(PROFILE_KEY));
});

test('fails local and recovers from malformed profile and legacy storage', () => {
  const storage = memoryStorage({ [PROFILE_KEY]: '{broken', 'impactlab.v1': 'not json', 'impactlab.nick': '<Lab Kid>' });
  const manager = createManager(storage, { now: () => 100 });
  assert.deepEqual(manager.active().progress, {});
  assert.equal(manager.active().nickname, 'Lab Kid');
  assert.equal(manager.list().length, 1);
});

test('isolates multiple profiles and mirrors the active profile for legacy builds', () => {
  let id = 1;
  const storage = memoryStorage({ 'impactlab.v1': JSON.stringify({ xp: 400 }), 'impactlab.nick': 'First Fox' });
  const manager = createManager(storage, { now: () => 100 + id, makeId: () => `new-${id++}` });
  const firstId = manager.active().id;
  const second = manager.create({ nickname: 'Second Star', avatar: 'wiz', color: 'mint' });
  manager.saveActiveProgress({ xp: 900, goals: 7 });
  assert.deepEqual(JSON.parse(storage.value('impactlab.v1')), { xp: 900, goals: 7 });
  assert.equal(storage.value('impactlab.nick'), 'Second Star');
  manager.switchTo(firstId);
  assert.deepEqual(manager.active().progress, { xp: 400 });
  assert.deepEqual(JSON.parse(storage.value('impactlab.v1')), { xp: 400 });
  assert.equal(storage.value('impactlab.nick'), 'First Fox');
  assert.equal(manager.list().find(profile => profile.id === second.id).progress.goals, 7);
});

test('orders local boards deterministically and gives tied scores the same rank', () => {
  let id = 1;
  const storage = memoryStorage({ 'impactlab.v1': JSON.stringify({ xp: 700, lap: 12.5 }), 'impactlab.nick': 'Zulu' });
  const manager = createManager(storage, { now: () => 100 + id, makeId: () => `new-${id++}` });
  manager.create({ nickname: 'Alpha' }); manager.saveActiveProgress({ xp: 900, lap: 11.2 });
  manager.create({ nickname: 'Beta' }); manager.saveActiveProgress({ xp: 900, lap: 11.2 });
  assert.deepEqual(manager.localRows('xp').map(row => [row.nick, row.val, row.rank]), [
    ['Alpha', 900, 1], ['Beta', 900, 1], ['Zulu', 700, 3]
  ]);
  assert.deepEqual(manager.localRows('lap').map(row => [row.nick, row.val, row.rank]), [
    ['Alpha', 11.2, 1], ['Beta', 11.2, 1], ['Zulu', 12.5, 3]
  ]);
});

test('keeps weekly local scores inside the active weekly seed', () => {
  let id = 1;
  const storage = memoryStorage({ 'impactlab.v1': JSON.stringify({ wk: { key: '2026-W42', score: 8 } }), 'impactlab.nick': 'First' });
  const manager = createManager(storage, { now: () => 100, makeId: () => `new-${id++}` });
  manager.create({ nickname: 'Second' });
  manager.saveActiveProgress({ wk: { key: '2026-W41', score: 99 } });
  assert.deepEqual(manager.localRows('wk2026W42', { weeklyKey: '2026-W42' }).map(row => [row.nick, row.val]), [['First', 8]]);
});
