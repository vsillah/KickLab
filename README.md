# KickLab

A physics game for kids. Three labs (Fight, Race and Kick) where every move is a little equation: impulse, drag, Magnus spin, friction, reaction time. The soccer lab has free kicks, headers, 1v1 dribbling with skill moves, passing, goalkeeping, a shootout and a live match, rendered in a 3D stadium.

The game ships as **one self-contained HTML file**. This repo keeps the source split into small files so two people can work on different parts without stepping on each other.

## Layout

```
src/
  index.html          page markup with {{STYLES}}, {{VENDOR}}, {{GAME}} placeholders
  styles.css          all CSS
  vendor/three.min.js Three.js r186 + matching GLTFLoader (MIT), bundled so 3D works offline
  assets/3d/          manifest-bound local GLB evaluation fixtures
  game/               the game script, split by feature and joined in filename order
    00-core.js              strict-mode wrapper opens here
    01-progress.js          saved bests, XP, levels, badges
    02-challenges-coaches.js
    03-audio-fx-engine.js
    04-body-rig.js          articulated figures
    05-console-helpers.js
    10-fight.js
    20-race.js
    30-kick-sideview.js     free kick and header physics
    31-soccer-data.js       moves, kit room, temperature, keeper scenarios
    32-soccer-3d-modes.js   dribble, passing, keeper, shootout
    40-quiz-notebook.js
    41-ui.js
    42-match.js
    49-profiles.js          local player setup, switching and stats
    50-renderer-3d.js       Three.js stadium
    51-live-match.js
    52-leaderboard.js       local device and optional family boards
    53-weekly-challenge.js
    60-pause-replay.js
    70-main-loop.js         wrapper closes here
scripts/build.mjs     joins the game, validates local GLBs, and emits build metrics
capacitor.config.json shared local-first mobile packaging identity and web directory
config/               machine-readable mobile safety and authority contract
src/shared/           deterministic, DOM-free game core shared by every platform
docs/architecture/    canonical web/iOS/Android integration contract
docs/decisions/       architecture decision records
docs/release/         finite native qualification gates and current evidence state
```

All the `game/` files form a single script scope once joined, so a constant defined in `10-fight.js` is visible in `70-main-loop.js`. Files are ordered by their number prefix. To add a feature, drop in a new file with a number that puts it after whatever it depends on (for example `54-stamina.js`).

## Build

The browser-only build needs Node 18 or newer. Shared mobile preparation needs Node 22 or newer and the exact dependencies from `package-lock.json`.

```
npm ci           # required before shared mobile preparation
npm run build    # writes dist/kicklab.html
npm run assets:validate # validates manifest provenance, hashes, GLB structure, and local-only resources
npm test         # runs the DOM-free shared-core tests
npm run mobile:prepare # writes the offline-hardened dist/mobile/index.html
npm run mobile:check   # validates the shared native packaging contract
npm run check    # build + syntax check + tests (what CI runs)
```

Open `dist/kicklab.html` in a browser to play. Local player profiles and the Local device leaderboard work offline in browser storage. The optional family leaderboard uses the Claude artifact runtime's shared database, so that separate view only lights up when the built file is published as a Claude artifact. Everything else runs anywhere.

## Working with branches

1. `git checkout -b feature/short-name`
2. Edit files under `src/`, run `npm run check`, play-test `dist/kicklab.html`.
3. Push and open a pull request. CI builds the game and attaches the HTML to the run so it can be play-tested before merging.

Saved progress and the weekly challenge seed still use the old `impactlab` keys on purpose, so nobody's XP, kit or leaderboard history resets after the rename. Multi-profile builds store their versioned envelope in `kicklab.profiles.v1` and mirror the active player back to `impactlab.v1` and `impactlab.nick` for compatibility. See [`docs/architecture/local-player-profiles.md`](docs/architecture/local-player-profiles.md).

## In-game Coach guidance

Across Fight, Race, and Kick, use the game's established styled Coach components for guidance. During active play, show one concise instruction, a few scannable facts with visual cues where useful, and one clear next action. Put explanations, calculations, tradeoffs, and history behind the existing notebook or detail controls so players can open them when ready. A wall of text on an active gameplay surface fails UI review, even when its advice is correct. Check the rendered guidance on phone, tablet, and desktop, including setup, live, blocked, and result states.

Cross-platform work starts with the [architecture contract](docs/architecture/cross-platform-contract.md). The current HTML artifact remains supported while deterministic game rules move behind shared interfaces and Capacitor shells are introduced in separately owned platform lanes.

The shared Capacitor foundation is local-first and generates no `ios/` or `android/` project. Platform lanes consume the same `dist/mobile` artifact and follow the [seven-gate native qualification roadmap](docs/release/mobile-qualification-roadmap.md). Native launch does not create an account, cloud identity, or sync relationship.

The [web release preparation guide](docs/web-release.md) documents the review-only GitHub Pages artifact workflow. It packages `dist/pages/index.html` but does not enable or deploy GitHub Pages.

`dist/` is not committed, so built output never causes merge conflicts.
