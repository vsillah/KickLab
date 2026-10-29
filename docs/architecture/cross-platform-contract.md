# KickLab cross-platform architecture contract

Status: canonical transition contract, version 1.0
Owners: Integration Captain and platform lane maintainers
Last reviewed: 2026-10-17

## Assumptions recorded before implementation

- The current self-contained HTML build is a working product surface and remains supported during migration.
- Offline play is a product requirement. Network access may enrich the game, but it cannot be required for the core labs or saved local progress.
- KickLab serves children ages 9–15. The game core must not collect identity, contact, location, advertising, or analytics data. Parent/guardian-controlled services must sit outside the game core.
- The existing `impactlab.v1` progress key and `impactlab.nick` nickname key are compatibility identifiers, not stale branding to rename. Existing players must keep their progress.
- The existing browser artifact remains self-contained. The shared mobile foundation introduces only exact-version Capacitor dependencies and a package lock; broader workspace tooling waits until a platform shell needs it.
- The current browser UI owns rendering, sound, input, timers, and DOM state. Moving those concerns is outside this foundation slice.

## Target repository layout

Migrate toward this layout in small, independently reviewable steps:

```text
apps/
  web/                  browser entry, canvas/DOM UI, offline web build
  mobile/               Capacitor configuration and shared mobile shell
    ios/                generated/native iOS project; iOS lane owns it
    android/            generated/native Android project; Android lane owns it
packages/
  game-core/            deterministic rules, math, scoring, progression policies
  storage/              versioned local persistence and opt-in sync ports
  contracts/            serializable commands, events, and service schemas
tests/
  contract/             cross-platform fixtures consumed by every shell
docs/
  architecture/         canonical integration contract
  decisions/            architecture decision records
```

During transition, `src/game/` remains the browser implementation and `src/shared/game-core.js` is the first package-shaped seam. Platform lanes must import or bundle that seam; they must not copy its formulas into platform-specific code. Moving paths into `apps/` or `packages/` is a later mechanical migration after the web and mobile shells can consume package entry points.

## Boundary rules

### Shared game core

The core is deterministic and has no DOM, canvas, audio, clock, random-number, storage, network, or platform imports. It accepts plain serializable input and returns immutable plain data. A caller supplies any time, seed, locale-independent units, difficulty settings, and player command.

The first stable API is `globalThis.KickLabGameCore` version `1.0.0`:

- `calculateFreeKick(input)` calculates the no-air free-kick path and scoring constraints.
- `timeAtDistance(distance, horizontalVelocity, horizontalAcceleration)` supplies the shared kinematic primitive.
- `STORAGE_KEYS` publishes the compatibility keys used by adapters.

The global entry keeps the current no-bundler HTML build working and is loadable in Node tests. When workspace packaging arrives, expose the same API as an ES module without changing its input or output shape. Breaking changes require a new major `apiVersion`, updated fixtures, and coordinated consumers.

### Platform shells

Web, iOS, and Android own presentation and device behavior: rendering, accessibility trees, touch/keyboard/controller input, sound/haptics, lifecycle pause/resume, safe-area layout, reduced motion, and platform packaging. Shells translate input into core commands and render returned state/events. They may not place private child data into core inputs.

Each platform lane must prove:

1. it consumes the canonical core or its generated package, rather than a copied formula;
2. the contract fixtures pass unchanged;
3. offline startup and one full lab round work;
4. pause/background/resume does not duplicate rewards or lose a committed result;
5. accessibility and age-appropriate copy are reviewed on the rendered surface.

### Storage and sync ports

Storage is an adapter behind these asynchronous semantics:

```js
loadLocal(): Promise<ProgressEnvelope | null>
saveLocal(envelope): Promise<void>
loadRemote(scope): Promise<ProgressEnvelope | null>
saveRemote(scope, envelope, expectedRevision): Promise<SaveResult>
```

`ProgressEnvelope` is serializable and contains `schemaVersion`, an opaque `playerScope`, `updatedAt`, `revision`, and `progress`. The child-facing app may use a device-local random scope. Account, family, classroom, consent, deletion, and recovery flows belong to a parent/guardian service boundary, not to the game core.

Remote sync is optional and fail-local: a network failure must never block play or erase local progress. Conflicts are explicit; XP, badges, and records must use documented merge rules rather than last-write-wins. No platform lane may activate remote sync until privacy review, data minimization, deletion/export behavior, authentication boundaries, and guardian consent are approved.

## Existing progress compatibility

The web adapter continues reading and writing the exact keys:

- `impactlab.v1` — JSON progress object;
- `impactlab.nick` — local nickname string.

Migration is read-old/write-compatible:

1. Read `impactlab.v1` first and validate it as an object.
2. Wrap a valid value in the future versioned envelope without deleting the old key.
3. Write the new envelope and continue mirroring `impactlab.v1` for at least one shipped web release.
4. Verify downgrade behavior before ending the mirror period.
5. Preserve unknown fields so a newer client does not destroy progress when an older client saves.

Native shells must not assume browser local storage is transferable. Their first launch begins local unless an explicit guardian-approved import or sync flow exists. A nickname is display data, not identity or authorization.

## Shared Capacitor foundation

The canonical application id is provisionally `com.amadutown.kicklab`. Changing it requires a replacement decision record because it affects both platform lanes and future store identity. `capacitor.config.json` points only to the generated `dist/mobile` package; it omits `server.url`, keeps cleartext disabled, and has an empty navigation allowlist.

The foundation pins Capacitor 8 and requires Node 22 or newer. Generated shells must retain the supported platform floor: iOS 15 or newer and Android minimum SDK 24, compile SDK 36, and target SDK 36. Android's compile/target level follows the pinned Capacitor major and the current store-submission policy; a platform lane may not work around a stale Capacitor major by overriding it to an unsupported SDK target.

`npm run mobile:prepare` rebuilds the audited self-contained game as `dist/mobile/index.html`, removes remote stylesheet references, and injects a Content Security Policy with `connect-src 'self' blob:`. This permits the packaged GLB loader to fetch assets from the app's own origin and read local object URLs for embedded textures while blocking external connection destinations. The native artifact uses packaged assets and local storage on first launch. It creates no cloud identity and enables no remote sync.

The only runtime surface exposed to platform lanes is `globalThis.KickLabMobileLifecycle` version `1.0.0`: `suspend(reason)`, `foreground(reason)`, `haptic(cue)`, and read-only `state()`. It accepts no arbitrary message or payload transport. Suspension releases classic, keyboard, canvas, analog, and gesture holds, stops continuous audio, suspends the audio context, and pauses active play. Foregrounding does not resume play or sound; the next deliberate player gesture does that.

## Testing contract

- Unit: Node tests cover every deterministic core function with boundary and regression cases.
- Contract: frozen JSON fixtures must run against web and mobile consumers with the same numeric tolerance.
- Adapter: storage tests cover missing, malformed, older, newer, quota-failed, and conflict states.
- Integration: each shell exercises launch, one round, save, restart, background/resume, and offline behavior.
- UI/accessibility: test keyboard/touch targets, focus order, screen-reader names, reduced motion, contrast, and narrow/large text layouts.
- Safety/privacy: assert zero child identifiers or raw telemetry enter game-core events; network calls remain absent in offline mode.

`npm run check` is the repository baseline. Platform lanes add their checks without weakening or replacing it.

## Migration sequence

1. **Foundation (this slice):** document boundaries, publish compatibility constants, extract one deterministic calculation, and run it in the current build plus Node tests.
2. **Web adapter:** isolate browser input/render/storage behind interfaces while preserving the self-contained artifact and old keys.
3. **Package boundary:** introduce workspace tooling only when at least two consumers exist; move the shared source without changing the 1.0 contract.
4. **Capacitor shell:** add a shared mobile shell, then let iOS and Android lanes own their native project folders and platform QA.
5. **Persistence envelope:** add validated versioned local storage and a tested one-release compatibility mirror.
6. **Optional services:** design guardian-controlled auth/sync separately; privacy and security review precede any production activation.
7. **Native reconsideration gate:** consider Swift/Kotlin or another native renderer only if measured device performance, accessibility, or required device APIs cannot be met by the Capacitor build.

## Integration and conflict policy

- Game-core changes own `src/shared/`, future `packages/game-core/`, and core tests.
- Web changes own `src/index.html`, `src/styles.css`, and browser adapters under `src/game/`.
- iOS and Android lanes own only their respective native folders plus narrowly scoped shared mobile configuration changes.
- Contract changes land before consumers. Consumers pin `apiVersion` and fail clearly on an unsupported major version.
- Generated native files are never hand-edited by another platform lane. Cross-platform decisions belong in an ADR before code diverges.
