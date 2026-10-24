# Race preparation journey implementation map

## Cinematic shot and state map (2026-10-24 revision)

The footage source is the local Race 3D renderer, using the same Highland course geometry and catalog GLBs as play. Media generation runs against a disposable local profile; generated clips contain no player data or network media. Each source clip is tagged by mode and vehicle. A missing or unplayable clip falls back to a local renderer frame for that exact pairing, then to its catalog image with an explicit static-preview label. Never substitute footage from another route or car.

| Phase | Shot and motion | State binding | Transition |
| --- | --- | --- | --- |
| Location | 4–7 s looping moving chase shot per five Highland routes, with route name and challenge details outside the image | Draft mode selects `straight`, `drift`, `oval`, `bend`, or long `oval` geometry. Location preview uses a declared showcase car, not an implied player selection. | Crossfade only between local route clips; reduced motion holds the first frame. |
| Vehicle | Moving rear three-quarter chase shot of Kestrel, Cobalt, or Aegis on the selected route; adjacent instrument readings are derived from the existing catalog and Garage summary | `mode × vehicle` media key, 15 valid pairs. Changing either selection changes the key and poster together. | Preserve roster focus and scroll while swapping the hero clip. |
| Tuning | The same selected car and route, with short suspension, tire, or brake emphasis and immediate physics-derived delta readouts | Only `suspension`, `tires`, and `brakes` remain editable; the body follows vehicle selection. Close-ups and heat cues are explanatory treatments of the real bound field, not new simulation controls or a claim that a pre-rendered clip shows the newly selected hardware. | Keep the current clip playing; change emphasis and numbers synchronously with the selected part. |
| Grid | Selected car approaches the selected course start, shows a short rev cue, then hands to the existing local 3D orbit and red-yellow-green lights | Commit draft once on Start heat, load the selected GLB/course, and wait for the exact asset and orbit before countdown. No match, Championship, or profile write occurs earlier. | On reduced motion or Canvas fallback, use a still and proceed through the existing safe start gate. |

Capture and playback gates: verify all five route keys and all 15 car-route keys, clip duration, playable H.264/WebM output, moving frames, visual car/route identity, local-only requests, mobile payload, narrow-phone crop, reduced motion, Canvas fallback, exact-head localhost, and the first frame after the handoff. Phone and desktop Human-QA MP4s must each show two routes, two moving cars, a real tuning delta, the selected arrival/rev, orbit, and lights.

## Source and fallback binding

- `src/media/race-preflight/manifest.json` records 15 moving car/course clips; `arrival-manifest.json` records 15 start-line approaches. Both include the renderer track key, source GLB, duration, frame count, bytes, and SHA-256 of each MP4. Cobalt is the clearly labeled showcase car in the location cards. Once a vehicle is selected, the hero, tuning, and arrival shots use that exact car/course key.
- Capture uses `scripts/generate-race-preflight-media.mjs` against a disposable localhost profile with `KICKLAB_CAPTURE_HEADFUL=1`. Its localhost-only capture hook moves each catalog GLB along the canonical 3D route points at a presentation pace and sets a rear-quarter camera; this is a route/car preview, not a scored physics run. It never changes player physics or shipped gameplay. The output is locally rendered H.264 plus an exact-frame JPEG fallback. No provider media, uploads, or remote URLs are involved.
- The location screen plays only its selected, hovered, or focused route, reducing simultaneous decode on phones. Reduced motion and Canvas fallback use the exact-key JPEG and display a still-preview label. A failed local video swaps to that poster with an explicit unavailable label.
- The tuning crop directs attention to suspension, tires, or brakes while the adjacent numbers and Coach line come from bound Garage v1 physics. The clip is a car/course preview; it does not claim to render a newly fitted part or a live heat state.
- Start heat commits the draft once, replays its arrival clip, gives a short user-gesture engine cue when audio is enabled, then reveals the selected GLB in the existing orbit before starting the existing lights. It has a bounded fallback if local video fails. The arrival shot ends in a rear-quarter pose close to the orbit's opening angle.
- `scripts/qa-race-preflight-media.mjs` checks all 30 files and the 750 KB per-clip limit. The 30 optional clips total approximately 12 MB in the offline package; the browser requests only the route previews and selected car/arrival media needed for a session.

Dependency: `5fbf901ef31bb68949a28eed5e0aab5905f832d8` on `codex/kicklab-mobile-race-cockpit`.

## Existing contracts

- `raceExpansion=prototype` on a trusted local origin exposes five Race formats. They all use the Highland venue with distinct straight, drift, oval, and bend routes. No separate weather selection exists in the simulation, so route and challenge cards must not imply different weather physics.
- The local vehicle catalog has Kestrel, Cobalt, and Aegis, each with a bundled WebP preview and GLB. The Garage body IDs are `kart`, `street`, and `race`; there is no fourth released car or ownership/locking API.
- Garage v1 binds body, suspension, tire width/profile, and brakes to Race physics. Steering and engine cooling are not independent Garage parts. The control style and steering assist are separate pre-run controls.
- `best.raceModes.selected` and `best.raceGarage` are profile-local through `saveBest`. The existing setters persist immediately. A preparation draft must use no setter until Start heat.
- `Race.reset`, the 3D orbit, `raceCoachSetupStart`, countdown input gate, and `beginRunFromReveal` own the launch. The new flow hands off through the existing start control.
- Championship fixes an event mode and gates later events. An active local match freezes its contract and excludes solo rewards. Replay/results and profile changes already have separate lifecycle handlers.

## Implementation checkpoints

1. Add a default-off trusted-origin `racePreflight=prototype` gate and a four-phase draft state model. A cancelled draft does not write profile data.
2. Show all five challenge routes as visual location cards with route traits, target, and concise Coach guidance. Championship limits selection to its committed event.
3. Show every catalog car with its bundled preview and physics-derived comparisons. Selection stays in draft until launch.
4. Tune only the four Garage v1 fields. Compare stock and draft with `KickLabRaceGarage.parameters/summary/lesson`; explain each part's fit for the selected challenge.
5. Show a clean starting grid summary, commit via existing Race setters, then use the existing launch button and countdown. Keep the original flow when the flag is absent.
6. Qualify desktop, tablet, phone, keyboard, reduced motion, Canvas fallback, profile separation, cancellation, and offline network behavior. Create exact-head MP4 and commit-bound in-app browser handoff before Human QA.

No new physics fields, venue weather, ownership state, provider calls, or solo progression writes are introduced by preparation.
