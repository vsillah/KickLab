# Browser Gate 1 checkpoint at deployed main `b509fb9`

## Artifact and scope

- Deployed main: `b509fb95268bb77fc3e51a9729c0e2d05df5bba8` (PR #145 merged). Local `dist/kicklab.html` and public `/KickLab/` HTML both have SHA-256 `454a6949041c4267b1405ff08268d1cdb68a6a10fcca5e65b47060cf06e76209`.
- This draft PR is test and evidence only. It contains no product runtime change relative to main.
- The Kick result obstruction recorded at `42dbb1f` is resolved on this artifact. The [390 × 844 Free result screenshot](evidence/browser-gate1-b509fb9-kick-free-390-goal.png) shows the visible Next round action without the guidance rail.

## Current artifact checks

- `npm ci --ignore-scripts`, `npm run check` (313 tests, web and Pages contracts), and `npm run mobile:check` (six checks) passed.
- Race entry matrix: 22/22 cases on both exact-main localhost and public Pages. It includes offline Fight and Kick entry, Race 3D and Canvas, five vehicle variants, corrupt legacy state, profile switching, asset fallback, denied storage, pause Save & Exit, and flagged/unflagged routes. No errors, external requests, permission requests, popups, or downloads were observed.
- Profile storage recovery: five widths (360, 390, 768, 1113, 1440) passed failure messaging, retry, and reload persistence with zero egress. Additional corrupt-store and denied-read scenarios recovered without changing unrelated storage.
- Kick Free result: real GOAL! in offline and denied-write-storage scenarios, with a clear right-edge Next round hit target, no overflow, and no observed egress or page errors. A visible Chromium run at 390 × 844 measured 8.5 ms active and 8.9 ms stable-result p95 over 110 frame intervals each, below the 50 ms threshold.
- Fight offline result: real KNOCKED DOWN outcomes at 390 and 1440 with zero requests after network denial, errors, or overflow.
- Mobile CSP and Race renderer: eight web/mobile viewport cases, 3D success and forced Canvas fallback, with local GLB and blocked external probes. The 11.48-second MP4 was encoded and probed. The deliberate `example.invalid` beacon reported a queued return value but no intercepted app request; it is not evidence of app egress.
- Progression locks: 20 checks across five widths covered Race awards, venues, Garage and vehicles, Championship, Fight and Kick styles. Disabled selection preserved the current profile. Representative mobile and tablet screenshots were visually inspected; no clipping was found.
- Race Private Party prototype: a three-round two-player exchange passed packet rejection, QR navigation, frozen Garage, result comparison, rematch and abandon. Responsive and lifecycle checks covered five widths, default-off behavior, reload and profile switch cleanup, Canvas fallback, no camera access, and a 2–0 early clinch. No solo profile mutation, external requests, or page errors were observed. The existing harness needed a test-only preflight-close adjustment to reach the current UI; the rerun passed.
- Local-data deletion: five widths passed confirmation, cancellation, deletion, and first-run reload behavior with zero egress. The desktop walkthrough encoded as a playable 10.04-second H.264 MP4.
- Earned Race journey: Highland, both Marine heats, and all three Forest heats passed through visible controls on the exact artifact. Forest recorded zero slide time. There were no QA unlocks, forced finishes, page errors, external requests, popups, or downloads.
- Visible-browser pacing at 390 × 844: Kick Free was 8.5 ms active and 8.9 ms stable-result p95; Fight was 8.5 ms active and 9.3 ms stable-loss p95; offline Race 3D cockpit was 10.1 ms p95. Each was under the 50 ms gate on exact main. The Race run also confirmed its prepared local vehicle rendered after network loss with no new document request. The Fight walkthrough encoded as a playable MP4.

## Visible-browser pacing extension

The [sanitized measurement table](evidence/browser-gate1-b509fb9-visible-pacing.json) binds these samples to the same artifact. Visible Playwright Chromium 149.0.7827.55 ran on macOS 26.5 at device scale factor 1. Samples used stable rendered states; Race samples held Gas after the green light and confirmed speed increased during the sample. The 50 ms p95 threshold was preserved.

| Surface | Widths and states | Observed p95 |
| --- | --- | --- |
| Fight | 360, 390, 768, 1113, 1440; active and real no-input loss | 8.8–10.3 ms |
| Kick | Seven full-result families distributed across all five named widths; active and stable result | 8.5–9.2 ms |
| Kick Penalty Shootout | 390; real missed and scored brief results after the required two-shot sequence | 8.6–9.2 ms |
| Race 3D | 360, 390, 768, 1113, 1440; live Highland Drag with Gas held | 8.5–9.2 ms |
| Race Canvas | The same five widths and live input | 17.3–25.0 ms |

The final pacing runs recorded zero page errors, external requests, permission queries, popups, or downloads. The generic Kick pacing harness timed out on Penalty Shootout because it did not perform the second shot action; a dedicated visible-browser failure/success run passed. Kick family samples are distributed across widths, not a full family-by-width cross product. Browser emulation is not physical-device or native performance proof.

## New Race navigation blocker

The compact Race map reported **ROUTE 100%** during the live Highland Drag heat at all five widths in both 3D and Canvas. In the same samples, the course-map speed label rose from about 32–33 km/h to 51–63 km/h. The heat had not shown a result. The [390 × 844 3D screenshot](evidence/browser-gate1-b509fb9-race-map-390-3d-active.png) and [360 × 800 Canvas screenshot](evidence/browser-gate1-b509fb9-race-map-360-canvas-active.png) show the premature 100% readout with live controls. A focused Canvas trace first showed 100% at only 5 km/h, while speed continued rising to 59 km/h and the result stayed hidden. The map readout is therefore not a reliable account of current course progress in this state.

Reproduce on this artifact: choose Race → Highland Switchback → complete venue, route, car, Garage, and control preflight → skip the vehicle view → wait for the green light → hold Gas. Inspect the compact route map before the result. The repair should derive map progress from the canonical active route and keep 100% for an actual finish or lap wrap, with the same behavior in 3D and Canvas at the five widths. A separate product development lane should own that repair and a fresh exact-artifact rerun. This PR contains no runtime fix.

## Gate status

Browser Gate 1 is **blocked by the Race map defect**. The visible-browser pacing states above passed, but correct map behavior is a Gate 1 requirement. Captain-provided PR #145 validation already covered eight Kick activity families, 12 reproducible success/failure outcomes, result actions, reduced motion, 3D/Canvas, privacy, and public Race start/finish on exact deployed main. After the separate product repair, rerun the affected Race interaction and pacing states on its exact build and finish captain review of the broader Gate 1 matrix. Keep this test-only PR draft and separate from release. Native generation, rights, signing, distribution, store, provider, DNS, upload, publication, and commercial release remain on hold.
