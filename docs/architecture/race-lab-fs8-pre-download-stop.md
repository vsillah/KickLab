# Race Lab FS-8 pre-download stop

Date: 2026-10-20. Branch: `codex/kicklab-race-lab-immersion`. Scope authorized: visual-only local evaluation of Sketchfab FS-8 model `a926bd251c384505b47f6e152b1859ce`, with an explicit stop for unclear or failed visual fit. **Outcome: stopped before download.**

## Evidence and decision

The live [FS-8 listing](https://sketchfab.com/3d-models/fs-8-a926bd251c384505b47f6e152b1859ce) names Zandora_Design (`Explode_Arts`), shows CC Attribution, a free download button and 57,312 triangles. The [public model API](https://api.sketchfab.com/v3/models/a926bd251c384505b47f6e152b1859ce) reports `isDownloadable: true` and license slug `by`; a sanitized snapshot is in ignored local evidence at `qa-artifacts/race-sketchfab/evidence/fs8-public-metadata-2026-10-20.json`. The creator's description says the design originated as their freehand concept. This supports a plausible rights path but does not independently prove every source right.

The Sketchfab **viewer annotation**, which was not exposed in the ordinary listing description used for the earlier shortlist, is titled “Unfinished model.” The creator says the rear and interior still need work. The annotation is visible in `qa-artifacts/race-sketchfab/evidence/fs8-creator-unfinished-rear.jpg` (1280×720, ignored local evidence). Race Lab's primary view follows the car from behind. Thus the strongest visible concern is on the exact surface the player would watch; a front three-quarter preview cannot clear it. An exploratory rear-quarter orbit also exposed a sparse wheel/body area, but the creator statement is the decisive evidence. **Visual fit is unclear/failed for this use case, so the requested stop condition fired before acquisition.**

Clicking the listing's download control in the integrated browser opened a Sketchfab login dialog; it did not start a download. The dialog was dismissed. No credentials were entered, no Sketchfab archive was requested, and no new model file was copied into `qa-artifacts/race-sketchfab/raw/`. No money was spent.

## Gates not reached

There is no raw FS-8 file to hash or audit for embedded license, mesh/material/texture names, logos, wheel pivots, external URIs or texture pixels. There is no reversible derived GLB, same-camera desktop/tablet/phone capture, payload measurement, mobile frame pacing, Canvas fallback test or zero-runtime-egress result for FS-8. The public 57,312-triangle number is a listing count only. The download/login interruption did not establish a license or source-ownership failure; this stop is based on rear-chase visual suitability.

The two older quarantined GLBs were untouched. Their SHA-256 values still match the acquisition record: vintage car `6450ac1ecdabea7754248d3563dc737f176431373236f109c7e3dbfff5828b24`; track pack `a5684e8e62d705d4b2e017f8e1849b7e4e37e6b4fec0a2427aeae5f6fa767322`. Source assets, manifests, scene code, physics, controllers, scoring and deployment remain unchanged. The worktree's only tracked change for this checkpoint is documentation.

## Continuation gate

Phase 1 remains **open**. The rank-2 Kralzfiller model has separate provenance, visual and optimization uncertainties and was **not** authorized as a fallback. A new bounded choice is required: select that specific model for a fresh pre-download rights/visual check, choose another rights-cleared source, or commission/author an original car with a finished rear. The environment phase and dynamics/controllers remain downstream of separate car and environment visual gates. No PR, push, merge or deployment follows this stop.
