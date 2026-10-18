# Direction C representative athlete

Direction C Stage 2 integrates one original, stylized-realistic free-kick athlete through the merged local glTF pipeline. It is a bounded vertical slice, not a character-library migration. The imported v42 Canvas game, procedural Three.js rigs for every other actor and activity, physics, scoring, learning, profiles, local storage, and offline packaging remain canonical.

## Activation and fallback

The athlete is default-off and loads only for the side-view Free Kick when the local QA/runtime flag `?renderer=direction-c` is present. There is no player-facing renderer chooser or athlete-dimensions panel. Classic Canvas, WebGL failure, `quality=low`, constrained-device, and absent-flag paths keep the existing renderer. Reduced motion keeps the athlete visible but freezes looping motion to bounded representative poses. The lifecycle pause owner freezes the local animation clock, and replay uses the existing recorded Kick snapshots and replay-speed value.

The only runtime asset request is the same-origin repository path `assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb`. The manifest forbids external URIs. No runtime telemetry, upload, cloud processing, likeness, or external request exists. Version 1 remains in the repository as the PR #26 comparison/reference asset; it is no longer selected by the Direction C runtime.

## Authored contract

- source: repository-owned Blender file and deterministic Blender Python generator, using only MPFB 2.0.18 bundled core plus the official MakeHuman system-pack CC0 sportsuit, shoes, short hair, low-poly eyes, and young African skin assets;
- shared animation contract: the seven Direction C clips and three contact markers are preserved on MPFB's 53-bone `game_engine` rig; the version 1 to MPFB mapping is recorded in `makehuman-athlete-qualification.md`;
- clips: `Ready`, `RunUp`, `Plant`, `Strike`, `FollowThrough`, `Celebrate`, and `Recovery`;
- contact: `StrikeContact_R` reaches `BallContactTarget` at 0.4 seconds in `Strike`;
- plant: `PlantContact_L` stays fixed from late `Plant` through `Strike` and the opening `FollowThrough` pose;
- surface: 26,502 triangles, four local materials, one 256×256 embedded skin texture, zero glTF errors, and zero glTF warnings;
- visual target: an adult-proportioned, football-readable Direction C athlete with fitted training kit, short hair, and a clear plant/strike silhouette. It is a fictional local derivative, not a real-person likeness.

## Pass/fail budgets

| Gate | Pass budget | Current deterministic value |
|---|---:|---:|
| Athlete GLB | ≤ 2.5 MB; hard stop at 4 MB | 1,328,424 bytes |
| Full local first-play payload | ≤ 8 MB | 2,992,652 bytes |
| Strike contact drift | ≤ 10 mm; hard stop at 20 mm | 0.00023 mm source validation |
| Plant-foot ground offset | ≤ 10 mm | 0.0221 mm source validation |
| Desktop frame pacing | p95 ≤ 20 ms | 16.8 ms |
| Tablet/mobile frame pacing | p95 ≤ 40 ms | 16.8 ms |
| Decoded geometry + animation + texture proxy | ≤ 24 MB | 1,282,948 bytes |
| Athlete materials | ≤ 6 | 4 |
| Responsive horizontal overflow | 0 px | 0 px at 390×844, 768×1024, and 1440×1000 |

These are Stage 2 desktop/browser budgets. They do not qualify a physical mobile device, native shell, signing, distribution, deployment, or store submission.
