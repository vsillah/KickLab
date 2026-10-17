# Avatar, Kit, and Telemetry Implementation Map

## Baseline audit

- `src/game/04-body-rig.js` is the shared articulated 2D side-view rig used by Fight and Kick fallback scenes.
- `src/game/32-soccer-3d-modes.js` owns the field-space pose model for dribbling, passing, free-kick walls, goalkeepers, and live-match actors. Its canvas figure is the WebGL-disabled fallback.
- `src/game/50-renderer-3d.js` projects the same field-space joints into reusable Three.js meshes. Geometry is created once per rig and repositioned each frame.
- `src/game/31-soccer-data.js` owns the player archetypes and delegates kit equations to the DOM-free shared core.
- `src/game/52-leaderboard.js` owns the Kit Room presentation. It now renders before-to-after values from the same canonical kit snapshot used by gameplay.
- `src/game/10-fight.js`, `src/game/20-race.js`, and `src/game/30-kick-sideview.js` own the mode-specific action timing and poses. Canonical equations remain unchanged.

## Canonical flow

`src/shared/game-core.js` is the source for:

1. stylized, non-biometric player appearance descriptors;
2. kit option descriptors and safe selection normalization;
3. ball, boot, sole/stud, and goalkeeper-glove appearance;
4. shot, touch, reach, grip, spin, skill timing, drag, bounce, pressure, mass, radius, and area calculations.

The browser wrappers in `31-soccer-data.js` pass the active temperature, pitch, air density, air-drag state, and base shot speed into that shared model. Gameplay, renderer appearance, and Kit Room telemetry therefore consume the same normalized selection and formulas.

## Render map

- Fight: eased punch articulation plus the shared face, hair, torso, joint, and shoe details.
- Race: the existing car physics and steering remain canonical; the cockpit now shows a readable driver whose hands track the real steering input.
- Kick 2D: archetype height/build, face/hair, jersey accent, boot profile, studs/tread, goalkeeper gloves, ball size, pressure shape, and surface pattern.
- Kick 3D: cached head/face/hair parts, jersey accent, boots/soles/studs, glove color, and two cached ball materials. Player geometry and materials are reused; the render loop only updates transforms, colors, visibility, and the active cached ball texture.

## Performance and fallback gates

- No new Three.js geometry is allocated in the normal frame loop.
- The two ball textures are created once during renderer initialization.
- A unit performance assertion bounds 20,000 canonical kit snapshots to 500 ms on the test host.
- When WebGL is unavailable, `V3.want()` remains false and the existing canvas fallback draws the same canonical appearance and kit descriptors.
- `impactlab.v1`, `impactlab.nick`, keyboard/touch controls, and the deterministic game equations are unchanged.
