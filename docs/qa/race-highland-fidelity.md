# Highland environment fidelity experiment

Base: `c57ac3b542cbd0df83a874ff5746e65fef4b493b`. The `raceHighlandFidelity=prototype` query works only on loopback HTTP. It is absent from the home-entry flag set and disabled on Pages and Capacitor origins. The change adds no runtime asset or request. All geometry is procedural and visual only.

The 13 local Fable 5.2 prompt files were consulted only for visual discipline: define material rules, choose one lighting idea, keep exact camera/time fixtures, avoid copied aesthetics, and compare screenshots repeatedly. Their build commands and permissive asset/network clauses were not adopted.

## Physical scene rules

- The canonical road and collision route stay fixed. Banks, rocks, and heather begin outside the guardrail.
- Road wear remains fine and longitudinal. The shoulder is loose mineral aggregate. Banks rise gradually away from the road; rock is weathered and low, with sparse wind-stunted heather.
- One low warm sun gives the car and environment a shared light direction. The existing live car shadow remains attached to the car. A local sky gradient and distant ridge provide restrained depth without postprocessing.
- Instanced rock and heather geometry bounds draw calls. The experiment caps DPR at 2 and reduces its internal scale under sustained frame pressure. This changes pixels only.

## Screenshot rounds

Each directory under `qa-artifacts/race-highland-fidelity/` contains six deterministic camera/route states for desktop and phone, normal and reduced motion, with the flag on and off. The three reviewed states in each round were `starting-grid`, `corner-apex`, and `recovery-finish`. These raw screenshots and the corresponding `report.json` remain local; they are outside the 204-file native package.

| Improvement | Before → after | Three weakest visible aspects addressed |
| --- | --- | --- |
| 1. Terrain banks | `round-1` → `round-2` | Empty horizon; ground without grade; detached roadside stones. |
| 2. Roadside finish | `round-2` → `round-3` | Faceted bank bands; bright red curb dominance; high-gloss rail. |
| 3. Stone form | `round-3` → `round-4` | Angular repeated stones; uniform stone color; tiny triangular plants. |
| 4. Heather form | `round-4` → `round-5` | Egg-shaped shrub rows; weak scrub silhouette; repetitive green color. |
| 5. Light direction | `round-5` → `round-6` | Flat car-ground contact; cool empty sky; weak distinction between road and shoulder. |
| 6. Distant ridge | `round-6` → `round-7` | Unbroken flat skyline; little depth beyond the barriers; no geographic cue at the apex. |

The final ridge material adjustment follows round 6. Performance was measured on the complete slice rather than after every intermediate edit; the per-round performance part of the requested art-direction protocol remains unverified.

## Captain follow-up art pass

The follow-up compared the committed scene with `captain-pass-1`, `captain-pass-2b`, and `captain-pass-3` at 390×844 and 1440×900. The first attempted ridge was too tall and read as flat cutout bands. The next iteration lowered all three distant layers and exposed more sky. The final iteration used a cooler clouded sky, more varied turf and bank color, darker stone and lichen tones, and irregular stone forms and heather placement. The banks now begin closer to the shoulder. Car and road geometry, lighting on the car asset, physical route, and input handling remain unchanged.

This is a visible improvement over the committed frame, especially in the phone apex and desktop start view, but the distant ridges and repeated roadside forms remain stylized. The pass did not establish the desired high-fidelity art bar. It is a bounded candidate for captain visual review, not a release-ready environment. Further improvement would need an approved terrain and material asset direction with device GPU qualification.

## Qualification evidence

- `final-matrix/report.json`: 5 viewports × 2 motion settings × flag on/off × 6 states, 120 scene rows and 20 performance rows. No page errors, external requests, or viewport overflow.
- `frozen-base` versus `frozen-final`: all six desktop default-off frames are pixel-identical under paused deterministic fixtures. On/off snapshots have identical vehicle asset URLs and gameplay dynamics.
- `boundaries/report.json`: Canvas preference, forced WebGL failure, offline Race entry, visibility recovery, and profile storage reload passed. No external request or offline document navigation occurred.
- Headless p95 at 390×844: base 33.5 ms; final off 34.2 ms; final on 34.2 ms. At 1440×900: base 33.7 ms; final off 33.4 ms; final on 33.8 ms. These values meet the 50 ms ceiling. The headless runner schedules normal-motion frames near 30 fps even on the exact base, so it cannot establish the 60 fps desktop target on a device GPU.
- GPU allocations at 1440×900: 40 → 44 geometries; 12 → 12 textures. The HTML artifact grows from 2,673,830 to 2,680,425 bytes (+6,595); the native package still contains 204 files. Car GLBs, roster stills, vehicle IDs, and native identity are untouched.

The follow-up `followup-matrix/report.json` again records 120 scene rows plus 20 performance rows without page errors, external requests, or overflow. Its 1440×900 normal-motion p95 is 34.0 ms flag off and 35.0 ms flag on; 390×844 is 35.0 ms off and 33.5 ms on. GPU allocations are 40 → 46 geometries and 12 → 12 textures. The HTML artifact is 2,683,145 bytes, +9,315 over exact base. The headless runner still cannot establish 60 fps on real hardware; adaptive DPR dropped to 0.8–0.9 in this run. The follow-up boundary matrix again passed Canvas preference, forced WebGL fallback, offline entry, visibility recovery, and profile storage recovery.

## Remaining gates

Real device GPU frame timing and captain visual review remain. `record-race-highland-fidelity.mjs` captures actual input-driven gameplay; `assemble-race-highland-fidelity.mjs` combines that segment with the six exact-head scene frames into the privacy-safe review MP4. The experiment must stay default-off and must not be merged or deployed until captain review passes. No release, signing, or store submission is authorized by this experiment.

The follow-up produces separate exact-head phone and desktop MP4s. The phone clip includes a real input-driven gameplay segment; the desktop clip shows the same six fixed scene states at 1280×800. Neither clip substitutes for physical-device GPU timing or captain visual acceptance.
