# KickLab Capacitor iOS Simulator evidence

## Scope

- Branch: `codex/kicklab-ios-app`
- Baseline commit: `e2f89d5ef0f0d8651da59be90a95fb6ad378d8c6`
- App identifier: `com.amadutown.kicklab`
- Native dependency: `@capacitor/ios@8.5.3` (exact, matching `@capacitor/core@8.5.3`)
- Simulator: iPhone 17 Pro, iOS 26.5, `A5E30E83-9A15-44AE-A98F-1F0626D96331`
- Signing, App Store Connect, provider credentials, and production activation were out of scope.

## Objective evidence

The unsigned Debug build completed with:

```sh
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=A5E30E83-9A15-44AE-A98F-1F0626D96331' \
  -disableAutomaticPackageResolution \
  CODE_SIGNING_ALLOWED=NO build
```

Result: `BUILD SUCCEEDED` with an iOS 15.0 deployment target and the expected bundle identifier.

This Mac's SwiftPM binary-artifact downloader stalled after resolving `capacitor-swift-pm` 8.5.3. The two official 8.5.3 framework ZIPs were downloaded directly, verified against the checksums in the pinned package manifest, and seeded only into disposable Xcode DerivedData. The repository keeps the normal official remote dependency and `Package.resolved` revision `4c7f346d16196e21fbe23d4a7a6fc7af62af6742`.

Verified release-asset checksums:

- Capacitor: `9316f568444411d362dcb4d1946e7572d4aef5d690c122ff6f1cb8a44a920c9f`
- Cordova: `bdcd8eab2d62a077efd76c3c8b9629e65ae7043c1462289a1e55de9be19bbf1f`

## Runtime checks

| Check | Result |
| --- | --- |
| Native launch | Passed; the packaged local HTML opened in the Capacitor shell. |
| Responsive iPhone layout | Passed at 402 x 874 portrait and 874 x 402 landscape. Profile setup, lab selection, Fight stage, controls, and HUD remained usable; the synthetic nickname uses intentional ellipsis in the compact landscape profile card. |
| Profile persistence | Passed; synthetic player `AminaQA` remained selected after a full process terminate and relaunch. |
| Gameplay input | Passed; a held Cross input produced a scored `Cross · counter` event and updated both fighters' HP. |
| Lifecycle | Passed; Home/background placed the Fight stage into `TIME-OUT`, foregrounding did not auto-resume, and a deliberate stage tap resumed play. |
| Haptic fallback | Passed for graceful behavior; the Capacitor haptics call did not block or crash gameplay. Physical vibration is not qualified by Simulator. Simulator logs report the expected missing CoreHaptics pattern library. |
| Offline/no-egress package | Passed static packaging checks: `server.allowNavigation` is empty, the mobile package contains no external script/link resource, and the only HTTP URL literal is the inert W3 XHTML namespace embedded in Three.js. No external application request was observed during the recorded local flow. |
| Privacy declaration | The app target includes an empty-data, no-tracking `PrivacyInfo.xcprivacy`. This does not replace later signed archive/App Store privacy review. |

Packaged artifact SHA-256 values:

- `ios/App/App/public/index.html`: `2e02281b0e8289ce93e01795ab9c5ce2b9de211eb7d301599302401117155319`
- `ios/App/App/public/kicklab-mobile-manifest.json`: `ec7a740d8f25e36291580cc74524735b766605f52daf04852cf41b6e8dc9caf2`

## Review artifacts

- `02-ready.png` — responsive profile setup state.
- `03-synthetic-profile-saved.png` — isolated on-device profile and stats.
- `04-lifecycle-resume.png` — foreground return held in `TIME-OUT`, requiring player action.
- `05-relaunch-persistence.png` — selected synthetic player preserved after terminate/relaunch.
- `06-landscape-lab-selection.png` — landscape mode selection with all three labs visible.
- `07-final-build.png` — final rebuilt app, including the bundled privacy manifest, with local profile continuity intact.
- `kicklab-ios-capacitor-walkthrough.mp4` — playable 69-second H.264, 720 x 1566, 30 fps walkthrough covering profile creation, Fight input, lifecycle timeout/resume, and process relaunch.

All names and progress shown are synthetic local fixture data. The evidence contains no credentials, account records, private communications, or production customer data.
