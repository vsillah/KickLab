# Amanitore visual-fidelity bakeoff

Phase 1 is a local decision artifact. It compares three visual systems for the same side-view free-kick slice. It does not modify the KickLab runtime, choose a winner, create a provider project, or authorize implementation.

## Directions

- A · Amanitore · Matchday Truth: grounded broadcast realism with a restrained teaching layer.
- B · Imhotep · Sculpted Velocity: graphic geometry and bold motion readability.
- C · Nzinga · Kinetic Anatomy: the shared athlete rig becomes the body-mechanics teaching lens.

Each direction includes the required ready, contact/Physics Vision, and gameplay-with-controls keyframes. The page also shows the 390×844, 768×1024, and 1440×1000 control treatments side by side.

## Review route

Serve the repository root, then open:

`/design/visual-bakeoff/index.html?direction=A&state=ready&rev=<commit>`

Query values:

- `direction=A|B|C`
- `state=ready|contact|play`

## Gate

Phase 2 remains closed until Vambah explicitly selects A, B, or C. The selected prototype must reuse the existing Three.js renderer and shared rig, stay default-off, and preserve the current game, storage keys, offline behavior, reduced motion, Classic fallback, and existing 3D modes.
