# Unsigned iOS checkpoint on deployed main `72dba19`

## Exact build binding

- Source base: merged/deployed main `72dba19fa6be035eb0f5bcfcf069fd3f08f05289`, including PR #189 exact head `1dfba4945b365ee66738d2752b77c29eaf89c622`. The existing draft PR #185 iOS branch was rebased onto this main. No shared product source was changed in the iOS lane.
- `npm ci` passed. `npm run check` passed 322/322, and `npm run mobile:check` passed 10/10.
- `npx cap copy ios` copied the 204-file generated mobile package byte for byte. Deterministic path/content/length tree SHA-256: `3aa490c56dbe0e1e048ca5774348bc20f5c6635a1fb22676f32f3bf5df6635ca`. Mobile HTML and copied iOS HTML SHA-256: `2db2c7ffa5bd6eb8e5bb244c8c494d644efdd1acdda04880802ab272bfecd9ce`. The only extra files in iOS public are Capacitor's `cordova.js` and `cordova_plugins.js`.
- Xcode 26.6 unsigned Debug Simulator build with `CODE_SIGNING_ALLOWED=NO` returned `BUILD SUCCEEDED`. Executable SHA-256: `af11ea24343f4be74522b07810b64bd0b7f228bfa6edf79b2ce32b3ef3dc8467`. The installed executable and HTML hashes matched on iPhone 17 Pro and iPad Pro 13-inch (M5), both iOS 26.5 Simulators. No distribution signing or provisioning occurred.
- The generated HTML contains PR #189's short phone landscape rules for `.race-preflight-shell`, `.race-stage-start`, and the countdown overlay. The prior executable `b5c32ad0…0d0f4` and its accepted iPhone portrait Fight/Jab evidence are historical; no Fight pass is inferred for this rebuilt executable.

## First native gate and stop

On the current iPhone 17 Pro in landscape, Home rendered and Race opened. The `READY?`/Race run countdown was centered and visibly inside the screen, consistent with PR #189's start-cue change. After the countdown cleared, the Race map extended below the bottom of the landscape viewport. The screen said to hold Gas to start, but the Gas/Brake driving controls were not visible in the viewport. This fails the project's Race control visibility and safe-area contract, independent of whether the now-centered countdown is correct.

[Raw Simulator screenshot](iphone-race-landscape-after-countdown.png), SHA-256 `33d4eac4bfaf1f0677dd3d0db64bc1c554bd659a64aff67f83301dd2b7cfc391`, is from the exact newly installed app. `simctl` retains the portrait pixel buffer when the device is landscape; view it rotated for the on-screen orientation. The image shows synthetic/local game state only. This post-countdown image is pixel-identical to the old package's same map state; the PR #189 change addressed preparation/start overlays, not this remaining Race cockpit geometry. No run result, progression award, or Gas/Brake interaction is claimed.

Native qualification stops here at the first deterministic landscape clipping/control-visibility defect. Route the cockpit/control fix to a separate product lane, then rebuild and rebind PR #185 to the exact next main/package/executable before continuing. iPhone/iPad portrait and landscape three-lab journeys, route/vehicle/tuning/grid/Start heat, Fight/Kick regressions, rotation/lifecycle, VoiceOver, native reduced motion, live storage/offline recovery, physical-device performance, and continuous all-state zero-unexplained-egress remain unqualified on this executable. No credentials, upload, store submission, distribution, merge, or release action occurred in this lane.
