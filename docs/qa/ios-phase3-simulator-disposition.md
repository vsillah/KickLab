# iOS Phase 3 simulator-only disposition

**Owner decision, 2026-11-08:** KickLab iOS Phase 3 is **simulator-qualified only** for the exact temporary candidate below. This is a bounded iOS disposition, not qualification of the combined iOS/Android native gate, a physical device, an integrated PR head, or a releasable build.

## Exact candidate and evidence boundary

- Base `origin/main`: `c57ac3b542cbd0df83a874ff5746e65fef4b493b` (rechecked 2026-11-08).
- Draft product PR heads: #191 `f098a6bc27f13c429388fe42846b9ebdc80b20a2`; #192 `dd133505912d925c151b4cf2eb7ee2bab7db1138`; #193 `3f89529076f519fc0ebd5e4f776ad22ff9b748e1` (rechecked 2026-11-08). Preserve these branches and bindings; none is merged by this decision.
- Draft unsigned iOS PR #185: `d8cfd69ddf720356d988234ef161ed07d1877578`. Its tracked historical [checkpoint](ios-c57ac3b-package/README.md) records an older package and Race cockpit failure. The later simulator evidence below uses a **temporary detached combined candidate**, not the published PR #185 head alone.
- Temporary candidate: `/tmp/kicklab-race-reconcile` at `15f8881d0cef6522adda8b5b5f51f36dbafdac23`, with two uncommitted rights-ledger row corrections. The 204-file `dist/mobile` tree digest is `436c80bf6026e4856d3aa3209f319d71ede4952fc86c9cde43252d8ca6bd895d`; mobile HTML SHA-256 is `079ed4e4aa5b71fb7ceb63f82ded577e77d10e1334362d91d5b569bbb649873e`. These files were copied into ignored build locations in the iOS worktree. Unsigned Simulator executable SHA-256 is `def647eeeb6c57a38324ff3b6334744f428abf5a21a3bcda010da94339df6e56`. No tracked product or PR branch change resulted.
- iPhone 17 Pro Simulator, iOS 26.5: Captain-reported native Race Location, Route, Vehicle, Garage, Grid, Start heat, live driving, finish and settled result. Native result screenshot `/tmp/kicklab-native-result.png` has SHA-256 `8528c93633a28fbcb65fc4f794b67e04eac4f6a8443575987cdbd6e33206ed14`. These screenshots were visually inspected in the iOS lane.
- Captain-reported OS Reduce Motion run: Grid displayed `Still preview · reduced motion or Canvas mode`, Start heat entered live play, and the result settled. Grid screenshot `/tmp/kicklab-reduced-after4.png` has SHA-256 `e6873f14b4ef74d5a35d177c15b4d0442f47c9f7d76c9cdd505b7a856f7e4fb6`; result screenshot `/tmp/kicklab-reduced-settled.png` has SHA-256 `8efbc3340abd7a857cf1055ca76984051ca6ac9e0bd3a537b945ae20bc091f43`. The simulated Reduce Motion setting was reported restored to off.
- Captain reports that continuous `nettop -n -x -L 0` sampling of `com.apple.WebKit.Networking` during both journeys produced headers only, with no socket rows or byte counts. No raw trace was supplied to this lane; this remains captain-observed network evidence, not an independently rechecked packet capture. The screenshots alone do not establish zero egress.

## Mandatory pre-release device gates

Physical-device VoiceOver, touch and gestures, lifecycle/interruption, thermal behavior and performance are **not run and not qualified**. `xcrun xctrace list devices` listed only the Mac and Simulators on 2026-11-05 and 2026-11-08. The physical-device cases remain mandatory before release, with exact installed-binary binding and case results required. Simulator reduced-motion or browser accessibility evidence does not pass physical VoiceOver or the full accessibility gate.

Keep draft PRs #191, #192, #193 and #185 open with their exact bindings. No merge, distribution signing, upload, store action, submission, distribution or release is authorized by this disposition. Any integrated build must be rebuilt, rebound and reviewed against its own exact package and executable before advancing qualification.
