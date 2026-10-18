# Character fidelity v2 rubric

## Evidence boundary

The before baseline is PR #20 at `6691ec5717288a0e924a98bc72f61f2dcc9df2f5`, using `qa-artifacts/lifelike-free-kick-6691ec5`. This follow-on remains code-authored, local-only, default-off, and stacked on PR #20. No external asset, real-person likeness, child likeness, runtime request, telemetry, or native packaging work is in scope.

## Pixel audit and acceptance rubric

Scores use a five-point scale: 1 = placeholder, 3 = readable game-ready direction, 5 = production-quality language at all reviewed sizes.

| Dimension | PR #20 baseline | Observed limitation | v2 acceptance target |
| --- | ---: | --- | ---: |
| Adult anatomy and silhouette | 2 | Narrow shoulders and hips, oversized hands and joint discs, uniform limb widths | 4 |
| Facial readability | 2 | Eye and mouth read in the mechanics lens, but the face lacks cheek, chin, expression, and field-scale clarity | 4 |
| Joint continuity | 1 | Elbows and knees read as separate circular hinges; calf, sock, and boot transitions disconnect | 4 |
| Motion arcs and balance | 3 | Seven clips and contact timing are sound, but torso and pelvis move as one block and recovery lacks counter-rotation | 4 |
| Kit differentiation | 1 | Boot colors change, but profile and sole construction do not create a distinct silhouette | 4 |
| Mobile legibility | 2 | The lens preserves recognition, while the field athlete itself is small and visually thin | 3 |
| Stadium consistency | 2 | Palette fits, but heavy black outlines and simple capsules feel detached from the dimensional stadium | 4 |

Acceptance requires every target score, both `light` and `heavy` existing boot treatments visibly differentiated with their canonical telemetry unchanged, and all PR #20 geometry, replay, fallback, reduced-motion, storage, payload, and memory gates still passing.

## V2 review result

| Dimension | Before | V2 | Evidence |
| --- | ---: | ---: | --- |
| Adult anatomy and silhouette | 2 | 4 | Wider articulated shoulder and hip mass, smaller head, tapered thigh/calf and upper/lower-arm contours |
| Facial readability | 2 | 4 | Authored ear, eye highlight, brow, nose, cheek, chin and clip-driven mouth/brow expressions |
| Joint continuity | 1 | 4 | One continuous bent-limb contour plus unoutlined deformation blends at elbows and knees |
| Motion arcs and balance | 3 | 4 | Deterministic torso/pelvis counter-rotation, heel lift, toe roll, balance recovery and follow-through |
| Kit differentiation | 1 | 4 | Canonical `light/speed` and `heavy/power` boot silhouettes, colors, soles and jersey marks; telemetry stays sourced from `kitState()` |
| Mobile legibility | 2 | 3 | Stronger field silhouette and retained mechanics lens at 390 px without overflow |
| Stadium consistency | 2 | 4 | Reduced outline weight, shaded connected anatomy, existing palette and local stadium lighting |

The scores describe the reviewed code-authored side-view language, not photorealism or platform qualification. The mechanics detail remains a teaching aid; it does not substitute for the improved primary field athlete.

## Human QA correction gate

Human QA rejected commit `f458b7e1ee0bd948c70e3db3597204615d717d4e` because the elbows crossed below the wrists in the six non-celebration states and the in-stage proof controls plus mechanics lens obscured the approved stadium composition.

The correction gate requires:

- elbow positions remain strictly between shoulder and wrist height in ready, approach, plant, strike, follow-through, recovery, and celebration;
- front and rear arms retain opposite, deterministic bend directions when the rig is mirrored;
- the approved PR #20 stadium source stays byte-for-byte identical at SHA-256 `2ff5be0f1664d22d3f4abb8e569a19ed68a582a448b80f20749322d582642477`;
- the complete atmosphere, roof, upper/lower stands, crowd, side returns, animated boards, perspective pitch, goal frame, side/back net, and perspective grid remain active;
- character proof controls and the mechanics detail render outside `.stage`, leaving the stadium unobscured at desktop, tablet, and mobile sizes.
