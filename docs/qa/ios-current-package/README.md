# Unsigned iOS qualification at the current package

Historical checkpoint for main `c0de978`. The [f53f968 checkpoint](f53-checkpoint.md) confirmed the same iPhone Fight control failure on a newer 204-file package. The [d9f8be2 checkpoint](d9f8be2-checkpoint.md) records a fresh unsigned build after the merged Fight fix; its Fight behavior remains unverified because Simulator touch input is blocked.

**Result: stopped on an iPhone Fight product defect.** This packet records checks completed before the stop; it does not qualify the full iOS matrix.

## Exact binding

- Main: `c0de978ea85570fa17cb32b97009e8134c5dbf7e` (includes PRs #183 and #184).
- Approved plan: `KL-P3-PLAN-20261103-F101D92-001`, SHA-256 `2d0375d9287bd58975102cd9e858b8168f9ff19f4944e62ffdca7e9c92287f5b`.
- Current 204-file mobile package tree: SHA-256 `b4895a7d760b24f6540e4929aea2cf92de12a527aab4cdf0e8dea89d87131e5c`.
- Copied `index.html` in the app and `dist/mobile`: SHA-256 `21883e28d61080eeed75a7fa39d0b54a5266c9a0d88f9cbae0377ba0fb182091`.
- Added `@capacitor/ios@8.5.3`; resulting `package-lock.json`: SHA-256 `659f7f97e2fc17948ee2383d183dc0b83d0ede1b4339061b64d45e5dc3508550`.
- Xcode 26.6, iOS 26.5 Simulator, unsigned Debug `App` executable: SHA-256 `cd72ba8a2d5f4f43354b1cd5434f93fee328895b43a17294210cbb01fb7173e3`.
- iPhone 17 Pro `A5E30E83-9A15-44AE-A98F-1F0626D96331`; iPad Pro 13-inch M5 `3511B514-6BD6-4782-8D08-A18FB9EBCA94`.

## Observed behavior and stop

The merged safe-area fix clears the iPhone status bar and Dynamic Island. iPad home was inspected in portrait and landscape; the three lab cards and profile controls remained inside visible bounds. On iPad, Fight reached live play, Race reached its run start, and Kick rendered the local 3D stadium. The selected synthetic `Lab Rookie` profile and its 20 XP were still present after process termination and relaunch.

On iPhone portrait, Fight entered live play, but the punch and movement controls were absent from the viewport. Scrolling within the game did not reveal them. [The live-round Simulator screenshot](iphone-fight-live-no-controls.png), SHA-256 `851c821d10a1d28db7f8b6b9f52547e640404ad982a43c90689d22633c09348a`, shows 100–100 HP with no visible controls. The player then lost HP until `KNOCKED DOWN`; [the result screenshot](iphone-fight-controls-missing.png), SHA-256 `b54581496687c39ab2136d04e18b80fafbedb48d24db32938ce535ac0bdc9860`, shows the same empty control area. This is a product behavior defect requiring a separate scoped lane. No product source or package bytes were changed here.

## Native inspection before the stop

- SwiftPM resolves only `capacitor-swift-pm` 8.5.3 at revision `4c7f346d16196e21fbe23d4a7a6fc7af62af6742`, plus local Capacitor App and Haptics packages. The app target minimum is iOS 15.0. Native/transitive notice placement remains to be completed before distribution.
- `Info.plist` declares no camera, microphone, location, contacts, photo, or other usage-description permissions, no background mode, and no app transport exception. The project declares no custom entitlement. The app target bundles a no-tracking, no-collected-data `PrivacyInfo.xcprivacy`; Capacitor and Cordova frameworks carry their own manifests. These static observations do not answer final store privacy questions.
- The packaged CSP limits connections to same-origin assets and local blobs; `server.allowNavigation` is empty and no remote server URL is configured. A single `lsof -nP -a -p <Simulator app PID> -i` snapshot showed no app-owned Internet socket. No packet capture or complete online/offline egress trace was run.
- The unsigned simulator `.app` occupies about 40 MB. Startup timing, frame pacing, memory/thermal behavior, backup/restore, real offline launch, VoiceOver, focus/names, text size, zoom, contrast, reduced motion, Canvas fallback, storage recovery, local deletion, profile migration, iPhone landscape, and physical devices remain unqualified after the stop.

## Reproduction and validation

`npm ci`, `npm run check`, and `npm run mobile:check` passed on the exact main package before generation (321/321 checks; 9/9 mobile checks). Generate with `npm install @capacitor/ios@8.5.3 --save-exact`, `npx cap add ios`, `npx cap copy ios`, then build with:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,id=A5E30E83-9A15-44AE-A98F-1F0626D96331' -derivedDataPath /tmp/kicklab-ios-p3-derived CODE_SIGNING_ALLOWED=NO build
```

Install and launch `App.app` with `xcrun simctl`, save the default local player, and select Fight on iPhone portrait. The unsigned Xcode build and `plutil -lint` for `Info.plist` and `PrivacyInfo.xcprivacy` passed. No signing, credentials, store record, upload, provider change, distribution, submission, or release occurred.
