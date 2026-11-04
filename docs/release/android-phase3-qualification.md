# Android Phase 3 unsigned qualification checkpoint

**Status:** partial; draft PR #15 is not a native qualification or release gate. This checkpoint restacks the Android-only shell onto `b574444ab86491e46b7b0474ee77b38800216c5b`. The approved plan is `KL-P3-PLAN-20261103-F101D92-001` at SHA-256 `2d0375d9287bd58975102cd9e858b8168f9ff19f4944e62ffdca7e9c92287f5b`.

## Artifact and source binding

- Main after product baseline `a0be10e6cb23f9d13b8cba4078568b500165359a` changed documentation only.
- `npm ci`, `npm run check` (319 tests), and `npm run mobile:check` (7 tests) passed before native work. The same commands passed again after the Android shell was added.
- The generated mobile package has 204 files. Sorted `path\0sha256\0bytes\n` tree SHA-256: `9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6`.
- `dist/kicklab.html` SHA-256: `4c421ca7210d958927b9914c635f3042a3e5903ef3ba751a121648fd09a477db`. `dist/mobile/index.html`, the copied Android asset, and the HTML inside the debug APK share SHA-256 `9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d`.
- Debug APK SHA-256: `1755cc4bf58ff9e27d14fae0d74829fcfa08278d2c2585efe76b7686dc3651c7`; latest test APK SHA-256: `df419d9bf27f06154fac0c8c2468823270c5bb24897747ad156586bf977a55a8`. These are local debug artifacts, not signing or distribution artifacts.

## Native inspection and runs

| Area | Observed result |
| --- | --- |
| Toolchain | Capacitor Android 8.5.3, Android min/compile/target SDK 24/36/36, Gradle 8.14.3, Android Gradle plugin 8.13.0, JDK 21. `testDebugUnitTest lintDebug assembleDebug assembleDebugAndroidTest` passed, 358 tasks. |
| Manifest | Merged debug manifest has no `INTERNET` permission, disables backup and cleartext traffic, and has no file provider. It includes Haptics' `VIBRATE` permission and AndroidX's app-signature dynamic-receiver permission. AndroidX adds a nonexported startup provider and a profile-install receiver protected by `DUMP`; no application endpoint or analytics provider was found. Capacitor's built-in `CapacitorHttp`, cookies, WebView, and SystemBars bridges still register; OS network permission is absent. |
| Dependency and notices | The direct Android runtime graph is AppCompat 1.7.1, CoordinatorLayout 1.3.0, Core SplashScreen 1.2.0, Capacitor Android, App, Haptics, and Capacitor's empty Cordova plugin module. The packaged web notice is present and unchanged. Complete resolved native license/notice mapping is still open. `npm ci` reported four moderate audit findings; no dependency was silently upgraded. |
| Clean API 37 phone emulator | `Medium_Phone_API_37.0`, fresh data, all four instrumented tests passed in 37.256 seconds. Checks cover packaged local resources, responsive viewport, profile/legacy persistence after activity recreation, and held input cancellation on lifecycle interruption. |
| Clean API 35 tablet emulator | `Medium_Tablet`, fresh data, four baseline instrumented tests passed in 26.75 seconds. A follow-up five-test suite passed in 15.889 seconds and added packaged Home entry checks for Fight and Kick; the existing lifecycle test enters Race and holds/releases its gas control. Wi-Fi disabled and package data cleared after the baseline suite; offline launch rendered the profile setup and local previews. Privacy-safe still: [offline tablet launch](../evidence/android-phase3-tablet-offline.png), SHA-256 `33de1251e846919fb32c49a3b1d21291f9caf0d060add798a35c1cbefd8132d7`. |
| Physical phone | Paired wireless Pixel 10 Pro was found via `adb mdns services` and `adb devices -l`; no previous KickLab installation was present. The first four-test run had one `ActivityScenario.recreate()` failure while the device was Dozing. After waking it, the rerun lost wireless ADB before completion. Physical qualification remains **unresolved**. |
| Accessibility | TalkBack on the tablet exposed 112 accessibility nodes, 88 labeled, including the three lab choices and profile controls on Home. No complete focus order, spoken interaction, zoom, contrast, or non-canvas gameplay review was completed. |
| Performance | Tablet cold activity start reported 897 ms and an immediate process PSS of 87,526 KiB. `gfxinfo` had only three startup frames, too few for a frame-pacing conclusion. Thermal and sustained memory measurements remain open. |

## Remaining gates

1. Run actual Fight, Race, and Kick journeys on clean phone/tablet emulator and stable physical hardware; include offline restart, interruption, local deletion, migration, profiles/progression, 3D/Canvas fallback, reduced motion, and storage failure/recovery.
2. Complete TalkBack focus and spoken-name testing, text scaling/zoom and contrast at the gameplay surfaces; qualify non-canvas alternatives.
3. Finish resolved native dependency license/notice mapping and review the four npm audit findings against the exact lockfile. Confirm runtime traffic with a bounded device trace despite the absent network permission.
4. Measure repeated startup, active gameplay frame pacing, memory, thermal behavior, and asset budget under real play. Record a privacy-safe playable walkthrough from the exact final artifact before any client-facing Human QA.

No signing identity, store record, upload, provider, DNS, policy publication, distribution, or release action is part of this checkpoint.
