# Race signature finishes prototype

This is a default-off solo Race presentation slice. It runs only on a trusted origin with both `raceExpansion=prototype` and `raceFinishes=prototype`. No finish state is stored or sent over the network.

The contract observes canonical input and physics during the real run. Finish eligibility is checked only after Race reports a legitimate crossing and a passing mode result. Priority is handbrake 360, power stop, then precision hero. Each run can choose at most one. Failed runs, late brakes, isolated taps, unstable crossings, Canvas fallback, and unsupported modes follow the ordinary result path.

| Finish | Input contract | Presentation |
| --- | --- | --- |
| Handbrake 360 | At least 13 m/s in the final approach, committed steering for 0.16 s, then a held handbrake pull for 0.16 s; valid finish crossing | Selected car spins once beside the same finish and settles facing the camera. |
| Power stop | At least 1.1 s of full throttle through the finish, at least 16 m/s, then throttle release and hard brake within 0.5 s | Selected car brakes with load dive, existing tire particles and marks, and a stable finish angle. |
| Precision hero | A final optimal Drag upshift to gear 3 or 4 within 180 m and 7 s of the crossing, or a clean player-steered Drift recovery within 4 s | Short vehicle-linked flyby using the earned drivetrain or suspension cutaway. |

Presentation uses a separate pose for the selected 3D vehicle. It does not write canonical physics, mode outcome, scoring, rewards, Garage setup, or result ownership. Once the sequence ends, the ordinary result opens. Pause, hidden page, orientation change, route change, and WebGL failure cancel the sequence; reduced motion keeps a brief fixed camera and vehicle angle. Canvas fallback continues directly to the existing result.

Validation: run `npm run check`, then use `scripts/qa-race-signature-finishes.mjs` against an exact-head localhost build. The recorder drives the real UI from GO through the finish and encodes H.264 MP4s. Its report records the selected car, venue, result, storage keys, cinematic state, and external requests. A Human QA handoff still requires reviewing the final MP4s and the exact-head integrated browser route.
