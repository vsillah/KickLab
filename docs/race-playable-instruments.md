# Race playable instruments prototype

Enable on a trusted local or Pages origin with `raceExpansion=prototype&raceInstruments=prototype`, alongside the existing Race systems, telemetry, and finish flags. The feature is off without that explicit pair.

The instruments decorate the existing controller. Gas shows canonical throttle and RPM; Drag Shift reads the canonical shift target and invokes `Race.shiftGear()`; NOS reads pressure, tank, pulse, and thermal lock and invokes `RACE_TELEMETRY.activateNos()`; Drift handbrake reads the signed vehicle slip state and holds the existing drift input. Each button has a full accessible name because the compact face can clip at phone width. Empty NOS and overheat remain visible as locked states.

Classic allows vertical pointer travel within Gas for a bounded throttle amount. Releasing or cancelling the pointer, losing focus, hiding the page, or changing orientation releases that input. Keyboard Up/Down on the focused Gas control adjusts throttle in 10% steps and releases on blur. Analog retains thumbstick driving and supports an upward Gas flick for NOS. Simulator retains its pedal, NOS, and handbrake controls. The cockpit owns the live readout in all three styles; opening the wrench tools hides the gameplay instruments until controls return.

The instrument layer owns no speed, power, grip, NOS, heat, gear, or drift simulation. It reads `Race.st`, `Race.modeAttempt`, and `Race.telemetry`, then calls the existing input methods. Strict shift quality is enabled for the instrument prototype so early, useful, and late shifts use the canonical mode scoring. Existing mode and thermal tests are the dynamics gate. Endurance heat and brake temperature remain on their existing telemetry and Math surfaces; this change does not add a second thermal model.

Review the live 3D cockpit at 360, 390, 768, 1113, and 1440 pixel widths. Check Classic, Analog, Simulator, tools open and closed, Drag Shift, NOS readiness and lock, Drift handbrake, pointer cancellation, keyboard blur, and the unflagged path. Keep production and public rollout behind their separate gates.
