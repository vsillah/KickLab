# Phase 2 continuation at current main

Updated 2026-10-29 for exact `origin/main` `61e5aff660bb15a6184994c80e3ff3ca958a537c`. The earlier [40e1264 validation](phase2-40e1264-validation.md) and [product remediation briefs](phase2-product-remediation-briefs.md) remain historical records. Use the [current validation](phase2-61e5aff-gate1-validation.md) and [ordered closeout/Phase 3 entry packet](phase2-closeout-phase3-entry.md) for decisions and gates. Documentation only; no rights clearance, browser Gate 1 pass, native qualification, store answer, or release is claimed.

The freshly built mobile package has **236 files** and [236 exact-path ledger rows](shipped-file-rights.csv). Relative to the prior ledger, only generated `index.html`, `build-metrics.json`, and `kicklab-mobile-manifest.json` changed hashes; no path changed. The [dependency ledger](runtime-dependencies.csv) still maps all 128 non-root lockfile packages. Product and package checks pass, but the commercial rights ledger retains 211 holds, 23 source/provenance exclusions, and two build-metadata decisions. The imported v42 bundle, generated art/input chains, captured media, MakeHuman-derived inputs, thumbnails, notices, and native dependencies are not cleared by a passing build.

| Product issue | Current source and review status | Remaining release proof |
| --- | --- | --- |
| Private Party camera scan | Removed earlier; QR display and manual paste remain | Final browser/native permission and payload checks. |
| Venue-first Race, Save & Exit, shared locks | Merged PRs #118, #119, #122 | Complete exact-main three-lab browser Gate 1 and native accessibility. |
| Guardian local deletion | Merged PR #124, typed `delete` and app-namespaced local/session/cache erase | Native backup/restore, uninstall/reinstall, failure and multiple-profile behavior. |
| Race OS Share | Removed in merged PR #125 | Final native binary and declaration review. |
| Race highlight file Download/WebM export | Removed in merged PR #127 and still absent at this main; 3D/Canvas in-app Replay retained | Exact-head replay QA passes; full browser Gate 1, native behavior and declarations remain. |
| Packaged mobile CSP and same-origin 3D assets | PR #132 merged; `connect-src 'self' blob:` | Exact-head browser CSP checks pass; native zero-egress proof remains. |
| Fight phone portrait/controller composition | PR #133 merged at this main | Five-width exact-head visual/interaction check passes; full Fight journeys and native accessibility remain. |

V1 remains paid upfront, local first, ages 9–15, with Fight/Race/Kick and Race as hero. The V1 exclusions and all decisions now due are listed in the [closeout packet](phase2-closeout-phase3-entry.md). In particular, **Download is no longer a pending inclusion choice**; [the Download assessment](phase2-local-download-decision.md) is an historical rationale plus current implementation status. Vambah can now decide the Apple primary audience/category, starting price/territories, rights signoff owner, and privacy/support ownership. Final Apple age rating and Google Families/Data Safety/IARC answers wait for exact native-build evidence. Keep the [privacy draft](privacy-and-support-policy-draft.md) unpublished.
