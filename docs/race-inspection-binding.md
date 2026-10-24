# Race Garage inspection binding

The optional preflight Garage loads the exact locally bundled GLB for the selected Kestrel, Cobalt, or Aegis. All three files contain `Body`, `WheelFrontLeft`, `WheelFrontRight`, `WheelRearLeft`, and `WheelRearRight` nodes. Each camera anchor and cue uses the shared front-right wheel pivot at `[1.28, 0.43, 1.04]` in car-local coordinates. The source files are:

- `src/assets/3d/kicklab-race-kestrel/v1/kestrel-original.glb`
- `src/assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb`
- `src/assets/3d/kicklab-race-aegis/v1/aegis-original.glb`

No car has a separate named suspension spring, caliper, or rotor mesh. The suspension view therefore marks the wheel-well load-transfer region and moves a small indicator using the selected Garage `transfer` and `recovery` multipliers. The tire view outlines the actual wheel contact region and changes cue color with the bound tire-heat multiplier. The brake view outlines the wheel-side brake region and changes cue color with the bound brake-heat multiplier. The selected values, stock-to-tuned metrics, and Coach Nia text carry the exact physics differences. None of these cues changes the GLB's wheel width, ride height, brake geometry, or active physics.

The inspection bay owns one WebGL renderer only while the Garage phase is visible. It detaches for a same-phase DOM update, disposes geometry, materials, renderer, and context on exit, and invalidates pending GLB loads with a token. Hidden documents stop its render frame. Reduced motion snaps to an anchor and renders a static frame. Canvas mode, load failure, and WebGL loss use the selected car's local still with a region cue and the same physics metrics.

The bay is locally generated. A shadow-receiving composite plinth sits over a perspective floor grid with 2 m major and 0.5 m minor divisions, edge measurement ticks, and a restrained rear depth reference. The top surface uses a 128 px in-memory brushed texture, with no downloaded asset or runtime request. A soft directional shadow grounds the unmodified car mesh; key, fill, edge, and localized wheel-region light give the focus cue depth. The minor and rear grids are hidden on narrow phones to avoid aliasing. Texture, shadow map, geometry, and materials are disposed with the inspection renderer.

The committed `Race.garage` remains the canonical setup after Start. The arrival brief, orbit caption, live telemetry cue, result recommendation, and replay metadata show its identity; the existing Race `P()`, telemetry, and cinematic brake/grip effects use its parameters. The base car mesh remains unchanged because the GLBs do not provide option-specific suspension, wheel-width, or brake parts.
