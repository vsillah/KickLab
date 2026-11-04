# iOS Fight control restoration checkpoint

Base: deployed `f53f9684b7f8d7dfd2dbcb30b8a89737c7c77d30`.
Scope: shared Fight controller availability plus native-only Fight viewport geometry. PR #185's qualification shell was copied into this worktree only for local unsigned validation; its tracked source and draft PR were not changed.

## Cause and correction

At phone widths the shared controller initialized collapsed, hiding the Fight action pad while Rex continued to attack. In the native portrait package, the 9:20 canvas also placed its bottom-anchored controller below the visible iPhone screen. Fight now expands on entry and refuses collapse; the native package bounds the Fight canvas to the visible viewport. Landscape uses a compact native-only Fight control row with 44 px directional targets.

## Exact package

- `dist/mobile/index.html`: SHA-256 `a7644ca408ac2d53378505689cc5c07cf94cf9dc3b01e93b0961cddc24079e1b`, 2,660,117 bytes. Copied iOS HTML matched byte for byte.
- Unsigned iOS Simulator executable: SHA-256 `b4bd13a5c51d409250037a750197e4b48a873f7606b1b16483e7290680e564c4`.
- Browser/native-package runtime matrix: 390×844, 768×1024, 1440×900 browser; 390×844, 844×390, 820×1180, 1180×820 native package in Chromium. Each observed Rex damage with enabled movement and Jab, a player attack, and pause/resume. No page error or external request was observed. This is responsive package emulation, not Simulator proof.
- iPhone 17 Pro / iOS 26.5: unsigned Xcode build passed. On the installed app in portrait, HP fell to 75 with the controls present; tapping Jab reduced Rex to 85 HP. The installed app retained the existing device-local profile across reinstall.
- iPad Pro 11-inch (M5) / iOS 26.5: exact unsigned binary launched in portrait. Fresh profile setup blocked a live Fight run; landscape live Fight was not run on this Simulator.
- Reduced-motion responsive package matrix passed. The package remains local and keeps its restrictive CSP. No physical-device, VoiceOver, offline lifecycle, complete runtime egress, or performance qualification is claimed here.

## Review artifacts and gate

The playable MP4 shows the exact mobile package at 390×844, Rex damage with visible controls, Jab reducing Rex HP, pause and resume. It is browser-hosted package capture, not an iOS Simulator screen recording. The included iPhone screenshot is from the responsive package matrix. The actual iPhone Simulator portrait was visually inspected separately.

**Human QA pending.** On the iPhone Simulator in landscape, the controls are reachable and the HP bars remain visible, but the compact dock covers most of the fighters. The iPad Simulator live Fight matrix is incomplete. Keep this PR draft and do not merge or deploy until both presentation and Simulator gates pass. No signing, credentials, providers, store records, uploads, distribution, submission, or release is authorized.
