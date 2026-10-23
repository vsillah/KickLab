# Race simulator controls prototype

This lane starts from `e19c63112d1c39417bb648eddc2cad05bb30ff9e`. It is available only on a trusted origin with both `raceExpansion=prototype` and `raceSimulator=prototype`. Classic remains the default. The Endurance extension point is unchanged.

## Input ownership

- `55a-race-simulator-controls.js` owns transient permission, calibration, touch, launch, and visual state. It sends pedal and handbrake actions through `gameInput` and `Race.press`. Device orientation changes only `Race.wheel` through the existing steering branch in `Race.update`.
- `race-simulator.js` holds pure angle and gesture transforms for deterministic tests. Portrait uses gamma; landscape uses beta with orientation sign. The player can recenter and adjust a dead zone and sensitivity. These settings and raw readings are not persisted.
- The existing `RACE_SYSTEMS.step` remains the only expanded vehicle physics step. Drag paddle timing extends the existing `RACE_MODES` gear state, efficiency curve, and shift power interruption. Simulator strict timing adds early and late penalties. Other control modes retain the prior shift timing.
- A brake hold and three throttle taps arm launch. A held throttle and quick brake release near green send the ordinary gas input, which lets the canonical traction and launch-slip model decide wheelspin. A downward handbrake pull requests canonical drift; an upward NOS flick applies the existing telemetry NOS action. No pinch gesture is bound, to avoid conflict with page zoom and steering.

## Fail closed behavior

Permission is requested only when **Enable tilt** is pressed. Denial or missing orientation APIs leave the Classic and Analog buttons available in the simulator panel. Pause, background, focus loss, page hide, mode navigation, and orientation change clear held inputs and calibration. Re-enable tilt and recenter after interruption. The QA hook is exposed only under the two trusted-origin flags and accepts synthetic orientation events; it is evidence for mapping and lifecycle, not for iPhone or iPad hardware qualification.

## Review gates

`npm run check` covers the build and shared regressions. `scripts/qa-race-simulator.mjs` captures five responsive widths and records overflow, storage keys, runtime errors, and external requests. Real-device Safari permission, orientation accuracy, touch coexistence, and haptics still require an iPhone and iPad run. This draft must not be merged or deployed before Captain review and the client-facing Human QA walkthrough.
