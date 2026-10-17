# KickLab native release qualification roadmap

This is a finite seven-gate evidence path. A later gate cannot inherit qualification from an earlier gate, and build success never substitutes for rendered or device evidence. The machine-readable status is in [`mobile-qualification-status.json`](mobile-qualification-status.json).

| Gate | Required evidence | Current shared-lane state |
| --- | --- | --- |
| 1. Browser baseline | Exact commit, built artifact hash, desktop/mobile interaction smoke, storage continuity, offline check, console log, screenshots/MP4 where client-facing review applies | `not_qualified` — automated checks only |
| 2. Unsigned iOS Simulator and Android emulator | Generated platform project from the shared config, exact simulator/emulator and OS, clean install, offline launch, Fight/Race/Kick round, background/resume, held-input cancellation, local-profile restart | `not_run` |
| 3. Physical devices | Named supported devices/OS versions, offline install and cold launch, touch/gesture/audio/haptic behavior, memory/thermal observations, background/interruption recovery | `not_run` |
| 4. Accessibility | VoiceOver and TalkBack, keyboard/switch path where supported, dynamic text/zoom, contrast, reduced motion, focus order/names, canvas alternatives | `not_run` |
| 5. Signing | Separately approved identifiers, certificates/keystore, provisioning, entitlements, secrets handling, reproducible signed archives | `not_run` |
| 6. TestFlight and Play internal testing | Separately approved store records, privacy/data-safety declarations, uploaded exact builds, tester access, install evidence, crash/feedback intake | `not_run` |
| 7. Feedback and release candidate | Triaged tester evidence, fixed blockers, rerun affected gates, version/build numbers, release notes, rollback decision, explicit release approval | `not_run` |

## Evidence rules

- Allowed status values are `not_run`, `not_qualified`, and `qualified`.
- `qualified` requires evidence paths, exact commit/artifact identity, dates, devices or runtimes, commands, observed results, and reviewer ownership.
- A browser artifact, CI pass, scaffold, simulator launch, signed archive, or store upload proves only its own gate.
- Any source or dependency change after qualification invalidates affected downstream evidence until it is rerun against the new artifact hash.
- Signing, distribution, store submission, provider activation, credentials, and release remain explicit authority gates.

## Platform-lane handoff

Amina owns iOS project generation and iOS Simulator evidence in her branch. Yaa Asantewaa owns Android project generation and emulator evidence in her branch. Each starts from the merged shared-foundation commit, runs `npm ci` and `npm run mobile:check`, generates only its platform project, and confirms the copied web artifact hash matches `dist/mobile/kicklab-mobile-manifest.json`. Neither platform lane may mark physical-device, accessibility, signing, internal-testing, feedback, or release-candidate gates qualified without the evidence listed above.

The Integration Captain must provide the exact merged foundation commit before either lane starts. Amina must preserve the earlier SwiftUI/WKWebView experiment unchanged and use a clean Capacitor worktree rather than overwriting or deleting it.

```sh
# Amina, in a clean iOS-only branch/worktree based on the supplied merge commit
npm ci
npm run mobile:check
npx cap add ios
npx cap copy ios

# Yaa Asantewaa, in a clean Android-only branch/worktree based on the same commit
npm ci
npm run mobile:check
npx cap add android
npx cap copy android
```

Those commands generate unsigned local projects only. Each lane must commit only its platform directory and any narrowly required shared-config correction, open a draft PR, and report the copied artifact hash plus simulator/emulator results. Neither lane may install missing SDKs, sign, upload, distribute, create store records, alter accounts, or activate providers without a separate authorization.
