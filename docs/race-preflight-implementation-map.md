# Race preparation journey implementation map

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
