# PR #191 clean native simulator evidence

Captured 2026-11-05 from source head `17be41d26373bf68275013500fc4fb3dfd9fc811` on an iPhone 17 Pro Simulator (iOS 26.5), landscape WKWebView 874×402. The app was built unsigned from the unmodified `dist/mobile` package in the temporary PR #185 iOS shell. Temporary diagnostic scripts were removed before this build.

## Exact installed artifact

- Source mobile HTML, temporary shell HTML, built app HTML, and installed app HTML each SHA-256 `bb222304b3cc2150c2d72c1916a373c609b6478d973f9cd500b130f50b6dc450`.
- Built and installed `App` executable each SHA-256 `14199a662e87c9a0fe1da4accdfaa5f9531a8cc7c355e2e04dc3a613f3f110df`.
- Bundle ID `com.amadutown.kicklab`; `CODE_SIGNING_ALLOWED=NO`; no device signing, upload, distribution, or release.
- [Native clip](native-clean-transition.mp4), SHA-256 `b3bf31ca5e58e3edcd6eb28c486cb8b70ddd5aa217edbdd0983b92c90d2e0398`, 22 seconds, H.264, 874×402. It is a bounded edit of the native `simctl io recordVideo` capture, with an idle pause interval removed. No synthetic UI or diagnostic overlay was added.

## Observed

The real UI entered Race from Home and displayed the global countdown. The stage and visible driving controls fit at [grid](native-clean-grid.png), [red start light](native-clean-count.png), and [run](native-clean-run.png). Tapping the stage opened the [pause menu](native-clean-pause.png); Resume returned to the [run stage](native-clean-resumed.png). A separate held Gas input moved the car on the native Canvas stage. The app was terminated and relaunched before the recorded sequence.

## Open qualification limits

The exact native package did not show the compact Canvas navigation map or preflight. `src/shared/race-origin.js` trusts localhost and the GitHub Pages route for the opt-in Race feature flags; the packaged `capacitor://localhost` origin does not meet that contract. Entry went directly from the general countdown to grid. Prior device-local setup was present, so this run does not isolate the effect of state reuse. This evidence cannot qualify the map, native preflight, or a notification/control collision in the native app. The browser regression covers those features at the trusted localhost route, but that is a separate artifact. Keep client-facing Human QA pending until the captain resolves the intended native feature contract and requalifies its exact package. Physical-device qualification remains open.
