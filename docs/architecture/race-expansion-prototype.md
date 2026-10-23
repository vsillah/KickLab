# Race expansion prototype

`raceExpansion=prototype` activates on the existing trusted Race origins only. The unflagged game keeps its original challenge, progression, telemetry, storage keys, and 3D route. Endurance / Heat Management is the fifth selectable prototype format.

## Ownership and lifecycle

`src/shared/race-modes.js` owns mode definitions, normalized profile-local score records, per-run measures, and pass/score rules. `Race` owns the existing `grid → count → run → done/crashed → retry` lifecycle, physics input, and result surfaces. Pause and background cancellation remain with the existing global owners. One mode attempt is created at reset, measured only in `run`, and recorded only on a passing personal best. Legacy `best.lap` and `raceProgression` are not advanced by expansion attempts.

| Format | Route and finish | Main measures | Pass rule |
| --- | --- | --- | --- |
| Drag Sprint | 240 m straight, crossing at x=240 | Elapsed time, trap speed, gear shifts, launch slip, NOS use, peak heat | At most 19 s and at least 95 km/h |
| Drift Trial | 90 m acceleration straight, left 28 m radius curve, 64 m recovery straight, right 28 m radius curve, exit and finish at x=215 | Controlled angle and points in each curve, drift time, spin and off-line loss | At least 150 net points with 50 in each curve, no spin |
| Circuit Laps | Closed oval, two forward start/finish crossings after reaching the far side | Lap count, individual lap times, consistency, slide time | Two laps in at most 90 s with less than 2 s sliding |
| Time Attack / Hill Climb | Existing Highland switchback with canonical grade | Elapsed time, slide time, off-line loss | At most 20 s and less than 0.5 s sliding |
| Endurance / Heat Management | Three forward, on-road crossings of the 1,068 m capsule | Lap times, 90–120 km/h straight pace, spread, peak engine heat, critical heat seconds, slide and off-line time | Three laps within 145 s, at least 12 s in the straight pace band, spread at most 8 s, slide below 2 s, peak heat below 95%, critical heat at most 3 s |

Circuit keeps its existing oval. Endurance uses two 220 m straights and 100 m radius semicircles. Both routes use `RACE_SYSTEMS.step`. Endurance lap credit requires a forward paved crossing after reaching the far side and at least 20 seconds since the prior crossing. A reset starts a new attempt; it never teleports the car between laps.

Endurance keeps the telemetry heat state across laps. Its throttle heat load is 1.05 times baseline, and airflow cooling rises with actual speed. Power fades continuously as heat rises and returns after cooling. An Endurance-only drive limit caps engine force to the tire grip left after the requested cornering force; excess speed or hard braking can still break traction. Garage tires, brakes, suspension and vehicle traits continue to affect the car, so Kestrel with wide tires, balanced Cobalt, and Aegis with endurance brakes have different pace and grip costs. Coach Nia previews all three, reports measured laps and heat live, then compares the result with the targets. A forward third crossing starts a 2.4-second paved coast before the result card appears.

Drag continues straight along the paved runoff after the trap; its result coast cannot change lanes or leave the road. Drift route centerline, physics projection, track mesh, Canvas fallback, and finish gate share the same two-curve geometry. The Drift road now extends to x=440, well past the x=215 finish. Both modes require a forward, on-road finish crossing. Their result panel waits for a 2.4-second paved coast, while measurement stops at the finish. Coach Nia calls for about 38 km/h at each curve and recovery before the second.

The start gantry shows one red, then yellow, then green lamp; its bulb faces disappear at GO so they do not fill the chase camera as the car passes. Steering, gas, brake, shift, and NOS are held inactive through the countdown; the run and clock start after green. Drag speed cues are tied to the vehicle and track: roadside reflectors pass at fixed world positions, muted roadside streaks rise with speed, and the chase camera uses a bounded field-of-view and vibration change. Reduced-motion preference disables streaks and camera motion. These cues use pooled geometry and do not alter scoring or vehicle physics. The existing engine-heat visual remains outside this pass.

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

Run `npm run check`, `node scripts/qa-race-modes.mjs <local-url> <output-folder>`, and `node scripts/qa-race-endurance.mjs <local-url> <output-folder> <width>x<height>`. The first QA script captures mode setup at 360×780, 390×844, 768×1024, 1113×988 and 1440×1000, plus Classic and Analog play clips. The Endurance script records a real three-lap Simulator run with measured hot and cooled states, a valid finish coast, and a passing Coach result, then encodes H.264. Both reject runtime errors and external requests. Also verify unflagged Race, Canvas, profile switching, pause, and input lifecycle before PR review. Shared-model fixtures prove all five routes can finish through canonical physics.

For the Drag and Drift follow-up, run `node scripts/qa-race-route-followup.mjs <local-url> <output-folder>` against the exact built commit, then `python3 scripts/compile-race-route-followup-video.py <output-folder>`. The browser report asserts red → yellow → green with a still car and blocked input, a passing Drag trap and paved coast before its delayed result in Classic and Analog, and passing Drift runs through both scored curves, the recovery straight, legitimate finish, and long paved runoff at desktop and phone widths. Screenshots cover the lights, speed, curves, crossing, coast, and result. Run `--reduced` for the reduced-motion camera and streak assertion. The run fails on page errors, external requests, horizontal overflow, missed curve credit, off-road finish, premature result, or a failed result.
