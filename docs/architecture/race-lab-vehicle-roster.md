# Race Lab vehicle roster prototype

The asset lane owns three original local vehicles and the versioned catalog in `src/shared/race-vehicle-catalog.js`. The race-modes lane can consume `KickLabRaceVehicleCatalog` without copying asset paths, names, handling values, or Coach text. Stable IDs are `cobalt`, `kestrel`, and `aegis`; schema version is `1`.

| ID | Visual identity | Handling intent | Cost to teach |
| --- | --- | --- | --- |
| `cobalt` | Existing Direction A coupe, sculpted rear and balanced wing | Balanced mass, force, grip and response | Neither the fastest launch nor highest corner hold |
| `kestrel` | Narrow dart body, compact canopy, exposed shoulders, small ducktail | 880 kg, 7600 N, quick turn-in, lower rolling loss | Lower grip and slower slide recovery |
| `aegis` | Broad wedge, deep aero floor and diffuser, double rear wing and dorsal fin | 1560 kg, 8800 N, 10% more baseline grip, speed-dependent aero load | Slower launch and greater rolling loss |

Each entry declares `id`, `name`, `role`, `availability`, `assetUrl`, `coach`, `tradeoff`, `physics`, and `wheels`. Physics fields are `massKg`, `driveForceN`, `topSpeedMs`, `grip`, `rollingLoss`, `steeringResponse`, `slideRecovery`, `brakeHeat`, `brakeRecovery`, and `downforce`. `downforce` raises effective tire grip with speed in the existing systems step, capped at twice the 30 m/s reference. Mode-specific scoring and progression are outside this catalog.

`raceExpansion=prototype` enables the roster only on trusted localhost. Settings → Race vehicle selects one asset at a time; the default build and production URL keep the existing Race behavior. The legacy Garage body and existing score/storage shape remain compatible. A failed asset load returns to Race Canvas. No provider asset, credit, purchase, runtime CDN, or external texture is involved.

## Production and validation

The new shapes and UVs are authored locally by `scripts/race-roster/generate.py` and `body_variants.py` in Blender 5.1. The saved `.blend` files are editable sources, while each `.glb` has a SHA-256-bound asset manifest. `scripts/race-roster/audit.py` checks named nodes, separate wheel meshes, axle pivots, UVs, triangles, and payload. `scripts/qa-race-vehicle-roster.mjs` exercises selection, orbit, rear chase, default-off behavior, frame pacing, fallback, and external requests.

Regenerate either vehicle with:

```sh
blender -b -t 4 --python scripts/race-roster/generate.py -- kestrel --output qa-artifacts/race-roster/kestrel
blender -b -t 4 --python scripts/race-roster/generate.py -- aegis --output qa-artifacts/race-roster/aegis
```

Copy the generated `.blend` and `.glb` into that vehicle's `src/assets/3d/` folder, update the manifest byte count and SHA-256, then run `python3 scripts/race-roster/audit.py` and `npm run check`. Browser evidence belongs under `qa-artifacts/race-roster/browser/` and is intentionally outside the shipped build. The selected GLB is loaded on demand; all three are packaged locally for offline availability.

The roster remains a prototype until product visual approval and integration review. These assets are self-authored and licensed for production-game use; the prototype status describes the current release gate rather than third-party rights.
