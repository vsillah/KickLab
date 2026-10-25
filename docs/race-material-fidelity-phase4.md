# Race material fidelity: qualification and Human QA handoff

Branch: `codex/kicklab-race-material-fidelity`

Base: `ac495aa5af58231d75191955ad3813dd6cdb13cf`

Scope: Phase 4 of 4. Draft PR and Human QA pending; no merge or deployment.

## Product changes

The Phase 2 road, ground, curb, rail, and Marine water materials and Phase 3 sky, fog, rock, trunk, and canopy materials are the entire product change. They remain procedural and local. Gameplay physics, track geometry, camera framing, cockpit interactions, and privacy behavior are unchanged.

## Qualification

- `npm run check` passed, including build, 3D asset validation, Pages and mobile preparation, 233 tests, and web/Pages checks.
- `node scripts/qa-race-cockpit-parity.mjs http://127.0.0.1:4173/kicklab.html qa-artifacts/race-material-cockpit-parity` passed setup, tools, and live surfaces at 360, 390, 768, 1113, 1440, and 1980 px. It found no external requests.
- `node scripts/qa-race-material-qualification.mjs` passed 30 active-driving combinations: 360, 390, 768, 1113, and 1440 px; normal and reduced motion; Highland, Marine, and Forest. Every case rendered the 3D vehicle and the selected venue, advanced the car, had no horizontal overflow, and retained the local QA nickname. Android emulation used projected contact shadow with shadow maps off. Forced GLB failure reached the existing Canvas fallback. The default-off path did not initialize the 3D canvas. The full report has zero page errors and zero external requests.
- Physical Pixel 10 Pro (Android 17, Chrome 156) loaded the exact material head and a later QA-only head through local ADB port reversal. Highland showed `status=rendering`, `vehicle=true`, and `shadowMode=projected-contact` with `shadowMap=false`; the car advanced from x=4 to x=25.71 under gas in the retained later-head report. A 180-frame sample measured median 8.4 ms, p95 16.8 ms, worst 17 ms on that run. Pause and resume retained WebGL. Landscape, portrait return, and same-tab Chrome background/foreground recovery passed on the same material code. Physical device evidence is in ignored `qa-artifacts/race-material-pixel/`.

Browser qualification used a temporary QA hook in the fetched HTML to select venues deterministically. That hook does not change the built game file. The physical Pixel run used the unmodified built game. The Pixel performance sample is one device and run; it is evidence of this session, not a broad performance guarantee. The physical run exercised Highland; the three-venue matrix was completed in desktop Chromium browser contexts. A later attempt to automate a longer Pixel recording lost its active heat and overwrote the first local recording, so retained evidence does not qualify sustained physical driving. The final MP4 instead records active desktop-browser gameplay in all three venues at phone and desktop widths.

## Human QA artifact

Run `node scripts/record-race-material-walkthrough.mjs` from the final commit while its `dist` is served on port 4173. It records active gameplay in all three venues at phone and desktop widths, composes a privacy-safe MP4, and validates duration, dimensions, encoding, and byte size. The ignored MP4 and report are stored under `qa-artifacts/race-material-walkthrough/`. Review the final encoded frames before requesting Human QA.

Human QA should judge road and terrain material readability, Marine water/horizon, the restrained sky haze, rail/gantry/rock/foliage variation, visible car/track at narrow width, and motion continuity. The current lane stops at a draft PR and Human QA gate. The Integration Captain owns any later merge and deployment decision.
