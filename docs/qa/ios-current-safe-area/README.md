# Current-package iOS safe-area stop evidence

Status: **failed; qualification stopped before broader simulator and device testing**.

- Source branch: `codex/kicklab-ios-qualification`, generated from main `b574444ab86491e46b7b0474ee77b38800216c5b`.
- Product baseline: `a0be10e6cb23f9d13b8cba4078568b500165359a`.
- Approved plan: `KL-P3-PLAN-20261103-F101D92-001`, SHA-256 `2d0375d9287bd58975102cd9e858b8168f9ff19f4944e62ffdca7e9c92287f5b`.
- Generated package: 204 files, tree SHA-256 `9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6`; `dist/mobile/index.html` and unsigned app copy both SHA-256 `9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d`.
- Generated dependency lock after adding `@capacitor/ios@8.5.3`: SHA-256 `659f7f97e2fc17948ee2383d183dc0b83d0ede1b4339061b64d45e5dc3508550`.
- Xcode 26.6; iPhone 17 Pro Simulator `A5E30E83-9A15-44AE-A98F-1F0626D96331`, iOS 26.5; unsigned Debug binary SHA-256 `2543bbd40cf0cff6464eeff5246f6c59e6bd259fb77d2f7565b3da690231e966`.
- Screenshot: [iphone-17-pro-home.png](iphone-17-pro-home.png), SHA-256 `91933e54b525e0051036608ab15e7db3c97b1778517b5e5709b1bb0b8e739c34`.

The actual rendered home screen places the KickLab wordmark under the iOS status bar and Dynamic Island. This is visible at the top of the screenshot. The shipped `.wrap` rule has fixed block padding without a top safe-area inset. The earlier PR #13 added shared CSS for that inset, but its old product change was intentionally not copied into this fresh native lane. The observed overlap fails the current-package safe-area gate. No real player or customer data is present; the screenshot shows the default local `Lab Rookie` state.

Reproduction commands: `npm ci`, `npm run check`, `npm run mobile:check`, `npm install @capacitor/ios@8.5.3 --save-exact`, `npx cap add ios`, `npx cap copy ios`, then `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,id=A5E30E83-9A15-44AE-A98F-1F0626D96331' -derivedDataPath /tmp/kicklab-ios-qualification-derived CODE_SIGNING_ALLOWED=NO build`. Install the resulting `App.app` with `xcrun simctl install`, launch `com.amadutown.kicklab`, and capture with `xcrun simctl io ... screenshot`.

Pre-generation checks passed: `npm run check` 319/319 and `npm run mobile:check` 7/7. The unsigned Xcode build succeeded. The generated shell had no declared usage-description permissions or background modes in `Info.plist`, and no app privacy manifest was generated; these are preliminary observations, not a completed native privacy audit. All three labs, profile/deletion/migration, offline/lifecycle, accessibility, performance, physical devices, backup, and runtime egress remain untested at the current build. Product safe-area remediation requires its own scoped lane and rendered review before iOS qualification resumes. No signing, upload, store, provider, DNS, or release action occurred.
