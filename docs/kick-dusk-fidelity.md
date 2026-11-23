# Kick stadium fidelity experiment: day, dusk and night

Status: draft PR, default off, not qualified for merge. Needs validation on real GPUs and phones before anyone turns it on.

## What it is

An opt-in look for the Kick lab's 3D stadium at the home ground, in three versions: "Clear afternoon", "Dusk kickoff, lights just on" and "Night under the lights". Open the game with `?kickFidelity=day`, `dusk`, `night`, or a comma list such as `?kickFidelity=day,dusk,night`. Each name switches the look on for that time of day only. Without the parameter nothing is built, nothing is allocated, and the renderer draws exactly as before.

All versions share the pitch, crowd, lens and fallback ladder. They differ in one parameter set (`LOOKS` in the module): the sky, the shadow-casting light, floodlight strength, haze and bloom.

| | Day | Dusk | Night |
| --- | --- | --- | --- |
| Sky | Deep blue paling to a hazy horizon, sun halo, fair-weather cloud | Warm toward the sun, pink arch and blue-grey band away from it, lit cloud | Near-black blue, faint town glow on the horizon, thin cloud lit from below |
| Shadow-casting light | Afternoon sun on today's bearing, 27 degrees up, so the near stand roof shadows the touchline side | Low warm sun, 15 degrees up, so stand roofs shadow the pitch | One floodlight tower |
| Floodlights | Off; one soft contact shadow per figure | Four cool fills, faint four-way shadows | Three strong fills plus the tower above, so each figure throws a clear four-shadow star |
| Haze and bloom | Light blue aerial haze, bloom on sun glints only | Warm toward the sun | Cool and thinner, stronger bloom on the lamps |

All of it lives in `src/game/50e-kick-fidelity.js`, plus three one-line hooks in `src/game/50-renderer-3d.js` (end of `init()`, after `setSky()` in `render()`, and in place of the final `R.render`).

| Pass | What changed with the flag on |
| --- | --- |
| Light and sky | Analytic dusk sky (backdrop and a PMREM reflection map from the same function), low warm sun on the existing compass bearing, four cool floodlight fills, stand roofs now shadow the pitch, soft four-way floodlight shadows under every figure and the ball |
| Pitch and goal | Mown bands that brighten or darken with the camera's angle to the blade lean, broken tiling, worn goalmouth, spots and touchlines, lit pitch lines, a finer net. Grass, turf and wet each keep a distinct look |
| Crowd and bowl | About 2,200 instanced supporters in sectioned colour blocks (one draw call per stand), seat backs for the added seats, a goal reaction that is off under reduced motion |
| Lens | One hand-written post pass on core render targets: bloom from bright sources only, depth-based haze that warms toward the sun, vignette, static grain (off under reduced motion) |

Not built yet: the players pass (the GLB athlete as default is a separate change), ball seams, grass blades near the camera, LED glow on the turf, depth of field and new replay cameras, visible floodlight shafts (tried as cone meshes for night and removed because the geometry showed).

## Boundaries

- Draw-only. The module reads `Kick.opt`, the camera, and the positions of rigs the renderer already placed. It does not write to `Kick`, `Drib`, `E`, `best` or storage.
- Its own seeded generator and hash noise. It never calls `Math.random`, so gameplay randomness is undisturbed.
- Active only for the `home` venue at a time of day named in the flag. Any other venue or time restores today's scene.
- `dispose()` and the venue/time guard put every touched material, light, shadow setting and scene property back, then ask the renderer to rebuild its own sky.
- Any error inside the module turns it off for the session and records the reason on `window.__KICKLAB_KICK_FIDELITY_AUDIT__`.
- No new files in the package, no new dependencies, no change to the vendored Three.js bundle, no network requests.

## Fallback ladder

The module watches frame intervals. When the 95th percentile stays above 24 ms (40 ms at phone widths) for two seconds, it steps down:

1. Render at 82% resolution.
2. Render at 70% resolution.
3. Half the crowd and a 1024 sun shadow map. Devices reporting under 4 GB memory or under 4 cores start here.
4. Skip the post pass.
5. Turn the experiment off and restore today's scene.

Difference from the brief: there is no "contact shadows only" step. Turning the sun shadow off forces a shader recompile, which would hitch play, so the ladder shrinks the shadow map instead. `?kickFidelityLadder=off` freezes the ladder for captures.

## Review states

`?kickReview=K1` to `K6` is a dev-only hook that works with the flag on or off. It exposes `window.__KICKLAB_KICK_REVIEW__.capture()` (PNG of the 3D canvas) and `.digest()` (scene-state summary).

| State | Frame |
| --- | --- |
| K1 | Free kick side view with the predicted arc (default camera) |
| K2 | 1v1 dribble chase camera (default camera) |
| K3 | From the goal looking back up the pitch toward the sun |
| K4 | Behind the net |
| K5 | Grazing macro at the ball |
| K6 | K2 at a 390 px phone viewport |

These fix the camera, venue, time and seed. They do not freeze the game's idle animation, so two captures of the same state are not pixel-identical.

## How to check it

```
npm run build
python3 -m http.server 4173 -d dist
node scripts/qa-kick-fidelity.mjs http://127.0.0.1:4173/kicklab.html qa-artifacts/kick-fidelity --time=dusk
node scripts/qa-kick-fidelity.mjs http://127.0.0.1:4173/kicklab.html qa-artifacts/kick-fidelity-night --time=night
node scripts/qa-kick-fidelity.mjs http://127.0.0.1:4173/kicklab.html qa-artifacts/kick-fidelity-day --time=day
```

Add `--software-gl` on a machine with no GPU. The script captures all six states with the flag on and off, checks that the look follows a switch to another enabled time of day, proves the scene digest is identical after leaving for a time that is not enabled, plays one seeded free kick with the flag on and off and compares the result card, and fails on any page error or external request.

## What has and has not been verified

Verified in headless Chrome with software rendering (no GPU): the build and `npm run check`; activation only with the flag; the look following a switch between enabled times of day and the scene digest identical after leaving for one that is not enabled; identical seeded free-kick outcome with the flag on and off; no page errors or external requests; the GLB athlete (`?renderer=direction-c`) renders with the experiment on.

Not verified, and required before merge: frame time and memory on any real GPU, phone or tablet; the fallback ladder under real load; overlay contrast measurements for K1 and K6; outcome parity for activities other than the free kick; the iOS and Android shells.

## Provenance

Every texture, shader and mesh is generated in this file at load from arithmetic and a seeded generator. No reference to any real club, league, broadcaster, kit or player. Crowd colours are invented blocks.
