# iOS Fight control restoration checkpoint

Base: deployed `f53f9684b7f8d7dfd2dbcb30b8a89737c7c77d30`. Branch: `codex/kicklab-ios-fight-controls`; draft PR #187. PR #185's iOS qualification shell was copied locally for unsigned Simulator validation and is not tracked here.

## Correction

The shared Fight controller opens on entry and stays available during live play, including after another lab left the controller collapsed. The native package bounds Fight's portrait canvas to the viewport. In short landscape, it frames the fighters inside a compact canvas and lays the control deck below it, with readable HP and reachable D-pad and punch controls. Tablet landscape uses the same separate deck layout. Game mechanics and browser layout stay on the existing path.

## Exact package and checks

- `dist/mobile/index.html` SHA-256 `715fb8882f4c8082d61bb3986928242dc8a812a9e0662ab0a9b8e7484c6feb8f`, 2,662,073 bytes. The copied iOS app HTML matches byte for byte. Bundle identifier: `com.amadutown.kicklab`. Unsigned Simulator executable SHA-256 `b4bd13a5c51d409250037a750197e4b48a873f7606b1b16483e7290680e564c4`.
- `npm ci`, `npm run check` (322/322), `npm run mobile:check` (10/10), `node --check scripts/qa-ios-fight-controls.mjs`, and `git diff --check` passed. The exact-file rights ledger and action map were rebound to this new HTML hash; H01 remains pending owner review for this hash. No signing or release authority is inferred.
- Seven responsive package cases passed: browser 390×844, 768×1024, 1440×900; native package 390×844, 844×390, 820×1180, 1180×820. Each observed Rex damage with Fight controls reachable, a player attack, and pause/resume. The native cases checked every visible D-pad and punch control within the viewport. Reduced motion was enabled. No page error or external request was observed. These cases use Chromium to exercise the packaged HTML; they are distinct from the iOS Simulator run.
- iPhone 17 Pro / iOS 26.5 Simulator: the installed app showed live Fight in portrait and landscape; Rex dealt damage while the control deck stayed present, and Jab reduced Rex HP. In short landscape, both fighters appeared above the separate controls. The device-local profile survived reinstall. The final source change after that iPhone interaction affected only tablet-width CSS; the final app asset was reinstalled on the iPhone, but a second post-install live Fight interaction was not recorded.
- iPad Pro 11-inch (M5) / iOS 26.5 Simulator: a fresh profile was created through the actual app UI. On the final installed package in portrait, Rex dealt damage and Uppercut reduced Rex from 100 to 82 HP. During the same live run, rotation to landscape kept both fighters, HP, D-pad, and punch controls visible; Jab reduced Rex from 82 to 67 HP. Terminate/relaunch returned to Home without resuming the incomplete run; `Lab Rookie` and earned XP persisted. No test profile was injected into this native app.
- In reduced-motion Chromium package sampling during live Fight, 180 animation frame intervals at 844×390 and 1180×820 each measured p95 8.9 ms and maximum 9.3 ms on this host. This is a responsive package cadence check, not a physical-device performance claim.
- The native app process had no internet socket in a point-in-time `lsof -a -p` observation. This and the package request audit are bounded evidence, not a packet-level proof of all runtime egress. Physical-device performance, VoiceOver, signing, distribution, submission, and release are outside this qualification.

## Review artifacts and gate

- `ios-fight-controls-exact-package.mp4`: 390×844 portrait and 844×390 landscape packaged HTML in Chromium, including damage, attack, pause, and resume.
- `ios-fight-ipad-native-exact-package.mp4`: final unsigned iPad Simulator package, portrait attack and live landscape rotation/attack. The capture is orientation-corrected and encoded for playback without changing the app frames.
- Both videos use local synthetic/device-local `QA Player` or `Lab Rookie` profiles and contain no credentials or customer data.

**Human QA pending.** PR #187 remains draft. No merge or deployment in this lane. The exact current localhost review build and head commit must be loaded and reported in the handoff. H01 owner review remains separate before any commercial release path; no credentials, providers, store records, signing, uploads, distribution, submission, or release are authorized.
