# KickLab

A physics game for kids. Three labs (Fight, Race and Kick) where every move is a little equation: impulse, drag, Magnus spin, friction, reaction time. The soccer lab has free kicks, headers, 1v1 dribbling with skill moves, passing, goalkeeping, a shootout and a live match, rendered in a 3D stadium.

The game ships as **one self-contained HTML file**. This repo keeps the source split into small files so two people can work on different parts without stepping on each other.

## Layout

```
src/
  index.html          page markup with {{STYLES}}, {{VENDOR}}, {{GAME}} placeholders
  styles.css          all CSS
  vendor/three.min.js three.js r128 (MIT), bundled so 3D works offline
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
    50-renderer-3d.js       Three.js stadium
    51-live-match.js
    52-leaderboard.js       family board (shared db)
    53-weekly-challenge.js
    60-pause-replay.js
    70-main-loop.js         wrapper closes here
scripts/build.mjs     joins everything into dist/kicklab.html
```

All the `game/` files form a single script scope once joined, so a constant defined in `10-fight.js` is visible in `70-main-loop.js`. Files are ordered by their number prefix. To add a feature, drop in a new file with a number that puts it after whatever it depends on (for example `54-stamina.js`).

## Build

Needs Node 18 or newer. No packages to install.

```
npm run build    # writes dist/kicklab.html
npm run check    # build + syntax check (what CI runs)
```

Open `dist/kicklab.html` in a browser to play. The family leaderboard and weekly challenge use the Claude artifact runtime's shared database, so those only light up when the built file is published as a Claude artifact. Everything else runs anywhere.

## Working with branches

1. `git checkout -b feature/short-name`
2. Edit files under `src/`, run `npm run check`, play-test `dist/kicklab.html`.
3. Push and open a pull request. CI builds the game and attaches the HTML to the run so it can be play-tested before merging.

Saved progress and the weekly challenge seed still use the old `impactlab` keys on purpose, so nobody's XP, kit or leaderboard history resets after the rename.

`dist/` is not committed, so built output never causes merge conflicts.
