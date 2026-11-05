# Native Race preflight safe-area review

## Binding and scope

- Review branch: `codex/kicklab-native-race-preflight-safe-area`, based on deployed main `c57ac3b542cbd0df83a874ff5746e65fef4b493b`.
- The branch changes only native-packaged Race preflight shell top spacing, its focused packaging check, the exact-file rights-ledger row, and this QA evidence. The normal browser stylesheet is unchanged.
- Race feature binding is a separate, unmerged dependency: draft PR #192 at `dd133505912d925c151b4cf2eb7ee2bab7db1138`. Native validation used a detached temporary checkout of that exact head with this branch's CSS applied. PR #192 was not modified or merged.
- The source reproduction is PR #192's native screenshot SHA-256 `a82b8510c4b08314fcec4a8c9450f4e65e08fb1e04de9c2ba78aa24846d19009` and MP4 SHA-256 `d74273dcceddd2330bc24e1287c6ecb75671363eaa5907ffd4b8e224779fce50`.
- Standalone branch package: 204 files, `index.html` SHA-256 `00b552480b77fffa1e08ff24ccabe2ace29b8231e0eab0d7f55e7693006e1bf2`, package manifest SHA-256 `bdcb8b764e29f1fee30865f3de99955590885484cfa7b4f9f40b9b766a8d3e54`.
- Temporary combined native package: 204 files, `index.html` SHA-256 `079ed4e4aa5b71fb7ceb63f82ded577e77d10e1334362d91d5b569bbb649873e`, package manifest SHA-256 `b71852044a61b68e3de5e02df4493132399e06a1ec28faaf4c30792da1348355`. Built `App.app/public/index.html` matched this hash. The combined hash is a QA candidate, not an owner-adopted or release-approved package.

## Results

- `npm run check`: 322 tests, web contract, and Pages contract passed on the review branch.
- `npm run mobile:check`: 10 tests and exact-file rights-ledger identity passed.
- `git diff --check`: passed.
- Unsigned Xcode Debug Simulator build with `CODE_SIGNING_ALLOWED=NO`: passed. No signed artifact was made.
- PR #192 combined browser regression: seven viewports (812×375, 844×390, 874×402, 932×430, 390×844, 768×1024, 1440×900) passed with no page errors or external requests. Reduced motion was enabled for this browser matrix.
- iPhone 17 Pro and iPad Pro 13-inch (M5), iOS 26.5: native portrait and landscape Race preflight phase label, heading, and Close control cleared the system status area. Location, vehicle, Garage, and grid phases were visually exercised at both orientations; iPhone rotation in an open preflight and relaunch were exercised. The first side-padding attempt expanded the iPhone landscape phase row; it was removed before the final build, which kept the original side insets. A separately rebuilt unmodified PR #192 reproduced its existing compact landscape content scrolling; the final top-only change did not add that behavior.
- The native Close control retained visible focus styling. Native VoiceOver spoken output and reduced-motion OS setting were not verified. The preflight has no text field; software-keyboard behavior was not exercised in this flow. Native zero-egress instrumentation and deeper Race gameplay qualification remain for the Captain's combined qualification pass.
- The [exact combined-package native walkthrough](pr192-combined-native-walkthrough.mp4) is 49.97 seconds, H.264 1920×1080, SHA-256 `a3608cf1bfe01c52938ea579064fa008d240f9431448a509b723334d9542ac96`; full decode and representative-frame visual review passed. It contains synthetic device-local game state only.

## Gate

Human QA may review the safe-area correction against the combined PR #192 candidate, but no merge or deployment should occur until the Captain reconciles the PR dependencies and rights hash. This lane does not authorize signing, credentials, uploads, distribution, store submission, or release.
