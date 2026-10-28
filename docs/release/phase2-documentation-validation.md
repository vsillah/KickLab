# Phase 2 documentation validation

Run on 2026-10-28 in the dedicated `codex/kicklab-commercial-foundation` worktree. Base commit: `0e4af0b8e8d7c678486f2006b03b73a838e9d749`. The worktree was clean before documentation edits. No runtime, test, configuration, dependency, native-project, or build-output file is part of this proposed diff.

| Check | Result |
| --- | --- |
| `git rev-parse HEAD` before edits | Exact required base commit. |
| `npm ci` | Passed; 103 packages installed. npm reported one moderate issue across the full development tree. |
| `npm audit --omit=dev --json` | Zero production-tree vulnerabilities reported at check time. This does not replace later native dependency review. |
| `npm run check` | Passed: 292/292 tests, 3D asset validation, web contract, Pages contract. |
| `npm run mobile:check` after documentation edits | Passed: 6/6 mobile foundation tests. |
| CSV and Markdown verification | 179/179 packaged files mapped exactly once; every required ledger field filled; local Markdown links resolve. |
| `git diff --check` | Passed. |
| Mobile output comparison | All 179 `dist/mobile` file SHA-256 hashes matched the baseline built before documentation edits. `index.html`: `746bff33b17eaef4621c445d19271ccea7ab48c9957a394de9a20eca46be9e78`; mobile manifest: `c90cff3218577b646198370a75ef3e3482aa6a13988a516917a22a00dd963a4b`. |

No current-main browser Gate 1 matrix, native build, physical-device run, store console entry, rights approval, or publication was performed in this lane. The [Gate 1 plan](browser-gate-1-plan.md) specifies the next evidence. Rights and privacy release holds in the [foundation record](commercial-rights-and-privacy-foundation.md) remain open.
