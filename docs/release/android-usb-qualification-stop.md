# Android USB qualification stop — 2026-11-08

**Status:** stopped on a physical Pixel 10 Pro Race presentation failure. This is an internal unsigned debug candidate, not a release or Human QA artifact. Do not offer this APK through the temporary LAN tablet link until the presentation failure is repaired and the complete physical matrix rerun.

## Exact bindings

- Source baseline: `origin/main` `c57ac3b542cbd0df83a874ff5746e65fef4b493b`.
- Reviewed inputs: draft PR #15 `01fb39cf11a4a320c8e6471729ae11096e1a3913`; draft PR #188 `00c251c148ba89fa42c3c77236cf415994def759`. The new branch `codex/kicklab-android-usb-qualification` reapplies PR #188's merge of the Android shell and its offline Home repair to current main. Only the package ledger row was rebound; H01 owner review remains pending.
- Built source commit: `864080e2e28783892f0cb05faa41669f6e4a5ebe`.
- `package-lock.json` SHA-256: `41a032eb58514c68f88d6f03168bbed7f46f731567a9f862618ebc3185b9f17a`.
- Mobile package: 204 files, sorted `path\0sha256\0bytes\n` tree SHA-256 `45a333f884aeb9b4820fb9775c8fffed40ea4fd57c4b086d4bd80648be9d73af`.
- `dist/mobile/index.html`, copied Android HTML, and APK-embedded HTML SHA-256: `97261e3dcdd8b24ed5ffe6d9a541243f975f17ee4e2c13404d02c93e3c87c768`.
- Fresh debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 35,378,471 bytes, SHA-256 `7386f044fde0cfda9a9517062b789c99c0de744aa951ae7a1128322700ba23bb`.
- Android test APK SHA-256: `f12368f1bc0f9011a85d6b1a0da6c7796d7e022396d89c72d339f16ca958cb20`.
- App ID `com.amadutown.kicklab`, version `1.0` / code `1`, min/target SDK `24/36`. APK permissions are `VIBRATE` and the app-scoped AndroidX dynamic receiver permission; no `INTERNET` permission.

## Checks and physical observation

`npm ci --no-audit --no-fund`, `npm run mobile:check` (11/11), `npm run check` (323/323 plus web and Pages checks), `npx cap sync android`, and Gradle `assembleDebug testDebugUnitTest lintDebug assembleDebugAndroidTest` passed. Gradle used Android Studio JDK and the installed Android SDK. The APK was installed with `adb install -r` on authorized USB serial `57221FDCH007BA` (Pixel 10 Pro, Android 17/API 37); existing app data was preserved. Physical instrumentation returned `OK (6 tests)`.

On the physical device in landscape, Home rendered visibly and Fight opened. After entering Race, the display remained on the white Capacitor splash screen for at least nine seconds. The live packaged page independently reported `data-kicklab-mode=race`, `data-kicklab-view=game`, and visible Race preflight controls. Android reported `MainActivity` as the focused and resumed window, with the app process alive. The mismatch is a rendered product failure, so the physical matrix stopped at that point. The app was force-stopped and the temporary local DevTools forward removed.

Privacy-safe screenshots cropped out the phone status and navigation bars:

- [Home before Race](../evidence/android-usb-pixel-home-before-race.png), SHA-256 `6ec1d2e92cd16dbecac74122771f1a218f22db417978f8dcf88e437b80a61fed`.
- [Race white screen after settling](../evidence/android-usb-pixel-race-white-screen.png), SHA-256 `ae45a102216e2dbc1a49e41fb249bc794bb272ea81319fe3d063455c11231e5e`.

## Remaining gate

Repair the physical Race paint failure in a separate narrow development lane, bind and rebuild a new APK, then rerun physical three-lab journeys, TalkBack and accessibility, lifecycle, offline, storage, sustained performance and thermal, and bounded zero-egress checks. No Race heat, Kick journey, complete Fight journey, TalkBack spoken review, offline run, storage failure test, sustained performance comparison, or network trace was completed here. Thermal status was `0` at the stop, which is not a sustained thermal result. Native dependency notice reconciliation and owner package review remain open. No signing beyond the local debug build, merge, deployment, upload, distribution, store action, or release occurred.
