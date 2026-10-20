# Race Lab immersion: architecture and asset decision

Status: self-authored vehicle and chase-camera checkpoint built; visual-quality gate failed. Baseline: `c6ac0b4992ae1f27e81d931e442f29586a0c6039` on `origin/main`.

## Existing ownership

| Concern | Current owner | Constraint |
| --- | --- | --- |
| Race state, options, tuning variables, result, scoring, Coach messages, Canvas scene | `src/game/20-race.js` (`Race`) | Keep imported-v42 outcomes and score calculation intact. |
| Path and vehicle dynamics | `racePath`, `autoWheel`, `raceStep` in `src/game/10-fight.js` | Current kinematic bicycle clamps curvature at `μg/v²`; slide is a Boolean when requested curvature exceeds that cap. There is no slip angle, lateral velocity, drift state, or boost energy. |
| Classic actions and keyboard | `Race.actions()` plus `src/game/53-weekly-challenge.js` | Shared action pad, arrow mappings, held-key release, pause ownership. |
| Analog pointer, keyboard, collapse and cancellation | `src/game/55-analog-gesture-controls.js`; `src/shared/game-core.js` | Existing analog X steers; Y grades throttle/brake. Gesture primary is throttle. Lifecycle release is in `src/game/56-mobile-lifecycle.js`. |
| 3D renderer | `V3` in `src/game/50-renderer-3d.js`, dispatched by `src/game/70-main-loop.js` | `V3.want()` is Kick-only; no Race vehicle, track, chase camera, or Race WebGL fallback exists. |
| Live Physics Combo | `src/game/62-live-physics-combo.js` | Race starts on the canonical corner transition and adjusts existing `Race.V.mu` and `Race.V.R`; it must remain the only live tuning owner. |
| Local asset/build contract | `src/assets/3d`, `scripts/build.mjs`, `scripts/validate-3d-assets.mjs` | The only checked-in GLBs and Blender files are athlete assets. There is no vehicle geometry, texture, material reference, or vehicle license record. |

## Smallest coherent implementation after the asset gate

1. Add a pure, deterministic Race dynamics module used by `raceStep`. Preserve the existing path, tunable `μ`, `R`, `m`, `F`, and Race scoring/result shape. Track heading, lateral velocity/slip angle, traction demand, drift state, and nitro charge/cooldown. Let brake and throttle consume the same friction budget as steering; a controlled drift uses a bounded rear-grip reduction with recoverable slip, while an excessive slip becomes a skid. Nitro adds bounded longitudinal force only while charge is available and cannot override traction. Keep timestep clamping and test drift entry/exit, skid threshold/recovery, boost depletion/cooldown, and existing score fixtures.
2. Give `Race` sole ownership of new inputs (`drift`, `nitro`) and energy. Add their minimum actions to the existing floating controller, with 44 px targets, labels and keys. Keep Classic steering and Analog graded axes. Release every held input on collapse, pointer cancellation, blur, background, pause, and mode switch. The controller must not create a second tuning system.
3. Add a Race scene adapter to the local Three.js runtime. Use one vehicle asset, instanced track materials/geometry, a single bounded chase-camera transform based on the actual car pose and limited look-ahead, and no per-frame geometry allocations. Keep the next curve, racing line, and hazards visible across the specified viewports. Reduced motion removes camera spring/impact motion. Canvas remains a complete playable fallback, not a blank scene.
4. Expose traction, slip angle, drift, skid, and nitro energy through the existing Race HUD/math/Coach and move log. Continue to launch the existing Live Physics Combo at corner entry; the combo still owns `μ`/`R` changes. Explain `F/m`, `μg`, corner demand and the boost energy limit in context.
5. Validate a complete run and failure with both controllers and all viewports, performance/payload/memory, fallback, offline/zero-egress, storage invariants, and unchanged Fight/Kick behavior. Record exact-head screenshots and a playable H.264 review walkthrough before a draft implementation PR.

## Asset gate

The requested lifelike, dimensional car cannot be validated against the current repo assets: there is no car source model to render. Reusing the athlete rigs or enlarging the current Canvas rounded rectangle would not meet the stated visual bar. The existing local Blender and GLB toolchain can support a newly authored car, but that requires a vehicle design and modeling pass with visual review before it can be treated as the production asset. A sourced car would require third-party acquisition and license resolution, which the request explicitly excludes at this step.

**Decision needed:** choose a newly self-authored vehicle with a visual review checkpoint, or provide an already owned local vehicle GLB/Blender source with its provenance and license. Do not implement the renderer or mechanics against a placeholder and label it production quality. Do not download, purchase, upload, or contact a vendor in this lane. Once the source is established, resume from this branch and complete the architecture, tests, evidence, and draft PR; do not merge or deploy here.

## 2026-10-20 local vehicle checkpoint

The authorized self-authored route produced an editable Blender source, deterministic generator, and a 313,960-byte local GLB with zero glTF errors, warnings, infos, or external URIs. The Race-only scene renders a track and bounded chase camera; Canvas remains the fallback. The local checkpoint captured 1440×1000, 1113×988, 768×1024, 390×844, and reduced-motion 390×844 views, plus a playable H.264 video. These review files are in `qa-artifacts/race-3d-checkpoint/` and are intentionally not committed. The local QA pass measured p95 frame intervals of 8.9–9.3 ms, zero horizontal overflow, zero page errors, and zero external requests. This is a narrow idle/straight-line visual checkpoint, not a complete Race run or gameplay validation.

**Visual decision: fail.** From the actual chase view the vehicle still reads as a faceted rectangular shell. The wheel arches, body surfacing, glazing, light clusters, and suspension stance do not carry enough dimensional detail at gameplay scale. The terrain and roadside are flat color fields with repeated posts; the scene lacks the depth and material quality needed for the stated Direction C bar. On the phone the 16:9 stage makes the car and upcoming decision small, while the rest of the viewport is occupied by the existing guidance/control layout. The first profile toast can also overlap the phone view and its close control was intercepted by the guidance rail in headless QA; the final screenshots removed it programmatically only to inspect the underlying scene. Do not treat those screenshots as a successful interaction test.

No drift, skid, nitro, controller action, scoring, storage, or Live Physics Combo changes were made after this failed gate. The vehicle manifest remains `evaluation-only`. A new art-direction/modeling pass must clear the same-camera desktop and phone renders before this branch can proceed to the dynamics and implementation PR. The available choices are to refine this self-authored source with a reviewed modeling brief, or provide an already owned local production vehicle with provenance; third-party sourcing remains outside this lane.
