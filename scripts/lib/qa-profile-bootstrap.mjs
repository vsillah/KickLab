// Shared QA bootstrap. Gives a test session a complete device-local player so the app opens gameplay instead of first-run
// profile setup (a lab tab click opens setup while the active profile has needsSetup).
//
// Use as a Playwright init script: context.addInitScript(seedQaProfile) or page.addInitScript(seedQaProfile, {progress: {gfx: '2d'}}).
// It runs in the page before app code, on every navigation, and is safe in any order with other init scripts:
// - it never replaces a profile store that already exists, so reload and profile-switch tests keep their state;
// - `progress` values are merged into the active profile and the legacy progress key on every run, so a fixture such as
//   {gfx: '2d'} is preserved whichever script runs first;
// - `legacyOnly` writes only the legacy nickname marker, for fixtures that deny or corrupt storage on purpose;
// - storage failures are ignored, so those fixtures still exercise the product's own fallback.
// The function must stay self-contained: Playwright serializes it into the page.
export function seedQaProfile(options) {
  const { progress = null, legacyOnly = false, nickname = 'QA Player', avatar = 'rocket' } = options || {};
  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const read = key => { try { const value = JSON.parse(get(key) || 'null'); return value && typeof value === 'object' ? value : null; } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true; } catch { return false; } };
  if (!get('impactlab.nick')) write('impactlab.nick', nickname);
  if (progress) write('impactlab.v1', Object.assign({}, read('impactlab.v1') || {}, progress));
  if (legacyOnly) return;
  const store = read('kicklab.profiles.v1');
  if (store && Array.isArray(store.profiles) && store.profiles.length) {
    if (progress) { const active = store.profiles.find(profile => profile.id === store.activeId) || store.profiles[0]; active.progress = Object.assign({}, active.progress || {}, progress); write('kicklab.profiles.v1', store); }
    return;
  }
  write('kicklab.profiles.v1', { version: 1, activeId: 'qa-player', legacyProfileId: 'qa-player', profiles: [{ id: 'qa-player', nickname: get('impactlab.nick') || nickname, avatar, color: 'sky', progress: Object.assign({}, read('impactlab.v1') || {}, progress || {}), needsSetup: false, createdAt: 1, updatedAt: 1 }] });
}
