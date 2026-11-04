# Lifelike free-kick POC

This proof of concept is a default-off, side-view-only renderer layer. The shipped behavior stays on the current Canvas athlete unless the local URL explicitly includes `kicklabPoc=1&kicklabCharacter=full` or `kicklabPoc=1&kicklabCharacter=reduced`.

## Provenance and privacy

- The athlete is self-authored procedural Canvas geometry. It reads KickLab's shared side-view joint schema, but owns a separate volumetric appearance renderer and does not call `RIG.side` for its primary body.
- The seven clips are code-authored joint poses: ready, approach, plant, strike, follow-through, recover, and celebration.
- The full/reduced character visibly models a shaded face and head, neck, shoulder/chest and pelvis volumes, two-segment limbs, ankle joints, heel/toe boot geometry, soles, and studs. A POC-only mechanics lens makes the planted and striking feet readable in the normal side camera and at mobile width.
- There are no photos, scans, likeness references, biometrics, model files, textures, third-party assets, runtime fetches, CDNs, telemetry, or uploads.
- Renderer selection is URL/runtime state only. It does not read or write `impactlab.v1`, `impactlab.nick`, or profile storage.

## Modes and rollback

- `canvas`: the unchanged current athlete and renderer; this is the default and rollback path.
- `full`: volumetric procedural rendering, joint interpolation, two-bone IK, semantic animation events, motion accents, and physics-owned contact.
- `reduced`: the same improved body and semantic states using deterministic endpoint poses without the full-mode motion accents. A system reduced-motion preference automatically converts a requested `full` mode to `reduced`.

The optional proof-of-concept control appears only when `kicklabPoc` is present in the URL. It changes no saved settings.

## Geometry contract

- Plant-foot drift: at most 0.02 m.
- Boot-to-ball contact error: at most 0.03 m and synchronized to the existing physics contact transition.
- Ground penetration: at most 0.01 m.
- Added compressed character/clips/textures: zero binary asset bytes; the implementation is source code only.
- Added runtime memory budget: below 120 MiB; browser QA records the measured delta when available.

The physics engine remains authoritative. The renderer observes `Kick.state`, `Kick.phi`, `Kick.contact`, `Kick.flightT`, and the ball position; it does not change launch speed, angle, gravity, scoring, or storage.
