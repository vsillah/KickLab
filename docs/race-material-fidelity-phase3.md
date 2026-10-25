# Race material fidelity: second visual checkpoint

Phase 2 approval head: `596aff5f316ecc882f74fc388ec8a47813e4fba3`  
Branch: `codex/kicklab-race-material-fidelity`  
Status: Phase 3 of 4, waiting for Integration Captain visual review. No PR, merge, or deployment.

## Scope and provenance

The existing local sky canvas now carries a restrained upper-to-horizon gradient with three deterministic, translucent haze patches. The same 64×256 texture is reused at phone and desktop widths; there is no new geometry, downloaded texture, or runtime request. The existing fog moves toward the new sky's horizon value while retaining the current density. Existing rail, gantry, rock, trunk, and canopy materials receive small roughness, metalness, and deterministic color variations. Phase 2 ground materials and Marine's water plane are retained.

## Matched frames

`qa-artifacts/race-material-frames/exact-head/` is the approved Phase 2 baseline at `596aff5`. `qa-artifacts/race-material-frames/atmosphere-v1/` contains the Phase 3 candidate. Each folder has six screenshots and `report.json`: Highland, Marine, and Forest at 390×844 and 1440×900. The script uses identical static active-play state and camera. Track keys, camera positions, and car centers match exactly for every pair. All six candidate views show the 3D vehicle, no horizontal overflow, no page errors, and zero external requests.

The built HTML grows by 482 bytes from Phase 2 (2,335,030 → 2,335,512). The candidate's highest headless p95 requestAnimationFrame interval was 10.3 ms, equal to the Phase 2 ceiling; median stayed 8.3 ms. These are static browser measurements, not sustained-motion or physical-device performance proof.

`npm run build`, `node --check src/game/21-race-3d.js`, `git diff --check`, and 13 focused Race/3D tests passed. The older `scripts/qa-race-systems-proxy.mjs` remains blocked by its hidden `#orientationDetailToggle` selector, as recorded in the Phase 2 report.

Captain review should compare sky tone and horizon separation, car and road contrast, visible curbs, and the 390 px crop. Phase 4 qualification, MP4, and draft PR await approval of this visual checkpoint.
