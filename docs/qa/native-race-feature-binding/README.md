# Native Race feature binding: first unsigned iPhone gate

## Exact inputs

- Product base: deployed main `c57ac3b542cbd0df83a874ff5746e65fef4b493b`.
- Reviewed narrow viewport source/test diff: draft PR #191 at `f098a6bc27f13c429388fe42846b9ebdc80b20a2`; its PR was not merged here.
- Native iOS shell: draft PR #185's supplied evidence commit `d8cfd69ddf720356d988234ef161ed07d1877578`, archived to a temporary directory. The PR's later head was not used.
- Generated mobile package: 204 files, `dist/mobile/index.html` SHA-256 `2a1fb0428522076f63168b8a25394a76e3c07be2210655b51469d1603406577e` (2,687,067 bytes). Every generated file matched the iOS public copy byte for byte; Capacitor added only `cordova.js` and `cordova_plugins.js`.
- Unsigned Debug Simulator executable SHA-256 `b926b9037f81012a6f8b9199579c3f3f982d0c3e1563f3cee4edb5586e3e6aa9`. Installed HTML and executable hashes matched the built artifacts. Xcode 26.6, iOS 26.5, iPhone 17 Pro Simulator. `CODE_SIGNING_ALLOWED=NO`.

## Validation before native stop

- `npm ci` passed.
- `npm run check` passed 324 tests plus web and Pages checks.
- `npm run mobile:check` passed 10 tests, including the 204-file package and rights-ledger identity.
- `KICKLAB_QA_REV=native-binding-working node scripts/qa-ios-race-preflight-regression.mjs http://127.0.0.1:4399/dist/kicklab.html /tmp/kicklab-native-binding-browser-qa` passed 812×375, 844×390, 874×402, 932×430, 390×844, 768×1024, and 1440×900 browser viewports with no page errors or external requests. This is browser evidence, not native qualification.
- The native Home card entered Race and opened the reviewed four-step preflight on the installed unsigned iPhone app.

## Native stop

The first native preflight screen fails the safe-area gate: its heading sits behind the Dynamic Island and the Close control overlaps the iPhone status icons. The overlay uses a full-screen shell without native top-inset spacing. Stop before treating grid, controls, guidance, notification clearance, pause/resume, rotation, relaunch, reduced motion, storage, performance, iPad, or native zero-egress as qualified. This lane records the defect; a separately reviewed product repair must be built into a new exact package before native qualification resumes.

[Native screenshot](iphone-preflight-status-area-overlap.png), SHA-256 `a82b8510c4b08314fcec4a8c9450f4e65e08fb1e04de9c2ba78aa24846d19009`.

[Native Home-to-preflight MP4](iphone-native-home-to-preflight.mp4), 15.9 seconds, H.264 804×1748, 478 frames, full decode passed, SHA-256 `d74273dcceddd2330bc24e1287c6ecb75671363eaa5907ffd4b8e224779fce50`.

The raw Simulator recording remains in the temporary QA directory; the review MP4 contains only synthetic local game state. No signing, upload, distribution, store, merge, deployment, or provider action was performed.
