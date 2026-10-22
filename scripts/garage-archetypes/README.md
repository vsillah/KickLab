# Race Garage vehicle archetypes

Run `scripts/render-garage-archetypes.sh` from the repository root. The script
uses local Blender 5.1 and `cwebp` to export transparent 640 × 400 WebP images
to `src/assets/garage/v1/`. No network request or external asset is needed.

- `kart`: locally authored open go-kart with exposed cockpit, short wheelbase,
  low nose, side pods, and engine.
- `street`: locally authored enclosed road car with longer wheelbase, roof,
  raked glazing, lighting, and road trim.
- `race`: renders the already validated local Direction A GLB at
  `src/assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb`.

All three use the same elevated three-quarter camera, lighting, and transparent
studio. The Garage visuals identify body choices; gameplay keeps the Direction A
3D vehicle while the body selection changes canonical Race physics. Full-size PNG
render intermediates stay in ignored `qa-artifacts/garage-archetypes/rendered/`.
