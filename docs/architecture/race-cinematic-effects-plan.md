# Race cinematic vehicle effects plan

Base: `b85f7ce80deb8add45ddd658f67b2ef74be76363` (merged PR #60). Branch: `codex/kicklab-race-cinematic-effects`. The worktree was clean; open PRs had no Race file overlap at the preflight.

## Ownership map

- `19-race-systems.js` owns canonical motion, grip, `launchSlip`, `driftMode`, `slipAngle`, and `nitroActive`. Effects must read these fields and never alter them.
- `19a-race-telemetry.js` owns heat, `thermalStage`, and the NOS pulse. An active flame requires both the pulse and `nitroActive` so it represents delivered boost.
- `20-race.js` owns the existing result paths: legacy `chPass`, expanded mode `modeOutcome.pass`, and progression `progressionOutcome.pass`. A cutaway starts from a passed result without awarding or saving anything.
- `21-race-3d.js` owns vehicle loading, wheel pivots, chase camera, and current telemetry visuals. Add pooled local effects here and clear them on reset, hide, vehicle change, and fallback.
- `RACE_SYSTEMS.CONTRACT` gives wheel pivots and named exhaust/tire effect markers. The roster has Kestrel, Cobalt, and Aegis with different dimensions; bind emitters to each loaded vehicle's markers when present, with contract-relative fallback only.
- `Race.drawStructuralCanvas` retains gameplay and readable telemetry if WebGL is unavailable. Reduced motion keeps information while suppressing camera shake, flashing, and dense particles.

## Five phases and gates

1. Map the base and run baseline checks. Confirm no ownership overlap. **Gate:** fixed source map and exact base.
2. Replace the glow/orb exhaust with tailpipe vapor and a short NOS ignition, sustain, decay envelope. **Gate:** no effect without the matching thermal/load/boost state.
3. Use `launchSlip`, `driftMode`, `slipAngle`, and braking to emit wheel-bound smoke and capped road-contact marks. **Gate:** no marks without slip, no floating or unbounded marks.
4. Build a brief, nonblocking local chassis cutaway triggered by the existing successful result. Emphasize the relevant subsystem for the task. **Gate:** no scoring/storage changes, clean lifecycle cancellation.
5. Qualify all vehicles, modes, viewports, controls, reduced motion, fallback, lifecycle, performance, and zero egress. Create exact-head video and browser handoff. **Gate:** draft PR for Integration Captain review; no merge or deploy.

Stop on implausible anchoring, visual obstruction, behavior regression, unstable pacing, resource growth, external requests, or evidence that cannot be tied to the exact head.
