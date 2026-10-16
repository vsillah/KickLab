const CONSENT_SCOPES = new Set(['progress_sync', 'household_leaderboard']);
const AGE_BANDS = new Set(['9-12', '13-15']);
const PROGRESS_FIELDS = new Set(['xp', 'bests', 'badges', 'style', 'kit', 'challenges']);

export class ServiceError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

const fail = (code) => {
  throw new ServiceError(code);
};

function requireActor(actor, roles) {
  if (!actor || typeof actor.accountId !== 'string' || !roles.includes(actor.role)) fail('unauthorized');
}

function cleanAlias(value) {
  const alias = String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (alias.length < 2 || alias.length > 24 || alias.includes('@') || /\d[\d\s().+-]{6,}\d/.test(alias)) fail('invalid_alias');
  return alias;
}

function finiteNumber(value, { integer = false, min = 0, max = 1_000_000_000 } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    fail('invalid_progress');
  }
  return value;
}

function normalizeMap(value, limit = 100) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_progress');
  const entries = Object.entries(value);
  if (entries.length > limit) fail('invalid_progress');
  return Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) fail('invalid_progress');
    if (typeof item === 'number') return [key, finiteNumber(item)];
    if (typeof item === 'string' && item.length <= 40) return [key, item];
    if (typeof item === 'boolean') return [key, item];
    fail('invalid_progress');
  }));
}

function normalizeProgressPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) fail('invalid_progress');
  const normalized = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!PROGRESS_FIELDS.has(key)) fail('invalid_progress');
    if (key === 'xp') normalized.xp = finiteNumber(value, { integer: true });
    else normalized[key] = normalizeMap(value);
  }
  return normalized;
}

export function createKickLabService({ repository, clock = () => new Date().toISOString() }) {
  if (!repository) throw new TypeError('repository is required');

  async function membership(householdId, accountId, role = 'guardian') {
    return repository.get('memberships', `${householdId}:${accountId}:${role}`);
  }

  async function requireGuardian(actor, householdId) {
    requireActor(actor, ['guardian']);
    const household = await repository.get('households', householdId);
    if (!household || household.status !== 'active' || !(await membership(householdId, actor.accountId))) fail('not_found');
    return household;
  }

  async function childForActor(actor, childId, scope) {
    requireActor(actor, ['guardian', 'child']);
    const child = await repository.get('childProfiles', childId);
    if (!child || child.status !== 'active') fail('not_found');
    if (actor.role === 'guardian') {
      if (!(await membership(child.householdId, actor.accountId))) fail('not_found');
    } else if (child.accountId !== actor.accountId) fail('not_found');
    if (scope && !(await activeConsent(child.id, scope))) fail('consent_required');
    return child;
  }

  async function activeConsent(childId, scope) {
    const records = await repository.list('consents', { childId, status: 'granted' });
    return records.some((record) => Array.isArray(record.scopes) && record.scopes.includes(scope));
  }

  async function createHousehold(actor) {
    requireActor(actor, ['guardian']);
    const now = clock();
    const household = { id: repository.newId('household'), status: 'active', createdBy: actor.accountId, createdAt: now, updatedAt: now };
    const member = { id: `${household.id}:${actor.accountId}:guardian`, householdId: household.id, accountId: actor.accountId, role: 'guardian', createdAt: now };
    await repository.transaction(async (tx) => {
      await tx.put('households', household);
      await tx.put('memberships', member);
    });
    return household;
  }

  async function createChildProfile(actor, input) {
    await requireGuardian(actor, input.householdId);
    if (!AGE_BANDS.has(input.ageBand)) fail('invalid_age_band');
    if (input.accountId !== undefined && (typeof input.accountId !== 'string' || !input.accountId)) fail('invalid_account');
    const now = clock();
    const child = {
      id: repository.newId('child'), householdId: input.householdId, accountId: input.accountId || null,
      alias: cleanAlias(input.alias), ageBand: input.ageBand, status: 'active', createdAt: now, updatedAt: now,
    };
    await repository.put('childProfiles', child);
    return child;
  }

  async function grantConsent(actor, input) {
    const child = await childForActor(actor, input.childId);
    if (actor.role !== 'guardian') fail('unauthorized');
    const scopes = [...new Set(input.scopes || [])];
    if (!input.version || !scopes.length || scopes.some((scope) => !CONSENT_SCOPES.has(scope))) fail('invalid_consent');
    const now = clock();
    const consent = {
      id: repository.newId('consent'), householdId: child.householdId, childId: child.id,
      guardianAccountId: actor.accountId, version: String(input.version), scopes, status: 'granted', grantedAt: now, updatedAt: now,
    };
    await repository.put('consents', consent);
    return consent;
  }

  async function revokeConsent(actor, { childId }) {
    await childForActor(actor, childId);
    if (actor.role !== 'guardian') fail('unauthorized');
    const records = await repository.list('consents', { childId, status: 'granted' });
    const now = clock();
    await repository.transaction(async (tx) => {
      for (const record of records) await tx.put('consents', { ...record, status: 'revoked', revokedAt: now, updatedAt: now });
      for (const entry of await tx.list('leaderboardEntries', { childId })) {
        await tx.put('leaderboardEntries', { ...entry, status: 'hidden', updatedAt: now });
      }
    });
    return { childId, status: 'revoked' };
  }

  async function getProgress(actor, { childId }) {
    await childForActor(actor, childId, 'progress_sync');
    return (await repository.get('progress', childId)) || { id: childId, childId, revision: 0, snapshot: {}, provenance: null };
  }

  async function syncProgress(actor, input) {
    const child = await childForActor(actor, input.childId, 'progress_sync');
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(input.mutationId || '')) fail('invalid_mutation');
    if (!['offline_unverified', 'legacy_local_unverified'].includes(input.provenance)) fail('invalid_provenance');
    const patch = normalizeProgressPatch(input.patch);
    const receiptId = `${child.id}:${input.mutationId}`;
    return repository.transaction(async (tx) => {
      const priorReceipt = await tx.get('syncReceipts', receiptId);
      if (priorReceipt) return { childId: child.id, revision: priorReceipt.revision, replayed: true };
      const current = (await tx.get('progress', child.id)) || { id: child.id, childId: child.id, revision: 0, snapshot: {} };
      if (input.baseRevision !== current.revision) fail('conflict');
      const now = clock();
      const next = {
        ...current, householdId: child.householdId, revision: current.revision + 1,
        snapshot: { ...current.snapshot, ...patch }, provenance: input.provenance, verification: 'unverified', updatedAt: now,
      };
      await tx.put('progress', next);
      await tx.put('syncReceipts', { id: receiptId, childId: child.id, mutationId: input.mutationId, revision: next.revision, createdAt: now });
      return { childId: child.id, revision: next.revision, replayed: false };
    });
  }

  async function submitLeaderboard(actor, input) {
    const child = await childForActor(actor, input.childId, 'household_leaderboard');
    const score = finiteNumber(input.score, { max: 100_000_000 });
    if (!/^[a-z0-9_-]{2,50}$/.test(input.challengeId || '')) fail('invalid_challenge');
    const now = clock();
    const entry = {
      id: repository.newId('entry'), householdId: child.householdId, childId: child.id,
      challengeId: input.challengeId, score, status: 'pending', source: 'client_unverified', createdAt: now, updatedAt: now,
    };
    await repository.put('leaderboardEntries', entry);
    return entry;
  }

  async function listLeaderboard(actor, { householdId, challengeId }) {
    requireActor(actor, ['guardian', 'child']);
    if (actor.role === 'guardian') await requireGuardian(actor, householdId);
    else {
      const children = await repository.list('childProfiles', { householdId, accountId: actor.accountId, status: 'active' });
      if (!children.length || !(await activeConsent(children[0].id, 'household_leaderboard'))) fail('not_found');
    }
    const entries = await repository.list('leaderboardEntries', { householdId, challengeId, status: 'published' });
    const rows = [];
    for (const entry of entries) {
      const child = await repository.get('childProfiles', entry.childId);
      if (child?.status === 'active') rows.push({ entryId: entry.id, alias: child.alias, score: entry.score, challengeId: entry.challengeId });
    }
    return rows.sort((a, b) => b.score - a.score);
  }

  async function moderateLeaderboard(actor, { entryId, action, reasonCode }) {
    requireActor(actor, ['guardian', 'moderator']);
    if (!['publish', 'hide'].includes(action) || !/^[a-z0-9_-]{2,40}$/.test(reasonCode || '')) fail('invalid_moderation');
    const entry = await repository.get('leaderboardEntries', entryId);
    if (!entry) fail('not_found');
    if (actor.role === 'guardian') await requireGuardian(actor, entry.householdId);
    const now = clock();
    const updated = { ...entry, status: action === 'publish' ? 'published' : 'hidden', updatedAt: now };
    await repository.transaction(async (tx) => {
      await tx.put('leaderboardEntries', updated);
      await tx.put('moderationRecords', {
        id: tx.newId('moderation'), entryId, householdId: entry.householdId, action,
        actorAccountId: actor.accountId, actorRole: actor.role, reasonCode, createdAt: now,
      });
    });
    return updated;
  }

  async function exportChildData(actor, { childId }) {
    const child = await childForActor(actor, childId);
    if (actor.role !== 'guardian') fail('unauthorized');
    return {
      exportedAt: clock(), profile: child,
      consents: await repository.list('consents', { childId }),
      progress: await repository.get('progress', childId),
      leaderboardEntries: await repository.list('leaderboardEntries', { childId }),
    };
  }

  async function requestChildDeletion(actor, { childId }) {
    const child = await childForActor(actor, childId);
    if (actor.role !== 'guardian') fail('unauthorized');
    const now = clock();
    const request = {
      id: repository.newId('deletion'), householdId: child.householdId, childId, requestedBy: actor.accountId,
      status: 'pending_provider_cascade', requestedAt: now,
    };
    await repository.transaction(async (tx) => {
      await tx.put('childProfiles', { ...child, status: 'deletion_pending', accountId: null, updatedAt: now });
      for (const consent of await tx.list('consents', { childId, status: 'granted' })) {
        await tx.put('consents', { ...consent, status: 'revoked', revokedAt: now, updatedAt: now });
      }
      for (const entry of await tx.list('leaderboardEntries', { childId })) {
        await tx.put('leaderboardEntries', { ...entry, status: 'hidden', updatedAt: now });
      }
      await tx.put('deletionRequests', request);
    });
    return request;
  }

  return {
    createHousehold, createChildProfile, grantConsent, revokeConsent, getProgress, syncProgress,
    submitLeaderboard, listLeaderboard, moderateLeaderboard, exportChildData, requestChildDeletion,
  };
}
