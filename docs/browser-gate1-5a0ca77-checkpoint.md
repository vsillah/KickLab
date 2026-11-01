# Browser Gate 1 checkpoint at deployed main `5a0ca77`

## Artifact and scope

- Exact deployed main: `5a0ca77f8e3547000f0559fcff35047214aa659f` (merged PR #147). Local `dist/kicklab.html` and public `https://vsillah.github.io/KickLab/?rev=5a0ca77f8e3547000f0559fcff35047214aa659f` have SHA-256 `9e4f59f4146a20288102c170bc55eef96bfaa53cd9e22df9fc4e72c53b0bab85`.
- Packaged `dist/mobile/index.html` has SHA-256 `062ee1e44df26898600119191c73c8d4da959cef4754b46e5ac1da771ef7847d`; its manifest has SHA-256 `4ff2199ff90ecda59cc028e89e2cae93627b7fc2e84c69df8f1686474b924c12`.
- This draft PR contains only test harnesses and evidence relative to main. It does not change product runtime or request deployment.
- The earlier premature Race map `ROUTE 100%` defect was recorded on `b509fb9` and repaired by PR #147. The Captain reported a 20-case deployed public-origin matrix across five widths, 3D/Canvas, and flagged/unflagged routes, including monotonic Highland Drag progress below 100% until finish, real UI play, parity, lifecycle, reduced motion, p95 below 50 ms, and zero app egress. That public matrix is Captain-provided evidence; this lane independently verified the exact HTML hash and the checks below.

## Direct checks on `5a0ca77`

- `npm ci --ignore-scripts`, `npm run check` (315 tests plus asset, web, and Pages contracts), and `npm run mobile:check` (six checks) passed.
- Local Race entry matrix: 22/22 cases, including offline Fight/Kick entry, 3D/Canvas, five vehicle variants, corrupt legacy state, profile switch, unprepared asset fallback, denied storage, pause Save & Exit, and direct flagged/unflagged routes. No app external requests or page errors were observed.
- Kick result families: 12/12 real success/failure outcomes across eight families at 390 × 844, with full/brief result lifecycle and usable actions. Fight result rail: 30 real-action checks over 360, 390, 768, 1113, and 1440 widths, including losses and victories. No app external requests or page errors were observed.
- Profile failed-save/retry/reload and local-data deletion/cancel/first-run reload each passed at five widths. Corrupt profile/legacy data and denied-read recovery passed without altering unrelated storage. The synthetic-data storage and deletion walkthroughs encoded as playable H.264 MP4s in ignored `qa-artifacts/`.
- Progression locks: 20 checks across five widths covered Race awards, venues, Garage, vehicles, Championship, Fight, and Kick. The [390 × 844 venue screenshot](evidence/browser-gate1-5a0ca77-390-venues-locked.png) was visually inspected. Disabled selection left the active profile unchanged.
- Packaged/mobile CSP and Race rendering: eight web/mobile cases covered 3D and forced Canvas fallback, blocked deliberate external probes, and no observed app egress. Private Party passed a three-round exchange and five-width lifecycle/negative boundaries with no camera access or solo profile mutation.
- Earned Race journey: Highland Drag, both Marine heats, and all three Forest heats passed through visible controls without QA unlocks or forced finishes. Forest recorded zero slide time.
- Public-origin Highland Drag results: real completion at 390, 768, 1113, and 1440 widths; separate Coach observations; icon-only Save & Exit with 44 px or larger target and keyboard focus; correct local progress after reload. The [390 × 844 result screenshot](evidence/browser-gate1-5a0ca77-390-race-result.png) was visually inspected. No visible export control, app external request, or page error was observed.
- Replay: four local cases covered 3D visual replay, Canvas text fallback, touch/keyboard/pointer paths, offline behavior, current-profile isolation, and absence of export/share calls.
- The integrated Codex browser loaded the exact public revision URL and visually showed the Home and Race venue-first preflight with readable progression locks. That spot check did not play a full heat.

These checks used browser emulation and synthetic local profiles. The older `b509fb9` visible-browser pacing table and screenshots were removed from this PR because they do not bind to the current artifact. The current deployed 20-case p95 result above is attributed to the Captain's PR #147 qualification, not to a new independent visible pacing run in this lane. Native and physical-device performance are separate gates.

## Gate status and remaining matrix

Browser Gate 1 is **open**, with the specific Race map blocker resolved on this artifact. The [Gate 1 plan](release/browser-gate-1-plan.md) still requires a complete exact-artifact cross-product and visual review: Fight Classic and Analog completion/negative paths with held-input, mute, reduced-motion and background return; Kick 3D/fallback and all family/width/input combinations; Race Drag and Circuit lap wrap with Classic/Analog/Simulator across 3D/fallback, failed-event recovery and media faults; profile nickname validation and legacy migration; and browser restart, blocked-state recovery, keyboard/focus and request-log coverage across the required paths. The checks above cover bounded slices of those requirements and should not be read as a full Gate 1 pass.

Keep PR #143 draft, test-only, and unmerged until the Integration Captain reviews the remaining matrix. No native build, physical-device qualification, rights clearance, signing, distribution, store, provider, DNS, upload, publication, or commercial release is claimed.
