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
| Responsive iPhone layout | Passed at 402 x 874 portrait and 874 x 402 landscape. The app wrapper and full-screen Profile sheet clear all four iOS safe-area insets; the wordmark, Profile title, Close control, lab selection, Fight stage, controls, and HUD remain usable. The synthetic nickname uses intentional ellipsis in the compact landscape profile card. |
| Profile persistence | Passed; synthetic player `AminaQA` remained selected after a full process terminate and relaunch. |
| Gameplay input | Passed; a held Cross input produced a scored `Cross · counter` event and updated both fighters' HP. |
| Lifecycle | Passed; Home/background placed the Fight stage into `TIME-OUT`, foregrounding did not auto-resume, and a deliberate stage tap resumed play. |
| Haptic fallback | Passed for graceful behavior; the Capacitor haptics call did not block or crash gameplay. Physical vibration is not qualified by Simulator. Simulator logs report the expected missing CoreHaptics pattern library. |
| Offline/no-egress package | Passed static packaging checks: `server.allowNavigation` is empty, the mobile package contains no external script/link resource, and the only HTTP URL literal is the inert W3 XHTML namespace embedded in Three.js. No external application request was observed during the recorded local flow. |
| Privacy declaration | The app target includes an empty-data, no-tracking `PrivacyInfo.xcprivacy`. This does not replace later signed archive/App Store privacy review. |

Packaged artifact SHA-256 values:

- `ios/App/App/public/index.html`: `a347eb3474c53520f018fd06182fed1bf05beb64ce8079e249406c3becb2b610`
- `ios/App/App/public/kicklab-mobile-manifest.json`: `720c70dffc91e7087c769634f324e3f406a467324645fb82e2a4213888f6e2a1`

## Review artifacts

- `02-ready.png` — corrected portrait lab chooser with the wordmark below the Dynamic Island.
- `03-synthetic-profile-saved.png` — corrected full-screen Profile and Stats sheet with its title and Close control inside the top safe area.
- `04-lifecycle-resume.png` — foreground return held in `TIME-OUT`, requiring player action.
- `05-relaunch-persistence.png` — selected synthetic player preserved after terminate/relaunch.
- `06-landscape-lab-selection.png` — landscape mode selection with all three labs visible and clear of the left and right system insets.
- `07-final-build.png` — final corrected portrait build, including the bundled privacy manifest, with local profile continuity intact.
- `kicklab-ios-capacitor-walkthrough.mp4` — playable 69-second H.264, 720 x 1566, 60 fps walkthrough covering corrected top chrome, local Profile and Stats, Fight, lifecycle timeout/resume, and process relaunch. SHA-256: `1884ead90e1ddc8e18d46cebc5d3f3c17905ed25948cc19683f05c670eb8503d`.

All names and progress shown are synthetic local fixture data. The evidence contains no credentials, account records, private communications, or production customer data.
