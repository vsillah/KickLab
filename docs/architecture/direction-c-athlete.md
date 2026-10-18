# Direction C representative athlete

Direction C Stage 2 integrates one original, stylized-realistic free-kick athlete through the merged local glTF pipeline. It is a bounded vertical slice, not a character-library migration. The imported v42 Canvas game, procedural Three.js rigs for every other actor and activity, physics, scoring, learning, profiles, local storage, and offline packaging remain canonical.

## Activation and fallback

The athlete is default-off and loads only for the side-view Free Kick when the local QA/runtime flag `?renderer=direction-c` is present. There is no player-facing renderer chooser or athlete-dimensions panel. Classic Canvas, WebGL failure, `quality=low`, constrained-device, and absent-flag paths keep the existing renderer. Reduced motion keeps the athlete visible but freezes looping motion to bounded representative poses. The lifecycle pause owner freezes the local animation clock, and replay uses the existing recorded Kick snapshots and replay-speed value.

The only runtime asset request is the same-origin repository path `assets/3d/kicklab-direction-c-athlete/v1/kicklab-direction-c-athlete.glb`. The manifest forbids external URIs. No runtime telemetry, upload, cloud processing, likeness, or external asset exists.

## Authored contract

- source: repository-owned Blender file plus a primitive-only Blender Python generator;
- shared skeleton: 23 deform joints;
- clips: `Ready`, `RunUp`, `Plant`, `Strike`, `FollowThrough`, `Celebrate`, and `Recovery`;
- contact: `StrikeContact_R` reaches `BallContactTarget` at 0.4 seconds in `Strike`;
- plant: `PlantContact_L` stays fixed from late `Plant` through `Strike` and the opening `FollowThrough` pose;
- surface: 5,148 triangles, six local materials, zero textures, zero glTF errors, and zero glTF warnings.

## Pass/fail budgets

| Gate | Pass budget | Current deterministic value |
|---|---:|---:|
| Athlete GLB | ≤ 2.5 MB; hard stop at 4 MB | 642,092 bytes |
| Full local first-play payload | ≤ 8 MB | 2,304,902 bytes |
| Strike contact drift | ≤ 10 mm; hard stop at 20 mm | < 0.001 mm authored |
| Plant-foot drift | ≤ 10 mm | < 0.001 mm authored |
| Desktop frame pacing | p95 ≤ 20 ms | 16.8 ms |
| Tablet/mobile frame pacing | p95 ≤ 40 ms | 16.8 ms |
| Decoded geometry + animation proxy | ≤ 24 MB | 548,976 bytes |
| Athlete materials | ≤ 6 | 6 |
| Responsive horizontal overflow | 0 px | 0 px at 390×844, 768×1024, and 1440×1000 |

These are Stage 2 desktop/browser budgets. They do not qualify a physical mobile device, native shell, signing, distribution, deployment, or store submission.
