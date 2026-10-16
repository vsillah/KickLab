import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryRepository } from '../src/services/in-memory-repository.js';
import { createKickLabService, ServiceError } from '../src/services/kicklab-service.js';

const guardianA = { accountId: 'acct_guardian_sun', role: 'guardian' };
const guardianB = { accountId: 'acct_guardian_moon', role: 'guardian' };
const childActorA = { accountId: 'acct_child_comet', role: 'child' };

async function fixture() {
  const repository = createInMemoryRepository();
  const service = createKickLabService({ repository, clock: () => '2026-10-16T12:00:00.000Z' });
  const householdA = await service.createHousehold(guardianA);
  const householdB = await service.createHousehold(guardianB);
  const childA = await service.createChildProfile(guardianA, {
    householdId: householdA.id, accountId: childActorA.accountId, alias: 'Blue Comet', ageBand: '9-12',
  });
  const childB = await service.createChildProfile(guardianB, {
    householdId: householdB.id, alias: 'Copper Star', ageBand: '13-15',
  });
  await service.grantConsent(guardianA, { childId: childA.id, version: 'privacy-v1', scopes: ['progress_sync', 'household_leaderboard'] });
  await service.grantConsent(guardianB, { childId: childB.id, version: 'privacy-v1', scopes: ['progress_sync', 'household_leaderboard'] });
  return { repository, service, householdA, householdB, childA, childB };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof ServiceError && error.code === code);
}

test('same-household guardian and linked child can sync, with idempotent replay', async () => {
  const { service, childA } = await fixture();
  const input = {
    childId: childA.id, baseRevision: 0, mutationId: 'deviceA_0001', provenance: 'offline_unverified',
    patch: { xp: 240, bests: { punch: 860 }, badges: { first_goal: true } },
  };
  assert.deepEqual(await service.syncProgress(childActorA, input), { childId: childA.id, revision: 1, replayed: false });
  assert.deepEqual(await service.syncProgress(childActorA, input), { childId: childA.id, revision: 1, replayed: true });
  const progress = await service.getProgress(guardianA, { childId: childA.id });
  assert.equal(progress.snapshot.xp, 240);
  assert.equal(progress.verification, 'unverified');
});

test('same-household guardian needs active progress consent before reading or syncing', async () => {
  const repository = createInMemoryRepository();
  const service = createKickLabService({ repository, clock: () => '2026-10-16T12:00:00.000Z' });
  const household = await service.createHousehold(guardianA);
  const child = await service.createChildProfile(guardianA, {
    householdId: household.id, alias: 'Silver Kite', ageBand: '9-12',
  });
  const syncInput = {
    childId: child.id, baseRevision: 0, mutationId: 'guardian_0001', provenance: 'offline_unverified', patch: { xp: 12 },
  };

  await rejectsCode(service.getProgress(guardianA, { childId: child.id }), 'consent_required');
  await rejectsCode(service.syncProgress(guardianA, syncInput), 'consent_required');

  await repository.put('consents', {
    id: 'malformed_consent', childId: child.id, householdId: household.id, status: 'granted', scopes: 'progress_sync',
  });
  await rejectsCode(service.getProgress(guardianA, { childId: child.id }), 'consent_required');

  await service.grantConsent(guardianA, { childId: child.id, version: 'privacy-v1', scopes: ['progress_sync'] });
  assert.deepEqual(await service.syncProgress(guardianA, syncInput), { childId: child.id, revision: 1, replayed: false });
  assert.equal((await service.getProgress(guardianA, { childId: child.id })).snapshot.xp, 12);
});

test('cross-household guardian and child access fails without revealing the target', async () => {
  const { service, householdB, childB } = await fixture();
  await rejectsCode(service.getProgress(guardianA, { childId: childB.id }), 'not_found');
  await rejectsCode(service.syncProgress(childActorA, {
    childId: childB.id, baseRevision: 0, mutationId: 'deviceA_0002', provenance: 'offline_unverified', patch: { xp: 1 },
  }), 'not_found');
  await rejectsCode(service.listLeaderboard(childActorA, { householdId: householdB.id, challengeId: 'weekly-01' }), 'not_found');
});

test('leaderboard submissions remain pending until same-household guardian moderation', async () => {
  const { service, householdA, childA } = await fixture();
  const entry = await service.submitLeaderboard(childActorA, { childId: childA.id, challengeId: 'weekly-01', score: 42 });
  assert.equal(entry.status, 'pending');
  assert.deepEqual(await service.listLeaderboard(guardianA, { householdId: householdA.id, challengeId: 'weekly-01' }), []);
  await rejectsCode(service.moderateLeaderboard(guardianB, { entryId: entry.id, action: 'publish', reasonCode: 'guardian_review' }), 'not_found');
  await service.moderateLeaderboard(guardianA, { entryId: entry.id, action: 'publish', reasonCode: 'guardian_review' });
  assert.deepEqual(await service.listLeaderboard(childActorA, { householdId: householdA.id, challengeId: 'weekly-01' }), [
    { entryId: entry.id, alias: 'Blue Comet', score: 42, challengeId: 'weekly-01' },
  ]);
});

test('revoked consent blocks sync and hides published leaderboard entries', async () => {
  const { service, householdA, childA } = await fixture();
  const entry = await service.submitLeaderboard(guardianA, { childId: childA.id, challengeId: 'weekly-01', score: 77 });
  await service.moderateLeaderboard(guardianA, { entryId: entry.id, action: 'publish', reasonCode: 'guardian_review' });
  await service.revokeConsent(guardianA, { childId: childA.id });
  await rejectsCode(service.syncProgress(childActorA, {
    childId: childA.id, baseRevision: 0, mutationId: 'deviceA_0003', provenance: 'offline_unverified', patch: { xp: 10 },
  }), 'consent_required');
  assert.deepEqual(await service.listLeaderboard(guardianA, { householdId: householdA.id, challengeId: 'weekly-01' }), []);
});

test('export and deletion are guardian-only and scoped to the household', async () => {
  const { repository, service, childA, childB } = await fixture();
  await rejectsCode(service.exportChildData(childActorA, { childId: childA.id }), 'unauthorized');
  await rejectsCode(service.requestChildDeletion(guardianA, { childId: childB.id }), 'not_found');
  const exported = await service.exportChildData(guardianA, { childId: childA.id });
  assert.equal(exported.profile.alias, 'Blue Comet');
  const request = await service.requestChildDeletion(guardianA, { childId: childA.id });
  assert.equal(request.status, 'pending_provider_cascade');
  assert.equal((await repository.get('childProfiles', childA.id)).status, 'deletion_pending');
  await rejectsCode(service.getProgress(guardianA, { childId: childA.id }), 'not_found');
});

test('privacy-safe validation rejects contact-like aliases, stale revisions, and unknown progress fields', async () => {
  const { service, householdA, childA } = await fixture();
  await rejectsCode(service.createChildProfile(guardianA, {
    householdId: householdA.id, alias: 'kid@example.test', ageBand: '9-12',
  }), 'invalid_alias');
  await rejectsCode(service.syncProgress(guardianA, {
    childId: childA.id, baseRevision: 4, mutationId: 'deviceA_0004', provenance: 'legacy_local_unverified', patch: { xp: 5 },
  }), 'conflict');
  await rejectsCode(service.syncProgress(guardianA, {
    childId: childA.id, baseRevision: 0, mutationId: 'deviceA_0005', provenance: 'legacy_local_unverified', patch: { email: 'nope@example.test' },
  }), 'invalid_progress');
});
