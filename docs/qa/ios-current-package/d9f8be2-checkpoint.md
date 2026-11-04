# iOS unsigned qualification checkpoint on merged Fight fix

This checkpoint replaces the old **current blocker** claim in the earlier `c0de978` and `f53f968` records. Those screenshots remain historical evidence only. PR #187 (`0082dacd0e60a7703cf9c7cf104646d4d3666a73`) merged as main `d9f8be2737eed45cb5fb96127cc5bf889c8f3df1`; the iOS qualification branch was rebased onto that exact commit. The prior missing Fight controls have **not yet been rerun or cleared** in this native binary.

## Exact package and build

- Generated mobile package: 204 files, deterministic path/content/length tree SHA-256 `dd47b34ef84d8ba9f9575cfe2b49f0ea24e295d363cb34b01f4471572b583c4c`.
- `dist/mobile/index.html` SHA-256: `715fb8882f4c8082d61bb3986928242dc8a812a9e0662ab0a9b8e7484c6feb8f`.
- `npx cap copy ios` completed. Every generated mobile file exists in `ios/App/App/public` with identical bytes. Capacitor also adds its two bridge files, `cordova.js` and `cordova_plugins.js`.
- Unsigned Debug Simulator executable SHA-256: `b5c32ad05174c0ee5fb00281b0e73e5175ce068b309a63e9ba756c2fe0b0d0f4`.
- Xcode 26.6, iOS 26.5 Simulator, iPhone 17 Pro `A5E30E83-9A15-44AE-A98F-1F0626D96331`.

## Checks completed

- `npm ci` passed; `npm run check` passed 322/322; `npm run mobile:check` passed 10/10.
- `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,id=A5E30E83-9A15-44AE-A98F-1F0626D96331' -derivedDataPath /tmp/kicklab-ios-d9f8be2-derived CODE_SIGNING_ALLOWED=NO build` returned `BUILD SUCCEEDED`.
- `plutil -lint` passed for `Info.plist` and the bundled app privacy manifest. The app manifest declares no tracking or collected data. `Info.plist` has no usage-description permissions, background mode, or App Transport Security exception. No custom entitlement file is present.
- `npm audit --omit=dev --json` reported zero production dependency vulnerabilities. The unfiltered `npm ci` audit reported four moderate issues in the development dependency set; no dependency was changed in this checkpoint.
- Installed and launched the exact unsigned app. [iPhone portrait home screenshot](iphone-home-d9f8be2.png), SHA-256 `e5b936b36f745eb12e030a7fb7a0984b498bd59cb153ef7e99432563e50fd655`, shows the wordmark below the Dynamic Island, three lab choices, standings, and the existing synthetic device-local `Lab Rookie` profile. The screen is privacy-safe. A single `lsof -nP -a -p 97987 -i` snapshot showed no socket; this is **not** a complete egress trace.

## Qualification stop

The Simulator app can be observed, rotated, installed, and launched, but its Computer Use coordinate click returns `Computer Use server error -10005: noWindowsAvailable` on repeated attempts. AX exposes Simulator chrome but not WKWebView controls. A keyboard Tab did not establish visible in-app focus. A window-level AX click inadvertently opened Race in landscape, confirming some input delivery, but it did not give a reliable way to select and exercise the required Fight control gate. The current Fight fix therefore remains **unverified**, not failed.

Do not treat the earlier missing-control screenshots as a present defect, and do not treat this checkpoint as native qualification. The remaining iPhone/iPad portrait/landscape Fight, Race, and Kick interactions, genuine damage, profile deletion/migration/corrupt or denied storage, VoiceOver, reduced motion, offline/lifecycle, performance, full permissions/dependency review, and continuous egress trace remain open. Resume only with reliable Simulator touch/AX interaction against this exact package or a newly rebound package. No signing, provisioning, upload, store, distribution, or release action occurred.
