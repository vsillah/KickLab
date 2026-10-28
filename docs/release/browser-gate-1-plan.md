# Browser Gate 1: exact-main evidence plan

Plan prepared 2026-10-28 for `0e4af0b8e8d7c678486f2006b03b73a838e9d749`. **Not executed by this documentation lane.** Gate 1 requires a fresh run after any product or build change. It does not qualify native simulator, physical-device, accessibility, signing, or store gates.

## Bind the artifact

1. In a clean worktree at the approved main SHA, record `git rev-parse HEAD`, `git status --short`, Node/npm versions, `npm ci`, `npm run check`, and `npm run mobile:check`. Hash `dist/mobile/index.html`, `dist/mobile/kicklab-mobile-manifest.json`, and every file in `dist/mobile`; preserve the manifest and command output. Confirm no remote URL in the artifact and `connect-src 'none'` in its CSP.
2. Start a fresh loopback server from **that** `dist/mobile` folder, for example `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist/mobile`. Do not reuse a prior port/process. Open `http://127.0.0.1:4173/index.html?rev=0e4af0b8e8d7c678486f2006b03b73a838e9d749` in the integrated Codex browser; capture the loaded document URL and response hash. The home flow may append trusted Race flags; record the final URL and assert they are the expected packaged flags.
3. Run a separate default-off check at the same URL without Race prototype flags and a direct flagged route that matches the home flow. No URL query may turn on camera scan, OS sharing in Private Party, accounts, public matchmaking, analytics, or remote transport.

## Viewports and paths

Use 360×800 and 390×844 narrow phones, 768×1024 tablet, 1113×834 laptop, and 1440×900 desktop. Exercise touch emulation on phone/tablet and mouse/keyboard on laptop/desktop. Record browser/OS version and device scale factor. Later native gates must repeat on named physical iOS and Android devices; browser emulation is not a substitute.

| Route/state | Positive path | Negative and recovery path |
| --- | --- | --- |
| `/index.html?rev=<SHA>` home → profile | Create made-up nickname, choose avatar, enter each lab; refresh and confirm the same local profile. | Empty/invalid nickname, storage denied/corrupt state; clear error and safe recovery without overwriting unrelated data. |
| Home → Fight | Complete a representative round with Classic and Analog; verify score, Coach result, pause/resume, local progress. | Miss/timeout, held-input cancellation, narrow control clipping, mute/reduced motion, background/return. |
| Home → Kick | Complete representative goal and miss paths across available Kick activity families; inspect 3D and fallback. | No-score, interrupted run, return/restart, safe-area clipping, accessible controls. |
| Home → Race → “Choose your location” | Select route, vehicle, Garage tune, grid, run, result, Coach review, Save & Exit/re-entry. Check Drag and Circuit lap wrap, at least one other route, Classic/Analog/Simulator, and 3D/fallback. | Invalid or missing media, no vehicle, unsupported WebGL, pause/pagehide, storage failure, blocked action and recovery. **Record product gap:** the location step currently lists Highland route cards; Marine and Forest require settings navigation. Decide whether this meets release onboarding before Gate 1 passes. |
| Race → Private Party | Create and display offline QR cards, manually paste challenge/response code, complete private exchange. | Malformed/expired/oversized code, cancel/abandon/restart, no camera prompt or OS share action, no public room. |
| Race results/awards | Review local result and replay where enabled; verify result is bound to current profile. | Assess separately whether highlight download/OS share is in release scope; it cannot be silently covered by a “no sharing” claim. |
| Profile/settings/data | Switch local profiles; verify legacy `impactlab.v1` / `impactlab.nick` migration and `kicklab.profiles.v1` continuity. | Data deletion path, cache/backup expectation, corrupt data and restart. If deletion UI is absent or incomplete, Gate 1 fails and a separate product change is needed. |

Capture a privacy-safe MP4 and screenshots for the changed and risky states at each width, masking nicknames or using synthetic names. Visually inspect the actual rendered page, not only DOM assertions. Click every introduced or affected visible action; document silent no-ops, clipped controls, obscured Coach text, horizontal overflow, and inaccessible labels. Include keyboard focus and reduced-motion checks, with native VoiceOver/TalkBack reserved for Gate 4.

## Network and local-data proof

- Instrument every browser request, WebSocket, beacon, worker fetch, navigation, popup, download, and permission prompt; preserve a sanitized HAR or request log with URL origin, method, initiator, status, and case ID. Zero requests outside `127.0.0.1:4173` and zero remote destinations are required across normal play, offline launch, denied network, failed media, malformed code, restart, and result export paths. A service worker or browser extension request must be distinguished from app traffic rather than ignored.
- Run with network access available and with offline mode after the initial package load. Confirm all three labs launch and complete locally. Verify zero camera/microphone/location prompts, no analytics/ad SDK, and no account or cloud path. For Private Party, verify code payload contains no unrelated profile history or secret and is only displayed/copied/pasted by the player.
- Record only storage **key names, sizes, and synthetic fixture hashes** in evidence. Test persistence after reload and browser restart, legacy migration, multiple profiles, corruption, and the eventual deletion control. Do not include real child data or raw private codes in screenshots, HAR, logs, or PR attachments.

**Pass condition:** every required path and viewport works visually and interactively, the exact file hashes match the approved build, all three labs complete, storage and offline cases pass, every blocked/error state gives a useful next action, zero app egress and unauthorized permissions are observed, and the location/deletion/export decisions are resolved. Any failed case gets a bounded defect with owner and rerun evidence; do not mark Gate 1 qualified from a prior PR, preview, stale tab, or selector-count smoke.
