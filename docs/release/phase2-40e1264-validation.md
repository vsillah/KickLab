# Phase 2 evidence reconciliation at merged PR #124/#125 base

Run 2026-10-28 from a clean branch of exact `origin/main` `40e12647025ea8b7fa405b9fd8346fd435287465`. Documentation only. This record supersedes the base binding in [the earlier validation](phase2-current-main-validation.md), which remains historical.

| Check | Result |
| --- | --- |
| Merge lineage | GitHub PR #124 `feat: add guardian local data deletion` merged as `39d9303b1b7cfaafcd275c1b3d2758ad52d56c06`; PR #125 `fix: remove Race highlight OS sharing` merged as `40e12647025ea8b7fa405b9fd8346fd435287465`. |
| Source review | Confirmed typed `delete` path in `src/game/49-profiles.js` and namespaced storage/cache deletion in `src/shared/profile-store.js`; confirmed `navigator.share`/`navigator.canShare` and OS Share control absent from current source; local `MediaRecorder` WebM and `Download file` retained. |
| `npm ci && npm run check` | Passed: 103 packages installed, 305/305 tests, 3D asset validation, web contract, and Pages contract. npm reported one moderate development-tree advisory; this is not a production-tree audit. |
| `npm run mobile:check` | Passed: 6/6 mobile foundation tests; regenerated mobile HTML hash prefix `3239a87b87dc`. |
| Mobile file ledger | Fresh `dist/mobile` has 236 files. Exactly 236 ledger paths map once each. Three generated hashes changed from the prior base: `index.html` `3239a87b87dcaaba7f9befe966956853d30e6f5319403c8acf2b7f104079876d`, `build-metrics.json` `1be06993e96c23ea7dfa0c1d3f78b9c9be6824a75e27b7268331ab79eaf7face`, `kicklab-mobile-manifest.json` `fc8e0647f3b2d8807835bfda9e54f18f6e0d38f626015d58a3910e8c988d7c67`; no new or missing paths. Rights dispositions were not upgraded. |
| Runtime dependency ledger | `package.json` and `package-lock.json` unchanged between the prior base and this merge; the existing 128-entry runtime dependency ledger remains the same package inventory. Native transitive dependencies remain outside this audit. |
| Runtime diff | The docs PR must contain only `docs/release/` changes. No source, build script, package, asset, generated mobile artifact, or release-config change is authorized. Final path/whitespace check is recorded in the PR. |

The merged PR descriptions report responsive browser QA and privacy-safe walkthroughs for the product changes. This documentation lane did not re-run those browser flows or perform a production-origin smoke; its direct evidence is source review, build/check output, and exact mobile file hashes. No physical-device, native project, signed binary, backup/restore, app-store console, customer-data workflow, commercial rights clearance, browser Gate 1 pass, or release action is claimed. The privacy draft remains unpublished.
