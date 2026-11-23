# iOS unsigned qualification checkpoint at f53f968

**Stop:** the iPhone Fight control failure from the prior exact build persists. This checkpoint does not replace the earlier package-bound record in [README.md](README.md); it rebases the finding to the current deployed main and package.

- Main: `f53f9684b7f8d7dfd2dbcb30b8a89737c7c77d30` (merged PR #186).
- Approved plan: `KL-P3-PLAN-20261103-F101D92-001`, SHA-256 `2d0375d9287bd58975102cd9e858b8168f9ff19f4944e62ffdca7e9c92287f5b`.
- Mobile package: 204 files; sorted path/hash/bytes tree SHA-256 `d463be254424423915ba2b53f9e1b41a7807bd0c803729dc9b47d733afeed6af`.
- Mobile and copied iOS `index.html`: SHA-256 `a7990c5188fca0b90d81492dba3aa2fcad7ac33d0faaf66e7416ae56eea22d2d`.
- `package-lock.json` with `@capacitor/ios@8.5.3`: SHA-256 `659f7f97e2fc17948ee2383d183dc0b83d0ede1b4339061b64d45e5dc3508550`.
- Unsigned Xcode 26.6 Debug executable for iPhone 17 Pro / iOS 26.5: SHA-256 `dbd604548356fca9874a82292c4f1a72d3701b27bd97e815ea296261b2863c7d`.
- [Live Fight screenshot](iphone-fight-f53-live-no-controls.png): SHA-256 `75a65b0734e2ff5f35cbc57bd5a0b78e656682c28ff32b4e4eeb49319308701e`. The image has synthetic local profile data only.

`npm ci`, `npm run check` (321/321), `npm run mobile:check` (9/9), `npx cap copy ios`, and an unsigned `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` passed. The iPhone home rendered below the status bar and showed the PR #186 Total points, Level and Awards controls; the saved local profile and 40 XP remained after installation of the new package. Entering Fight again showed no on-screen punch or movement controls while HP fell from 100 to 75. The Fight product CSS and runtime were not edited in this iOS lane.

The iPad matrix from the earlier exact package is historical and was not rerun against this binary. Offline/lifecycle, deletion, migration, backup, VoiceOver, focus/names, text/zoom, contrast, reduced motion, Canvas fallback, startup/frame pacing/memory, full asset budget, runtime egress trace, and physical devices remain unqualified at this new head because the product gate failed. Native static declarations and notice inventory from the earlier record require exact-binary recheck before any qualification claim. No signing, credentials, provider change, store record, upload, distribution, submission, or release occurred.
