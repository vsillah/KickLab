# Race Lab provider-neutral vehicle contract

The versioned three-car prototype catalog and asset ownership are documented in [race-lab-vehicle-roster.md](race-lab-vehicle-roster.md). This original document describes the earlier proxy-to-Direction-A swap contract.

Status: development contract for the **self-authored proxy** behind `?raceSystems=proxy` on localhost. The proxy is a systems fixture, not accepted Direction A art. Tripo licensing is unresolved; no provider output is used or authorized by this contract.

## Spatial and scene contract

The canonical scene is in metres with the car's forward axis **+X**, up **+Y**, and right **+Z**. `VehicleRoot` sits at the ground-plane center of the wheelbase and is the only node moved and turned by the Race adapter. `Body` contains visible body meshes. Reference dimensions are length **4.9 m**, width **1.95 m**, height **1.45 m**, and wheelbase **2.9 m**. A replacement may vary bodywork within those bounds only after same-camera visual and collision review; physics tuning is not inferred from the art file.

| Required node | Local pivot (x, y, z) m | Behavior |
| --- | --- | --- |
| `WheelFrontLeft` | `(1.28, 0.43, -1.04)` | Rotates about axle; front steering follows Race state. |
| `WheelFrontRight` | `(1.28, 0.43, 1.04)` | Rotates about axle; front steering follows Race state. |
| `WheelRearLeft` | `(-1.28, 0.43, -1.04)` | Rotates about axle. |
| `WheelRearRight` | `(-1.28, 0.43, 1.04)` | Rotates about axle. |

The chase camera targets `(-0.30, 1.02, 0)` in root coordinates. The preliminary collision proxy is a box centered at `(0, 0.72, 0)` with half extents `(2.45, 0.72, 0.98)` metres. Required optional attachment names are `BrakeLeft`, `BrakeRight`, `HeadlightLeft`, `HeadlightRight`, `ExhaustLeft`, `ExhaustRight`, `RearTireLeft`, and `RearTireRight`; missing effects remain off rather than causing a runtime failure. Material slots are `body`, `glass`, `aero`, `wheels`, and `lights`. The high detail root is `VehicleRoot`; a future `VehicleLow` may provide a lower detail level. Canvas Race remains the playable no-WebGL/no-asset fallback.

## Proxy adapter and swap validation

The current local Blender/GLB proxy predates the canonical node naming and has four visible tire assemblies under `front tire -1`, `front tire 1`, `rear tire -1`, and `rear tire 1`, plus `sculpted blue body shell`. The adapter checks those source nodes before displaying it. Its material/shape is explicitly provisional. A final Direction A asset must supply the canonical root, body, and four wheel pivot names; the adapter's non-proxy validator rejects missing required nodes. The body must remain original, fictional, and unbranded.

The tire grip dial remains the player's input. The selected venue's surface factor defines the corner's effective grip used by Race's existing limit, scoring, and coaching calculations. The deterministic dynamics module additionally applies the current grip zone and shoulder/runoff factor while driving. Venue data owns these factors; the vehicle asset never supplies them.

Before any swap, capture the unchanged GLB and provenance/rights record; validate node names, axis, scale, dimensions, wheel separation and pivots, material slots, embedded textures/external URIs, colliders, and attachment transforms. Then run the same Race camera at desktop, tablet, mid-width and 390px phone, verify car/curve/runoff composition, wheel motion, fallback, reduced motion, frame pacing, payload, and zero external requests. Keep the systems state, score shape, storage keys, Coach/Live Physics ownership, and control mappings independent of the asset. A technically valid export is not visual approval.

## Development gate

`raceSystems=proxy` is recognized on localhost only and defaults off. The flag enables the deterministic systems module and the local proxy renderer. It must not be promoted as production art or turned on by default. Phase 1 vehicle visual approval and written Tripo licensing clearance remain separate prerequisites before Phase 2 final vehicle/environment implementation.
