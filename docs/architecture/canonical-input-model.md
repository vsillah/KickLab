# Canonical input model

This prototype keeps KickLab's classic D-pad and action buttons mounted and unchanged. The **Try analog controls** toggle only swaps the visible controller surface for the current page session. It writes no new storage keys and does not change `impactlab.v1` or `impactlab.nick`.

## Model

- The left thumbstick reports normalized `x`, `y`, radial `magnitude`, raw magnitude, and angle. A 16% radial dead zone prevents drift. The remaining range is normalized to 0–1 and passed through a 1.45 sensitivity curve. Releasing, cancelling, losing capture/focus, hiding the document, resizing, or rotating returns the stick to center and releases every held game action.
- The right action surface uses elapsed hold time plus the distance the thumb travels across the surface. It does not read hardware pressure. Its power states are Early (below 52%), Target (52–80%), Perfect (64–70%), and Overcharge (90%+). Perfect intentionally sits inside the wider target band.
- The action surface executes charge-sensitive actions on release. The ring itself grows brighter and stronger while held. Entering the target band emits a short haptic cue and a perfect release emits a distinct cue when `navigator.vibrate` exists. The same state is always shown through text, color, ring progress, and labels when haptics are unavailable.
- Spin comes from the signed horizontal direction, path curvature, and path velocity of the pre-release slide. A second pointer is rejected rather than merging two touches.
- Keyboard and mouse remain first-class: arrows drive the thumbstick; Space or Enter holds/releases the action surface; Escape cancels. The classic controls remain one toggle away.

## Data-driven mappings

| State | Stick X | Stick Y | Action surface |
| --- | --- | --- | --- |
| Fight | block/ready | duck/rise | selected punch, released in the power band |
| Race | graded steering | graded brake/throttle | continuous throttle surface, release ends throttle |
| Free kick | backspin/topspin | launch angle | kick power; curved slide sets Magnus spin |
| Header | header direction | jump strength | contact timing and power |
| Dribble/run | feint/steer | slow/sprint | cut or shoot |
| Passing | teammate/aim direction | pass lead | pass power |
| Goalkeeper | shuffle/dive direction | line depth/high dive | set/save timing |
| Give-and-go | steer/aim | slow/sprint | pass, volley, or finish |

Mappings are immutable records in `KickLabGameCore.CONTROL_MAPPINGS` and are resolved from current mode, Kick activity, and live sub-state. The UI reads the current primary action and its disabled state from the existing game action model, so the prototype cannot silently enable a move that the classic controller disables.

## Integration assumptions and limits

- Race consumes true analog steering, throttle, and brake magnitudes. Existing keyboard and classic button inputs keep their binary behavior.
- Free kick, header, shot, and pass power are translated into the existing bounded physics variables immediately before release. Spin is translated only where the current activity exposes spin, curl, or direction.
- Fight timing still uses the existing punch meter. The gesture ring gives a release target and does not replace the fight simulation's established timing calculation.
- Browser vibration is optional and may be disabled by the device, browser, user settings, or reduced platform capability. Gameplay never depends on it.
- No native shell, provider, account, deployment, signing, or store behavior is introduced by this prototype.
