# Race highlight Download: V1 decision assessment

Prepared 2026-10-28 against exact `origin/main` `40e12647025ea8b7fa405b9fd8346fd435287465`. **Decision pending Vambah.** This is a product and privacy recommendation, not a code change, store declaration, legal clearance, or native qualification.

## Current behavior and boundary

Merged PR #125 removes the Race highlight OS Share control and `navigator.share`/`navigator.canShare` path. In `src/game/50b-race-competition.js`, a supported 3D replay is still captured locally with `canvas.captureStream` and `MediaRecorder`, made into `kicklab-race-highlight.webm`, previewed locally, and offered through **Download file** in `src/index.html`. When 3D recording is unavailable, the existing replay/text and still-image fallbacks remain. PR #125's browser QA exercised local WebM download and absence of Share API calls at phone, tablet, laptop, and desktop sizes; it did not qualify the native WebView, operating-system file destination, backup behavior, or final store binary. Private Party QR display and pasted codes are a distinct offline feature.

`Download file` exports a copy that may leave KickLab-controlled storage. The local delete-all control from PR #124 removes app-owned storage and caches, but its confirmation correctly says downloaded files outside KickLab remain. The application cannot promise to erase copies in Files/Downloads, cloud backups, or copies a player later sends elsewhere. A user-directed local export is distinct from the removed direct OS Share action; do not infer the final Google Data Safety answer from source inspection alone. The native file path, permissions, platform backup behavior, and any other included SDK traffic require final-build evidence.

## Options

| Choice | Benefit | Release burden |
| --- | --- | --- |
| **Defer Download for V1; keep in-app replay** | Keeps the Race result and review experience while avoiding a child-facing file export whose storage and deletion behavior are not yet proven. Fits the paid-upfront, local-first 9–15 scope. | A separate reviewed product change and browser/native regression are needed. Do not claim this is already implemented. |
| Keep Download | Lets a family save a local WebM highlight. Browser capture worked in PR #125's tested cases. | Confirm the precise native download destination, fallback, permissions, accessibility, file naming/content, retention and backup behavior; make export and deletion boundaries clear to guardians; reconcile Apple Kids/category and Google Families/Data Safety answers with the final binary. |

**Recommendation: defer Download from commercial V1 while retaining local in-app replay and results.** The export is optional to the three-lab learning loop, while its native storage and deletion behavior is unqualified. Reconsider it as a later guardian-reviewed feature after device evidence and a clear policy. This recommendation does not authorize removing the control; until a separate product PR lands, the release worksheet must treat Download as present.

## Decision and acceptance gate

Vambah chooses **defer** or **keep** and records the chosen Apple primary audience/category path. If **defer**, a separate client-facing lane removes only file export and related copy, preserves 3D replay, Coach/result review, Canvas fallback, profiles, and Private Party, and runs exact-head responsive browser QA with zero external requests and a privacy-safe MP4. Captain review and Human QA apply to that visible change. If **keep**, a native iOS/Android test must show actual exported file destinations, permission prompts, offline behavior, device backup/restore and local deletion limits, failure/cancel behavior, accessibility, and final privacy/store copy. Either path requires exact-build Apple/Google declaration review, no runtime egress, source rights closure, and all remaining commercial gates. No console entry or release action follows from this assessment.

Primary policy sources checked 2026-10-28: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple Kids category](https://developer.apple.com/app-store/categories/), [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Google Families](https://support.google.com/googleplay/android-developer/answer/9893335), [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469), and [Google content rating/IARC](https://support.google.com/googleplay/android-developer/answer/9859655). Recheck at submission against the exact signed binary and console questionnaire.
