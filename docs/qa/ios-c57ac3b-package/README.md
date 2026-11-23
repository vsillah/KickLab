# Unsigned iOS checkpoint on deployed main `c57ac3b`

## Exact build binding

- Source base: merged/deployed main `c57ac3b542cbd0df83a874ff5746e65fef4b493b`, including Human-QA-approved Race PR #190 at `9322df5988a0054ceec55230b066a2ee555bb35a`. Draft PR #185 was rebased onto that main; pre-evidence iOS lane head was `12c92ab944b032de8e6baf0899dcd53d231c3f1c`. No product source changed in this lane.
- `npm ci` passed. `npm run check` passed 322/322; `npm run mobile:check` passed 10/10.
- `npx cap copy ios` matched all 204 generated mobile files byte for byte. Sorted path/hash/bytes tree SHA-256: `0344a16ab04917e0faef45c4a7de9537f9e8b7ab821cb4ff0f6537352b26f185`. Mobile HTML and iOS copied HTML SHA-256: `acc87a32ff9512dbdd9fe3b16f85011efd042ee6cc0f5913469ce22151b048b9`. The only extra files in iOS public are Capacitor's `cordova.js` and `cordova_plugins.js`.
- Xcode 26.6 unsigned Debug Simulator build with `CODE_SIGNING_ALLOWED=NO` returned `BUILD SUCCEEDED`. Executable SHA-256: `e6ac68a9f981f0367f98a63a0119fa8cc980a7ed683cf45e1a82e9d7d8f5ea18`. Installed executable and HTML hashes matched on iPhone 17 Pro and iPad Pro 13-inch (M5), both iOS 26.5 Simulators. No distribution signing or provisioning occurred.

## First native gate and stop

On the iPhone 17 Pro in landscape, Home rendered and Race opened. The centered `READY?`/Race run countdown completed. After it cleared, the live cockpit remained larger than the physical landscape viewport: only the top section of the compact event map was visible, the road/map continued below the screen, and Gas/Brake and steering controls were not visible. This fails the project's Race control visibility and safe-area contract. A second raw Simulator capture was byte-identical to the first, confirming a stable rendered state.

[Raw Simulator screenshot](iphone-race-landscape-after-countdown.png), SHA-256 `8aa63139c448ad7ae4ee303a23391423888b5aa84fb41aaaf61a62103608d05b`, is from the exact installed executable. `simctl` retains the portrait pixel buffer when the device is landscape; rotate it for the on-screen orientation. The image contains synthetic/local game state only. No live driving input, run result, or progression award is claimed.

Native qualification stops at this first deterministic product failure. Route the Race cockpit geometry fix to a separate product lane, then rebuild and rebind PR #185 to the next exact main/package/executable. The iPhone/iPad portrait and landscape three-lab journeys, Race route/vehicle/tuning/grid/Start heat, Fight/Kick regressions, pause/rotation/relaunch, VoiceOver, native reduced motion, storage/offline recovery, physical-device performance, and continuous all-state zero-unexplained-egress remain unqualified on this executable. No credentials, upload, store submission, distribution, merge, or release action occurred in this lane.
