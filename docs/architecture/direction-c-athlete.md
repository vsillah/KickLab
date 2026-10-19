# Direction C representative athlete

Direction C Stage 4 expands the approved local athlete across the complete eight-activity Kick family and every person shown beside the controlled player while the full renderer is active. It remains a bounded renderer layer, not a character-library migration. The imported v42 Canvas game, physics, scoring, learning, profiles, local storage, offline packaging, and Canvas/reduced-quality fallbacks remain canonical.

The match-visual-coherence slice adds an explicit camera-relative orientation contract to every activity profile. Goalward attackers face positive field X, keepers face negative field X, and both Header Duel competitors face the incoming cross at negative field X. A bounded actor pool clones the already-loaded v2 skeleton with Three.js `SkeletonUtils`; it does not request or decode another athlete asset. The pool covers defensive walls, markers, defenders, keepers, strikers, and active teammates. Each actor receives a fictional adult identity, visibly different complexion, body build and proportion, facial silhouette, self-authored procedural hairstyle, role kit, camera-relative orientation, and an activity-appropriate clip from the same approved animation set. Face changes clone and reshape only the competitor's local head vertices, then add profile-specific nose and brow geometry; hairstyles use local Three.js primitives attached to the existing head bone. The complexion palette is deliberately separated in the mapped body material so the range remains visible under stadium lighting at normal gameplay distance. The shared skeleton, contacts, animation clips, source GLB, and controlled athlete stay unchanged. Opponents never receive the controlled-player badge. The procedural rig remains the load-failure, reduced-quality, and Canvas fallback.

## Renderer scope matrix

| Lab / activity | Full renderer | Visible actor contract |
|---|---|---|
| Fight | Inactive | Canvas-only two-fighter lab; the existing player and Rex renderers remain the intentional fallback path. |
| Race | Inactive | Canvas-only solo-driver lab; there is no gameplay rival. |
| Free kick | Active | Controlled kicker plus four-person defensive wall; keeper is included when the selected scenario exposes one. |
| Header Duel | Active | Controlled header plus one marker. |
| 1v1 Dribble | Active | Controlled attacker, defender, and keeper. |
| Passing | Active | Controlled passer, two active teammates, and three defenders. |
| Combo attack | Active | Controlled attacker, teammate, defender, and keeper. |
| Goalkeeper | Active | Controlled keeper plus opposing striker. |
| Penalty shootout | Active | Controlled role switches between kicker and keeper; the other role remains an unmarked pooled competitor. |
| Crossbar | Active | Controlled attacker plus the existing keeper when that renderer path is visible. |

The controlled athlete alone carries a compact repository-rendered KickLab orbit badge: a broken cyan ring, navy center, white K, orange accent, and short pointer. The sprite follows the primary skeleton head with a protected vertical gap above the head/ball contact zone. Its target size is 46 px on desktop, 40 px on tablet, and 34 px on narrow mobile. Normal play uses a restrained two-centimeter-equivalent bob; reduced motion holds it static. Role ownership follows the active Direction C target, including attacker-to-keeper changes in Penalty shootout, while the opponent skeleton is never eligible. Physics Vision, move-log replay, cinematic replay/celebration, Canvas, reduced-quality, WebGL-failure, inactive, and renderer-hidden states suppress the badge so it cannot imply control over a recorded or fallback actor.

## Activation and fallback

The athlete is default-off and loads only when the local QA/runtime flag `?renderer=direction-c` is present. One data table resolves a named athlete, camera, contact node, and animation phase for Free kick, Header duel, 1v1 Dribble, Passing, Combo attack, Goalkeeper, Penalty shootout, and Crossbar. There is no player-facing renderer chooser or athlete-dimensions panel. Classic Canvas, WebGL failure, `quality=low`, constrained-device, and absent-flag paths keep the existing renderer. Reduced motion keeps the athlete visible but freezes looping motion to bounded representative poses. The lifecycle pause owner freezes the local animation clock, and replay uses the existing recorded Kick snapshots and replay-speed value.

The only runtime asset request is the same-origin repository path `assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb`. The manifest forbids external URIs. No runtime telemetry, upload, cloud processing, likeness, or external request exists. Version 1 remains in the repository as the PR #26 comparison/reference asset; it is no longer selected by the Direction C runtime.

## Authored contract

- source: repository-owned Blender file and deterministic Blender Python generators, using only MPFB 2.0.18 bundled core plus the official MakeHuman system-pack CC0 sportsuit, shoes, short hair, low-poly eyes, and young African skin assets; the existing sportsuit faces are locally partitioned into a navy jersey, cyan shorts, and white knee-high socks, while the existing shoes remain orange soccer boots;
- shared animation contract: the original seven Direction C clips and three markers remain unchanged on MPFB's 53-bone `game_engine` rig; nine self-authored activity clips reuse that same skeleton and existing bone/marker contacts;
- clips: `Ready`, `RunUp`, `Plant`, `Strike`, `FollowThrough`, `Celebrate`, and `Recovery`;
- contact: `StrikeContact_R` reaches `BallContactTarget` at 0.4 seconds in `Strike`;
- plant: `PlantContact_L` stays fixed from late `Plant` through `Strike` and the opening `FollowThrough` pose;
- surface: 26,502 triangles, six local materials, one 256×256 embedded skin texture, zero glTF errors, and zero glTF warnings;
- visual target: an adult-proportioned, football-readable Direction C athlete with fitted training kit, short hair, and a clear plant/strike silhouette. It is a fictional local derivative, not a real-person likeness.

## Pass/fail budgets

| Gate | Pass budget | Latest qualified value |
|---|---:|---:|
| Athlete GLB | ≤ 2.5 MB; hard stop at 4 MB | 1,643,096 bytes |
| Full local first-play payload | ≤ 8 MB | 3,358,325 bytes |
| Strike contact drift | ≤ 10 mm; hard stop at 20 mm | 0.00023 mm source validation |
| Plant-foot ground offset | ≤ 10 mm | 0.0221 mm source validation |
| Desktop frame pacing | p95 ≤ 20 ms | 9.8 ms |
| Tablet/mobile frame pacing | p95 ≤ 40 ms | 8.9 ms |
| Decoded geometry + animation + texture proxy | ≤ 24 MB | 1,367,308 bytes |
| Athlete materials | ≤ 6 | 6 |
| Responsive horizontal overflow | 0 px | 0 px at 390×844, 768×1024, and 1440×1000 |

The procedural stadium is part of the same regression gate. Every activity camera must retain the textured and marked pitch, four dimensional stands including both end returns, four roof panels, twenty roof-truss beams, four animated boards, a four-surface depth net, and shadow-casting hemisphere/directional lighting. Each stand has three local procedural supporter depth layers with deterministic kit/skin variation and four bounded, sanitized placard messages, including one made-up local profile nickname. Distance-based LOD keeps one to three layers per stand on desktop/tablet and no more than two on narrow mobile; reduced motion freezes crowd bobbing. The athlete may not be accepted against a flattened background.

Stage 4 validation is `npm run qa:multi-activity-athlete -- <local URL> <output directory>`. Its primary Human-QA URL has no forced `athletePhase`; the harness drives normal controls and asserts phase time plus root/joint motion across all eight activities at 1440×1000, 768×1024, and 390×844. It also asserts the expected competitor count and roles, unique pooled roots, distinct facial/hair/build/complexion signatures, role clips, role-kit data, marker exclusivity, active-motion freezing under lifecycle pause, and idle-loop freezing under reduced motion. The MP4 is a genuine real-time browser recording and includes team-focused gameplay views. `npm run qa:competitor-identity-diversity -- <local URL> <output directory> <revision>` captures wall, keeper/defender, teammate/defender, and keeper/teammate/defender groups at the same three widths, with a hard gate for at least four simultaneously visible identities. `npm run qa:competitor-renderer-scope -- <local URL> <output directory> <revision>` separately captures Fight and Race and proves that Direction C is not falsely activated in those Canvas-only labs. These desktop/browser gates do not qualify a physical mobile device, native shell, signing, distribution, deployment, or store submission.

Focused Header Duel validation is `npm run qa:match-visual-coherence -- <local URL> <output directory> <revision>`. It records the canonical Space → 1180 ms → Space cadence and captures ready, live X-ray, and Recovery at desktop, tablet, and mobile widths. It also asserts orientation labels, controlled-player badge ownership and responsive sizing, X-ray/replay/cinematic suppression, the shared skinned opponent, crowd depth/LOD, viewport frame pacing, reduced-motion freezing, Canvas fallback, zero runtime egress, zero page errors, and zero horizontal overflow before encoding the desktop walkthrough as H.264 MP4.
