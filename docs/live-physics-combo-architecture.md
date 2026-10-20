# Live Physics Combo architecture

## Source and scope

- Base commit: `e95f3475083965e78ded28f64904a2fcfc68bdbb`
- Branch: `codex/kicklab-live-physics-combo`
- Activation: query flag `livePhysicsCombo=1` or the equivalent renderer flag. The default is off.
- Demonstrations: Fight punch exchange, Race corner entry, and Kick free-kick run-up/strike.

## Existing ownership map

| Concern | Existing owner | Combo integration rule |
| --- | --- | --- |
| Bounded physics variables | `Fight.vars()`, `Race.vars()`, `Kick.vars()` | Resolve variables only through `activeVariableProfile()` and write back to the existing `M.V` values. |
| Activity-specific variable sets | `ACTIVE_VARIABLE_PROFILES` in `src/game/41-ui.js` | Reuse the active profile; the combo configuration names only ordered IDs from that profile. |
| Six notched choices | `KickLabGameCore.sliderSlotsModel()` | Render the same six values and Coach target states; no precision slider is introduced. |
| Coach recommendation ranges | each mode's existing `suggest()` plus the existing outcome equations | Build one coherent pair before the action reaches contact: Fight must satisfy reaction/armor when possible, Race maximizes the bounded Coach grip/radius limit while leaving braking and steering in charge, and Kick must clear the wall with margin and remain under the bar. |
| Control semantics | `KickLabGameCore.resolveControlMapping()` and the Classic/Analog input adapters | Route Classic, pointer, touch, keyboard, and Analog/gesture actions through one dispatch seam. |
| Real-time/game-time pacing | `E.slow` and the main animation loop | Keep requestAnimationFrame and real-time response timing live while applying a bounded game-time scale. Never claim a pause owner. |
| READY/countdown/GO | `PACE_SEQUENCE` / `transition` pause owner | A combo cannot start while pacing owns the stage. Any later non-transition pause claim cancels the combo deterministically. |
| Settings, drawers, profile, manual pause | `PAUSE_OWNERS` | These owners cancel the combo, retain their normal pause semantics, and restore no combo state. |
| Lifecycle suspension | `mobile-lifecycle` plus `document-hidden` | Held inputs release first; the pause claim then cancels the combo and removes its overlay/time scale. |
| Results, replay, cinematic | `results`, `RP`, and `CINE` | A combo is ineligible in these states. Replay/mode changes explicitly cancel it. |
| Transient coach copy | `COACH` | While the combo is active, the combo overlay exclusively presents the existing Coach Tomi identity and recommendation. Background coach rotation is suppressed. |
| Persistence | profile/progress stores, including `impactlab.v1` and `impactlab.nick` | The combo never writes storage directly. Normal existing outcome/scoring paths remain the only persistence writers. |

## State and resolution contract

`idle -> active -> (locked -> active)* -> resolved`

- One variable is active at a time.
- A correct choice is inside the current recommendation band. It is written through the existing bounded variable definition, locked, and followed by the next configured variable.
- An incorrect choice is still written through the same bounded input, then resolves the sequence as a failure.
- Timeout writes a deterministic weak/miss-oriented choice from the same six bounded values, then resolves as a failure.
- Success, incorrect choice, and timeout all remove combo ownership, restore full game speed, and let the already-started action finish through existing physics/scoring code.
- Fight mass changes recalculate the live fist speed and dodge decision before impact. Kick speed changes update the in-progress run-up before contact. Race continues reading its existing live `P()` values on every integration step.
- A correct Kick pair is solved jointly rather than accepting two independently valid bands. The extra clearance margin accounts for the existing wall collision plane just before the nominal wall-distance sample.
- The Race proof uses the existing Autopilot steering option and a bounded player brake pulse before corner entry. The combo does not set vehicle position, speed, line, finish state, score, or result.
- Cancellation removes the overlay and combo time scale without manufacturing an outcome. It occurs for mode changes, replay, results, pause/settings/detail/profile ownership, lifecycle suspension, document hiding, or source-context mismatch.

## Signature triggers

- Fight: the player's punch begins through the existing action path, then the combo owns the slowed exchange before contact.
- Race: the combo begins on the existing straight-to-corner zone transition while the car continues moving.
- Kick: the existing free-kick run-up begins, then the combo owns the slowed approach before boot contact.

## Flag-off compatibility

When disabled, the shared dispatch calls the original `M.press()` directly, the Race corner keeps its existing `startSlow()` call, no combo DOM is shown, no combo timers run, and no physics or storage value is changed by the prototype.
