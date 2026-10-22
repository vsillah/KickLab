# Race expansion prototype

`raceExpansion=prototype` activates on the existing trusted Race origins only. The unflagged game keeps its original challenge, progression, telemetry, storage keys, and 3D route. Endurance / Heat Management is a declared extension point; it is unavailable in the selector.

## Ownership and lifecycle

`src/shared/race-modes.js` owns mode definitions, normalized profile-local score records, per-run measures, and pass/score rules. `Race` owns the existing `grid → count → run → done/crashed → retry` lifecycle, physics input, and result surfaces. Pause and background cancellation remain with the existing global owners. One mode attempt is created at reset, measured only in `run`, and recorded only on a passing personal best. Legacy `best.lap` and `raceProgression` are not advanced by expansion attempts.

| Format | Route and finish | Main measures | Pass rule |
| --- | --- | --- | --- |
| Drag Sprint | 240 m straight, crossing at x=240 | Elapsed time, trap speed, gear shifts, launch slip, NOS use, peak heat | At most 19 s and at least 95 km/h |
| Drift Trial | Existing Highland bend and exit | Controlled angle at speed on the line, drift time, spin and off-line loss | At least 150 net points, no spin |
| Circuit Laps | Closed oval, two forward start/finish crossings after reaching the far side | Lap count, individual lap times, consistency, slide time | Two laps in at most 90 s with less than 2 s sliding |
| Time Attack / Hill Climb | Existing Highland switchback with canonical grade | Elapsed time, slide time, off-line loss | At most 20 s and less than 0.5 s sliding |

The oval path uses the same `RACE_SYSTEMS.step` dynamics as other routes. Lap credit requires forward angular progress, the far-side arming sector, the start/finish sector, road proximity, and at least eight seconds since the prior crossing. A reset starts a new attempt; it never teleports the car between laps.

## Vehicle catalog seam

`src/shared/race-vehicle-catalog.js` is a version 1, JSDoc-typed compatibility fixture for Makeda's roster. Stable catalog IDs are `kestrel`, `cobalt`, and `aegis`. `legacyBodyId` maps them to the current Garage's `kart`, `street`, and `race` keys until the roster UI is integrated. The fixture owns no new vehicle asset. Its `assetUrl` field is provider-neutral; Cobalt points to the existing Direction A asset. The current in-play model remains Direction A for every body pending roster asset integration. Missing catalog IDs fall back to Cobalt.

Mass, drive force, top speed, wheelbase, grip, rolling loss, steering response, slide recovery, brake heat and recovery, and downforce flow into the canonical Race parameters when the flag is active. Existing Garage suspension, tires, and brakes continue to combine with them. Every vehicle can enter every mode. The following are suitability readings, not locks:

| Vehicle | Drag | Drift | Circuit | Hill |
| --- | --- | --- | --- | --- |
| Kestrel | Light launch, lower trap ceiling | Quick rotation, less grip | Low mass, lower straight speed | Quick climb, early braking |
| Cobalt | Balanced traction and speed | Stable line and recovery | Consistent baseline | Predictable braking and climb |
| Aegis | Strong power and trap speed, launch slip | Fast but more demanding to recover | High pace with heat and rolling cost | Fast approach, greater brake demand |

Coach Nia's setup panel gives the target, active vehicle fit, and Garage tradeoffs. The live cue reports the mode's current measure and a short driving instruction. The result compares measured performance with the pass rule, recommends a relevant Garage category, and offers retry. The Garage owns mode selection and continues to expose canonical tuning effects. Classic/Analog and steering choice are available before the attempt starts.

Drag uses four acceleration bands. Its Shift button remains available as the telemetry gauge changes; shifting too early reduces acceleration and the result records the penalty. The NOS gauge retains its bounded pulse. Both controls use the same shift action and canonical vehicle dynamics.

## Validation gate

Run `npm run check` and `node scripts/qa-race-modes.mjs <local-url> <output-folder>`. The QA script captures setup screenshots at 390×844, 768×1024, and 1440×900, plus Classic and Analog play clips for all four modes. It fails on script errors, horizontal overflow, or external runtime requests. Compile the clips with `python3 scripts/compile-race-modes-video.py <output-folder>` and inspect the final MP4. Separately verify unflagged Race, a no-WebGL Canvas run, and profile switching before PR review. A fixture simulation proves all four routes can finish with canonical physics, including real two-lap Circuit timing.
