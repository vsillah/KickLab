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

## Gate status

Browser Gate 1 remains open. Captain-provided PR #145 validation already covered eight Kick activity families, 12 reproducible success/failure outcomes, result actions, reduced motion, 3D/Canvas, privacy, and public Race start/finish on exact deployed main. The exact-main earned Race Forest journey and the remaining visible-browser frame-pacing states still need a current-artifact pass before calling the full matrix complete. Keep this test-only PR draft and separate from release. Native generation, rights, signing, distribution, store, provider, DNS, upload, publication, and commercial release remain on hold.
