# Race engine feedback implementation map

Base: `e3c305b050b4b3b6166be1589f093386dbfd84e0`. Branch: `codex/kicklab-race-engine-feedback`.

- `19a-race-telemetry.js` owns transient engine heat, recoverable overheat, gauge selection, and the thermal cue. It does not write storage.
- `20-race.js` owns canonical Race input and step sequencing, the existing power multiplier, Coach transitions, scoring, and Canvas fallback.
- `21-race-3d.js` owns the local vehicle, camera, exhaust and particle pool. It advances effects only for active Race rendering.
- `63-race-telemetry-ui.js`, `src/index.html`, and `src/styles.css` own the shared Classic/Analog telemetry and wraparound cockpit. `reduce` and CSS media queries own reduced motion.
- `55-analog-gesture-controls.js`, `56-mobile-lifecycle.js`, and `60-pause-replay.js` own input variants and cancellation. This change does not alter their contracts.

Plan: derive named thermal stages and a bounded, recoverable power factor from existing transient heat; show an always-readable temperature arc in the existing cockpit; replace the engine orb with local exhaust shimmer and engine-bay vapor only at critical heat; add subtle car and camera vibration only while running and motion is allowed; give Coach Nia distinct warning, critical, and recovery language. Validate all Race modes, vehicles, viewports, controls, fallback, lifecycle, frame pacing, storage and network silence against the exact head.
