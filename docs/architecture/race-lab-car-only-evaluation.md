# Race Lab car-only visual checkpoint

Date: 2026-10-20. Branch: `codex/kicklab-race-lab-immersion`. Scope: local evaluation of the [Vintage Racing Car by SpatialNeglect](https://sketchfab.com/3d-models/vintage-racing-car-0b4cd62e8620486f9b62c32d87d3ed0e) against the existing unbranded Race track. The Race Track Assets Pack remains quarantined and was not derived or used.

## Provenance and local derivation

The unmodified converted 1K GLB is `qa-artifacts/race-sketchfab/raw/vintage_racing_car_1k.glb` (20,927,752 bytes; SHA-256 `6450ac1ecdabea7754248d3563dc737f176431373236f109c7e3dbfff5828b24`). Its Sketchfab listing and embedded glTF metadata identify the creator as SpatialNeglect / Mateusz Woliński, the model ID as `0b4cd62e8620486f9b62c32d87d3ed0e`, and the license as [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). An eventual use would credit the creator, link the source and license, and state modifications. No paid service, private upload, or cloud generation was used. The texture contact sheet did not reveal a logo or brand mark; this is a local visual check, not independent proof of every source right.

The evaluation output is `qa-artifacts/race-sketchfab/derived/car-eval-oriented.glb` (1,709,512 bytes; SHA-256 `855274d5543cfd4af172bd3969484fd218f820fcaea32cc5e66c1e94819f7ce1`). Exact derivation sequence from repo root, using glTF Transform CLI 4.5.1:

```sh
npm install --prefix qa-artifacts/race-sketchfab/tools --no-save --ignore-scripts @gltf-transform/cli@4.5.1
T=qa-artifacts/race-sketchfab/tools/node_modules/.bin/gltf-transform
$T resize qa-artifacts/race-sketchfab/raw/vintage_racing_car_1k.glb qa-artifacts/race-sketchfab/derived/car-512.glb --width 512 --height 512
$T webp qa-artifacts/race-sketchfab/derived/car-512.glb qa-artifacts/race-sketchfab/derived/car-512-webp.glb --quality 78
$T simplify qa-artifacts/race-sketchfab/derived/car-512-webp.glb qa-artifacts/race-sketchfab/derived/car-simplified.glb --ratio 0.36 --error 0.01
$T quantize qa-artifacts/race-sketchfab/derived/car-simplified.glb qa-artifacts/race-sketchfab/derived/car-quantized.glb
$T prune qa-artifacts/race-sketchfab/derived/car-quantized.glb qa-artifacts/race-sketchfab/derived/car-eval.glb
python3 qa-artifacts/race-sketchfab/evidence/orient_car.py
```

The orientation script wraps the optimized scene in a −90° Y rotation so the front faces KickLab's +X track and a uniform 1.4 scale. It does not merge or rename the wheel meshes. Blender 5.1.2 was used to inspect the imported source. The final GLB has 31,190 triangles, nine mesh primitives (a nine-draw-call car floor), four materials, 13 textures, and no animations. `EXT_texture_webp` and `KHR_mesh_quantization` are required by the derived GLB. glTF Transform validation found zero errors, warnings, infos, or hints, and the GLB has no external buffer or image URI. Payload is below the proposed 2 MB car budget. The SHA-256 above binds this checkpoint.

## Reversible same-camera review

`npm run build` produced the existing offline app in `dist/`. For evaluation only, the original built GLB was copied to `qa-artifacts/race-sketchfab/evidence/rollback-original-runtime.glb`, and the derived car was copied over **only the built `dist/` GLB**. Source `src/assets/3d/kicklab-race-vehicle/v1/kicklab-race-vehicle.glb`, its fail-closed manifest, and `src/game/21-race-3d.js` were not changed. The app was served on `127.0.0.1:4298` and loaded with a hash-bound query. After capture, the built asset was restored; its SHA-256 again matched the source asset at `3b4884672d3499e7a03e2dcee1b305895b3e68bda4b8f720a79e6c2dda94c041`. The temporary server was stopped.

The actual Race chase-camera captures are:

- Desktop, 1440×1000: `qa-artifacts/race-sketchfab/evidence/car-desktop-chase.jpg`.
- Phone, 390×844 with the on-screen controls collapsed: `qa-artifacts/race-sketchfab/evidence/car-phone-chase.jpg`.

**Visual gate: failed.** At the target desktop width the car looks too small relative to the roadway (roughly 15% of the stage width versus the existing 18–24% composition target). At phone width it takes roughly 36% of the stage width versus the 24–32% target. A single asset scale cannot correct both views without a responsive scene change. The rusty, open vintage body also reads out of place in the intended racing scene. These are visual judgments from the rendered captures, not acceptance based on file metadata. A playable MP4 was not made because the visual gate did not pass.

Per the stop condition, runtime offline/zero-egress, Canvas fallback, responsive interaction, and desktop/tablet/phone p95 frame pacing were **not qualified**. The GLB itself has no external URI, but that does not prove zero runtime egress. There is no approval to start dynamics, controllers, scoring, PR, push, merge, or deployment. The current self-authored vehicle remains `evaluation-only`; the rollback checkpoint is `1d02f5465e0dec7ad1c9a722e2e12721043e6aa6`.
