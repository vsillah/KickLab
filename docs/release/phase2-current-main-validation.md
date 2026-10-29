# Phase 2 current-main documentation validation

**Historical validation.** See [current-main evidence](phase2-a6bef78-validation.md). Run on 2026-10-28 from a clean worktree branched at exact `fca347dc187ef513ec5d127c49cc839082a698ac`. The prior PR #117 documentation remains historical. This continuation changes only `docs/release/` files.

| Check | Result |
| --- | --- |
| Base and history | `git rev-parse HEAD` matched the required main SHA before edits. Merge history includes PRs #116, #117, #120, #121, #118, #119, and #122. |
| `npm ci` | Passed; 103 packages installed. npm reported one moderate development-tree advisory. |
| `npm run check` | Passed: 299/299 tests, 3D asset validation, web contract, and Pages contract. |
| `npm run mobile:check` | Passed: 6/6 mobile foundation tests. |
| `node scripts/qa-race-preflight-media.mjs` | Passed: 50 existing clips and 20 new venue clips; 40 new venue files, five local model inputs, held commercial disposition. |
| `npm audit --omit=dev --json` | Zero production-tree findings at check time; native transitive dependencies remain unexamined. |
| File ledger / links | 236/236 exact `dist/mobile` paths and SHA-256 hashes mapped once; required rights fields filled; local Markdown links resolve. |
| Runtime output | All 236 `dist/mobile` SHA-256 hashes matched the pre-documentation baseline after `mobile:check`. `index.html`: `4c26bd2f30ddd66a8740ad184c996887f2c8e40161e76c98518d1630422c91f7`; mobile manifest: `f36c19cee2f92c14aaf5d20d1ae2addd26729b64e1bff04000064e5a45233485`. |
| Lockfile | `package.json` and `package-lock.json` unchanged between PR #117 commit and current base; existing 128-row dependency ledger remains current. |
| Diff | `git diff --check` and staged diff whitespace checks passed; staged path inspection found only `docs/release/` files. |

No current-main Gate 1 browser matrix, native project, physical-device run, signed build, store record, live customer-data smoke, rights clearance, or publication was performed. Source presence of the venue, Save & Exit, and lock changes is not browser qualification. Deletion and Race highlight sharing remain product/privacy gates described in the [continuation packet](phase2-current-main-continuation.md).
