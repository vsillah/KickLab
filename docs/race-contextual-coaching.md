# Race contextual control coaching contract

This lane is enabled only on a trusted origin with `raceExpansion=prototype`, `raceInstruments=prototype`, and `raceCoaching=prototype`. With the coaching flag absent, the existing dial and race behavior remain active without tutorial cues or profile writes.

The presentation reads canonical Race telemetry, selected action, controller style, and `Race.signatureFinish`. It never drives inputs, changes action windows, adjusts physics, or changes scoring. The dial shows compact RPM, NOS, drift, launch, and finish symbols with full accessible names. A short ghost symbol is anchored to the relevant dial or brake control during an eligible window. It does not sit over the car or roadway. Color supports, but does not carry, state.

Each local profile stores a bounded `raceControlCoach` progress record through the existing profile store. An action begins in **teach**, moves to **confirm** after a canonical success, and **retires** after two successes. Two later misses bring the cue back. Early, late, and missed outcomes are distinct history events in the existing wrench Coach disclosure. Reset, profile switch, page hide, pause, and controller cancellation remove the visible cue. The per-run history resets with the race; mastery remains profile scoped.

The trackside camera prop attaches to the finish gate outside the road. It shows restrained approach, ready, earned, and missed colors from canonical distance and finisher state. The marker has no gameplay collider and does not change the chase camera. It exists only when the coaching flag and canonical 3D finisher mode are active. Reduced motion removes the ghost animation; Canvas fallback has no 3D marker or live ghost.

The lane requires tests for default off, trusted flag binding, profile normalization, early and late shifts, success and repeated misses, reset and cancellation, controller styles, narrow and wide layouts, reduced motion, and zero external requests. Physical Pixel qualification remains a separate gate.
