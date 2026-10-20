# Race Lab Option A acquisition stop

Date: 2026-10-20. Branch: `codex/kicklab-race-lab-immersion`. This is a local asset evaluation record, not a visual approval or product integration.

## Acquired source files

| Candidate | Sketchfab source | Download | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| Vintage Racing Car by SpatialNeglect (embedded credit: Mateusz Woliński) | [model `0b4cd62e8620486f9b62c32d87d3ed0e`](https://sketchfab.com/3d-models/vintage-racing-car-0b4cd62e8620486f9b62c32d87d3ed0e) | Converted GLB, 1K textures | 20,927,752 | `6450ac1ecdabea7754248d3563dc737f176431373236f109c7e3dbfff5828b24` |
| Race Track Assets Pack by Cherk | [model `4a863e7005d647adb2f72775cf41e808`](https://sketchfab.com/3d-models/race-track-assets-pack-4a863e7005d647adb2f72775cf41e808) | Converted GLB, 1K textures | 33,166,920 | `a5684e8e62d705d4b2e017f8e1849b7e4e37e6b4fec0a2427aeae5f6fa767322` |

The exact browser downloads are copied without modification into the ignored `qa-artifacts/race-sketchfab/raw/` folder. A timestamped, public-metadata and GLB manifest is in `qa-artifacts/race-sketchfab/evidence/acquisition-provenance.json`. Both listings and embedded GLB metadata state CC BY 4.0 and require creator attribution. Neither GLB declares an external URI. No money was spent.

## Stop condition

The downloaded track pack has material names `fanatec_banner`, `pirreli_banner`, and `rolex_banner`, with corresponding named concrete-barrier meshes. Those names indicate third-party branded content. The creator's CC BY listing alone does not establish rights to use those marks. Under the explicit branded-element stop condition, the track pack is **quarantined**. No branded geometry or texture was copied into a derived or shipped asset.

The vehicle has no similarly named mesh or material. Its separate local review is recorded in [the car-only visual checkpoint](race-lab-car-only-evaluation.md), which failed the same-camera visual gate. Its 20.9 MB source size is above the proposed 2 MB shipped-car budget; the complete 33.2 MB prop pack is above the proposed 2 MB selected-props budget. These are raw source sizes, not optimized measurements.

## State and continuation

- No derived GLB was produced. `qa-artifacts/race-sketchfab/derived/` is empty.
- The live Race asset URL, scene code, controls, physics, scoring, and deployment are unchanged. The rollback checkpoint remains `1d02f5465e0dec7ad1c9a722e2e12721043e6aa6`.
- Car-only same-camera desktop and phone renders were run later; visual acceptance **failed**. Offline/runtime egress, Canvas fallback, and frame pacing remain unqualified. The track pack was never rendered or derived.
- Next decision: reject this prop pack and select a rights-cleared unbranded prop source, or explicitly authorize removal of all branded meshes/materials/textures for a new local-only evaluation. The car can be evaluated independently after that scope is clarified. No product integration follows automatically.
