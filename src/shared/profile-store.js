(function installKickLabProfiles(root) {
  'use strict';

  const PROFILE_KEY = 'kicklab.profiles.v1';
  const PROFILE_PENDING_KEY = 'kicklab.profiles.pending.v1';
  const LEGACY_PROGRESS_KEY = 'impactlab.v1';
  const LEGACY_NICKNAME_KEY = 'impactlab.nick';
  const OWNED_PREFIXES = Object.freeze(['kicklab.', 'impactlab.']);
  const VERSION = 1;
  const AVATARS = Object.freeze(['rocket', 'wiz', 'tower', 'trick', 'cannon']);
  const COLORS = Object.freeze(['sky', 'mint', 'sun', 'coral', 'violet']);
  const avatarArt=root.KickLabProfileAvatarArt;

  const safeObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const clone = value => JSON.parse(JSON.stringify(value));
  const safeParse = (raw, fallback) => {
    try { return safeObject(JSON.parse(raw)) || fallback; } catch (_) { return fallback; }
  };
  const read = (storage, key) => {
    try { return storage && storage.getItem(key); } catch (_) { return null; }
  };
  const write = (storage, key, value) => {
    try { storage && storage.setItem(key, value); return true; } catch (_) { return false; }
  };
  const nickname = value => String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const isDeleteConfirmation = value => String(value ?? '').trim() === 'delete';
  const choice = (value, choices, fallback) => choices.includes(value) ? value : fallback;
  const profileId = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);

  function normalizeProfile(input, index = 0, now = Date.now()) {
    const source = safeObject(input);
    const id = profileId(source.id) || `player-${index + 1}`;
    return {
      id,
      nickname: nickname(source.nickname) || `Lab Rookie ${index + 1}`,
      avatar: choice(source.avatar, AVATARS, AVATARS[index % AVATARS.length]),
      avatarLook: avatarArt.normalize(source.avatarLook,choice(source.avatar,AVATARS,AVATARS[index % AVATARS.length])),
      color: choice(source.color, COLORS, COLORS[index % COLORS.length]),
      progress: clone(safeObject(source.progress)),
      needsSetup: !!source.needsSetup,
      createdAt: Number.isFinite(source.createdAt) ? source.createdAt : now,
      updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : now
    };
  }

  function migrateLegacy(storage, { now = Date.now(), id = 'legacy-player' } = {}) {
    const rawProgress = read(storage, LEGACY_PROGRESS_KEY);
    const progress = rawProgress ? safeParse(rawProgress, {}) : {};
    const legacyNick = nickname(read(storage, LEGACY_NICKNAME_KEY));
    const hasProgress = Object.keys(progress).length > 0;
    const profile = normalizeProfile({
      id,
      nickname: legacyNick || 'Lab Rookie',
      avatar: 'rocket',
      color: 'sky',
      progress,
      needsSetup: !legacyNick && !hasProgress,
      createdAt: now,
      updatedAt: now
    }, 0, now);
    return { version: VERSION, activeId: profile.id, legacyProfileId: profile.id, profiles: [profile] };
  }

  function normalizeEnvelope(input, storage, now = Date.now()) {
    const source = safeObject(input);
    const profiles = Array.isArray(source.profiles)
      ? source.profiles.slice(0, 12).map((profile, index) => normalizeProfile(profile, index, now))
      : [];
    if (!profiles.length) return migrateLegacy(storage, { now });
    const ids = new Set();
    profiles.forEach((profile, index) => {
      let id = profile.id;
      while (ids.has(id)) id = `${profile.id}-${index + 1}`;
      profile.id = id;
      ids.add(id);
    });
    const activeId = ids.has(source.activeId) ? source.activeId : profiles[0].id;
    const legacyProfileId = ids.has(source.legacyProfileId) ? source.legacyProfileId : profiles[0].id;
    return { version: VERSION, activeId, legacyProfileId, profiles };
  }

  function loadEnvelope(storage, options = {}) {
    const pending = safeParse(read(storage, PROFILE_PENDING_KEY), null);
    const previous = typeof pending?.previous === 'string' && Array.isArray(safeParse(pending.previous, null)?.profiles)
      ? pending.previous : null;
    if (previous !== null) {
      try {
        storage.setItem(PROFILE_KEY, previous);
        if (storage.getItem(PROFILE_KEY) === previous) storage.removeItem(PROFILE_PENDING_KEY);
      } catch (_) { /* Keep the previous profile in memory until storage recovers. */ }
    }
    const raw = previous ?? read(storage, PROFILE_KEY);
    const parsed = raw ? safeParse(raw, null) : null;
    return normalizeEnvelope(parsed, storage, options.now == null ? Date.now() : options.now);
  }

  function ownedStorageKeys(storage) {
    const keys = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key && OWNED_PREFIXES.some(prefix => key.startsWith(prefix))) keys.push(key);
    }
    return keys;
  }

  async function deleteAllLocalData(local, session, cacheStorage) {
    try {
      const localKeys = ownedStorageKeys(local);
      const sessionKeys = ownedStorageKeys(session);
      const cacheNames = cacheStorage ? (await cacheStorage.keys()).filter(name => OWNED_PREFIXES.some(prefix => name.startsWith(prefix))) : [];
      for (const key of localKeys) local.removeItem(key);
      for (const key of sessionKeys) session.removeItem(key);
      for (const name of cacheNames) if (!(await cacheStorage.delete(name))) throw new Error('cache_delete_failed');
      if (ownedStorageKeys(local).length || ownedStorageKeys(session).length ||
          (cacheStorage && (await cacheStorage.keys()).some(name => OWNED_PREFIXES.some(prefix => name.startsWith(prefix))))) {
        throw new Error('data_remains');
      }
      return { ok: true, removed: { local: localKeys.length, session: sessionKeys.length, caches: cacheNames.length } };
    } catch (error) {
      return { ok: false, error: error?.message || 'storage_unavailable' };
    }
  }

  function rankProfiles(envelope, category, options = {}) {
    const categories = {
      punch: { high: true, value: p => Number(p.punch) || 0 },
      lap: { high: false, value: p => Number(p.lap) || 0 },
      bar: { high: true, value: p => Number(p.barHi) || 0 },
      mwins: { high: true, value: p => Number(p.mWins) || 0 },
      xp: { high: true, value: p => Math.round(Number(p.xp) || 0) }
    };
    const spec = categories[category] || (String(category).startsWith('wk') ? { high: true, value: p => p.wk && p.wk.key === options.weeklyKey ? Number(p.wk.score) || 0 : 0 } : null);
    if (!spec) return [];
    const rows = envelope.profiles.map(profile => ({
      id: `${category}~${profile.id}`,
      profileId: profile.id,
      nick: profile.nickname,
      cat: category,
      val: spec.value(profile.progress),
      at: profile.updatedAt
    })).filter(row => row.val > 0).sort((a, b) => {
      const score = spec.high ? b.val - a.val : a.val - b.val;
      return score || a.nick.localeCompare(b.nick) || a.profileId.localeCompare(b.profileId);
    });
    let previous = null;
    let rank = 0;
    return rows.map((row, index) => {
      if (row.val !== previous) rank = index + 1;
      previous = row.val;
      return Object.freeze({ ...row, rank });
    });
  }

  function createManager(storage, options = {}) {
    const now = typeof options.now === 'function' ? options.now : () => Date.now();
    const makeId = typeof options.makeId === 'function'
      ? options.makeId
      : () => `player-${now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    let envelope = loadEnvelope(storage, { now: now() });
    const persist = () => write(storage, PROFILE_KEY, JSON.stringify(envelope));
    const commitProfile = candidate => {
      try {
        if (!storage || typeof storage.removeItem !== 'function') throw new Error('storage_unavailable');
        const pendingRaw = storage.getItem(PROFILE_PENDING_KEY);
        if (pendingRaw !== null) {
          const pending = safeParse(pendingRaw, null);
          if (typeof pending?.previous === 'string' && Array.isArray(safeParse(pending.previous, null)?.profiles)) {
            storage.setItem(PROFILE_KEY, pending.previous);
            if (storage.getItem(PROFILE_KEY) !== pending.previous) throw new Error('rollback_failed');
          }
          storage.removeItem(PROFILE_PENDING_KEY);
          if (storage.getItem(PROFILE_PENDING_KEY) !== null) throw new Error('rollback_failed');
        }
        const journal = JSON.stringify({ previous: JSON.stringify(envelope) });
        storage.setItem(PROFILE_PENDING_KEY, journal);
        if (storage.getItem(PROFILE_PENDING_KEY) !== journal) throw new Error('journal_write_failed');
        const next = JSON.stringify(candidate);
        storage.setItem(PROFILE_KEY, next);
        if (storage.getItem(PROFILE_KEY) !== next) throw new Error('profile_write_failed');
        storage.removeItem(PROFILE_PENDING_KEY);
        if (storage.getItem(PROFILE_PENDING_KEY) !== null) throw new Error('journal_clear_failed');
        envelope = candidate;
        mirror();
      } catch (_) { throw new Error('profile_storage_unavailable'); }
    };
    const active = () => envelope.profiles.find(profile => profile.id === envelope.activeId) || envelope.profiles[0];
    const mirror = () => {
      const profile = active();
      write(storage, LEGACY_PROGRESS_KEY, JSON.stringify(profile.progress));
      write(storage, LEGACY_NICKNAME_KEY, profile.nickname);
    };
    persist();
    return Object.freeze({
      key: PROFILE_KEY,
      snapshot: () => clone(envelope),
      list: () => clone(envelope.profiles),
      active: () => clone(active()),
      create(input = {}) {
        if (envelope.profiles.length >= 12) throw new Error('profile_limit');
        const id = profileId(makeId()) || `player-${envelope.profiles.length + 1}`;
        if (envelope.profiles.some(profile => profile.id === id)) throw new Error('profile_id_conflict');
        const profile = normalizeProfile({ ...input, id, progress: {}, needsSetup: false, createdAt: now(), updatedAt: now() }, envelope.profiles.length, now());
        const candidate = clone(envelope);
        candidate.profiles.push(profile);
        candidate.activeId = profile.id;
        commitProfile(candidate);
        return clone(profile);
      },
      updateActive(input = {}) {
        const candidate = clone(envelope);
        const profile = candidate.profiles.find(item => item.id === candidate.activeId) || candidate.profiles[0];
        const previousAvatar = profile.avatar;
        profile.nickname = nickname(input.nickname == null ? profile.nickname : input.nickname) || profile.nickname;
        profile.avatar = choice(input.avatar, AVATARS, profile.avatar);
        const lookInput=input.avatarLook==null&&profile.avatar!==previousAvatar?null:input.avatarLook??profile.avatarLook;
        profile.avatarLook = avatarArt.normalize(lookInput,profile.avatar);
        profile.color = choice(input.color, COLORS, profile.color);
        profile.needsSetup = false;
        profile.updatedAt = now();
        commitProfile(candidate);
        return clone(profile);
      },
      switchTo(id) {
        if (!envelope.profiles.some(profile => profile.id === id)) return null;
        const candidate = clone(envelope);
        candidate.activeId = id;
        candidate.profiles.find(profile => profile.id === id).updatedAt = now();
        commitProfile(candidate);
        return clone(active());
      },
      saveActiveProgress(progress) {
        const profile = active();
        profile.progress = clone(safeObject(progress));
        profile.updatedAt = now();
        persist(); mirror();
        return clone(profile.progress);
      },
      localRows: (category, context) => rankProfiles(envelope, category, context)
    });
  }

  root.KickLabProfiles = Object.freeze({
    VERSION, PROFILE_KEY, PROFILE_PENDING_KEY, LEGACY_PROGRESS_KEY, LEGACY_NICKNAME_KEY, AVATARS, COLORS,
    nickname, normalizeProfile, migrateLegacy, normalizeEnvelope, loadEnvelope, rankProfiles, createManager,
    ownedStorageKeys, deleteAllLocalData, isDeleteConfirmation
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
