# Race material fidelity: first visual checkpoint

Source head: `ac495aa5af58231d75191955ad3813dd6cdb13cf`  
Branch: `codex/kicklab-race-material-fidelity`  
Status: Phase 2 of 4, waiting for Integration Captain visual review. No PR, merge, or deployment.

## Provenance and scope

All new maps are generated locally from self-authored deterministic code in `src/game/21-race-3d.js`. No downloaded textures, new assets, geometry, road centerlines, camera rules, or network requests are involved. The existing vehicle, sky, rails, painted lines, curbs, controls, physics, scoring, and Canvas fallback remain on their existing paths.

The material pass replaces the 128-pixel random grayscale road texture with periodic, directionally stretched asphalt variation. It adds restrained aggregate variation to Highland and Forest shoulders, wind-shaped sand variation to the existing Marine shoulders, and soil variation to the existing Highland and Forest ground plane. Marine's blue water plane stays blue. Four 128×128 maps are generated once per renderer; the built HTML grows by 2,273 bytes (2,332,757 → 2,335,030 bytes).

## Matched visual evidence

Run `node scripts/qa-race-material-frames.mjs baseline` before changing renderer code and `node scripts/qa-race-material-frames.mjs ground-v6` after building the candidate. The QA script uses only localhost, injects an in-memory reference to the existing Race and renderer objects for deterministic posing, and leaves the built artifact unmodified. All scenes are at the same static active-play state and camera: x=44 m, y=0, heading=0, speed=0, after the 3D vehicle has loaded. It checks Highland, Marine, and Forest at 390×844 and 1440×900. Camera positions, car centers, and track keys match between baseline and candidate for every pair.

Local frame and report paths:

- `qa-artifacts/race-material-frames/baseline/`
- `qa-artifacts/race-material-frames/ground-v6/`

Each contains `phone-{highland,marine,forest}.png`, `desktop-{highland,marine,forest}.png`, and `report.json`. The `qa-artifacts` directory is intentionally ignored by Git; these are local review evidence, not shipped game assets.

## First checkpoint findings

All six candidate frames rendered the 3D vehicle, retained the road and paint visibility, had zero horizontal overflow, and made zero external requests. No page errors occurred. The headless browser's median requestAnimationFrame interval stayed at 8.3 ms in both runs. Candidate p95 ranged from 8.6 to 10.3 ms versus 9.0 to 9.3 ms at baseline; this measurement is sensitive to browser scheduling, so phase 4 must measure sustained motion and device performance before making a performance claim.

`npm run build`, `node --check src/game/21-race-3d.js`, `git diff --check`, and the matched frame script passed. The older `scripts/qa-race-systems-proxy.mjs` could not complete: its `#orientationDetailToggle` selector is hidden in the current desktop cockpit, so it timed out before venue assertions. That appears to be a stale QA path; the new matched frame script exercises the three venues directly.

Visual review should focus on sand and gravel scale, road texture stability, horizon tiling, painted curb contrast, and the narrow-phone crop. Phase 3 atmosphere and secondary surfaces await explicit captain approval of this checkpoint.
