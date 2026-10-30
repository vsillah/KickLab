# Commercial V1: Phase 2 closeout and Phase 3 entry packet

Prepared 2026-10-29 against exact `origin/main` `61e5aff660bb15a6184994c80e3ff3ca958a537c` and freshly built mobile HTML SHA-256 `2154cf0eae796f26b32fc155537995bd828763bdedf3a287c7aa20f83583f989`. **Phase 2 is open.** This packet is documentation and evidence, not rights clearance, browser Gate 1 qualification, native authorization, a store answer, or release approval. The privacy policy remains unpublished.

## Fixed commercial scope and verified product changes

V1 remains paid upfront, local first, ages 9–15, with Fight, Race, and Kick; Race is the hero. Excluded from V1: ads, in-app purchases, accounts, chat, uploads, behavioral analytics, public matchmaking, public leaderboards, cloud sync, camera scanning, OS Share, Race highlight file Download, and spoken Coach audio. Treat these as scope constraints to verify in each release candidate, not universal claims about every browser/SDK path.

| Change | Exact merged evidence | Current boundary |
| --- | --- | --- |
| Venue-first Highland/Marine/Forest, Save & Exit, and shared progression locks | PRs #118, #119, #122 in current source | Exact-current-main all-lab browser Gate 1 and native interaction/accessibility still needed. |
| Guardian local deletion | PR #124 in current source; browser QA recorded in PR | iOS/Android backup, uninstall/reinstall, and final binary behavior unqualified. |
| Remove OS Share | PR #125 in current source | Recheck final native binary and store declaration wording. |
| Remove Race highlight Download and WebM export, keep in-app replay | PR #127 is in current source; fresh mobile HTML has no Race export control or file-generation path | Exact-head replay QA passes; native/device and full three-lab Gate 1 remain open. A localhost-only audio QA recorder is outside the Race highlight export feature and must remain absent from release-visible controls. |
| Permit same-origin packaged 3D assets while blocking external connections | PR #132 merged at `90e445e`; packaged CSP uses `connect-src 'self' blob:` | Exact-head browser CSP probes pass; native network behavior remains unqualified. |
| Repair Fight phone portrait and controller composition | PR #133 merged at current main | Exact-head five-width composition QA passes; full Fight journeys and native accessibility remain open. |

The [current validation record](phase2-61e5aff-gate1-validation.md) separates checks run in this lane from Captain-reported production smoke. The public Pages HTML independently matched the fresh Pages build SHA-256 `160057846c392bb9c83c17e798b295e4f124aa8fecbcff80ebfd22331d4f33e1` when fetched on 2026-10-29. This confirms artifact identity at that fetch, not all user journeys or native behavior.

## Smallest remaining Phase 2 gates, in order

1. **Rights owner and exact-file disposition.** The [236-file ledger](shipped-file-rights.csv) has 211 held rows, 23 source/provenance rows marked for exclusion, and two build-metadata rows requiring exclusion or necessity review. Obtain signed imported-v42 ownership/redistribution evidence, embedded Fight/Kick art and sound rights, exact generated-art terms and input hashes, upstream MakeHuman CC0 input inventory, every rendered media/model/thumbnail input chain, and owner signoff. For any unresolved row, replace/exclude via a separate product/build PR and regenerate the ledger. The package currently has no separate license/notice file; place full required MIT notices for embedded Three.js and shipped QR generator (and audit all other shipped components) in the final distribution. Native Gradle/SPM transitive licenses wait for Phase 3. A manifest or self-authorship assertion alone does not clear a row.
2. **Current-main browser Gate 1.** Execute [the exact-current-main matrix](browser-gate-1-plan.md) across Fight/Race/Kick, all named widths, offline and denied-network states, deletion, profiles, venue progression, replay, default-off flags, no export/share/camera path, permissions, and request logs. PR #127 public Race smoke is useful evidence but is narrower than this gate. Stop on failed behavior or runtime egress.
3. **Owner decisions and draft policy.** Vambah can now choose the Apple primary audience/category path, initial paid price and territories, and legal developer identity. The privacy/support owner must identify the guardian support address/URL, provider, ticket retention period, and incident escalation owner. Keep [the policy draft](privacy-and-support-policy-draft.md) unpublished until native data flow, backup, uninstall/reinstall, permissions, SDK traffic, and counsel review are complete. The final Apple age questionnaire and Google Families/Data Safety/IARC answers require the exact native release binary and should not be submitted from this packet.
4. **Phase 2 signoff.** Captain checks the rights ledger and notices, browser Gate 1 evidence, chosen commercial parameters, and unresolved native-only items. Close Phase 2 only when its browser and rights deliverables are genuinely complete; carry native backup/restore, native dependency audit, accessibility, and final store declaration evidence into Phase 3/4 with named owners. Stop on a held shipped file, unsupported privacy claim, failed Gate 1, or missing owner decision.

## Decision packet Vambah can answer now

| Decision | Input needed | Record without console action |
| --- | --- | --- |
| Apple primary audience | Choose 9–11 as primary with Kids-category review, or full 9–15 outside Kids with accurate metadata and child-privacy review. The age rating is a separate final-build questionnaire. | Written audience rationale and link/guardian-gate owner. |
| Initial storefront footprint | Select a one-time starting price and a bounded initial territory set after review of support capacity, taxes, local ratings, and family accessibility. | Price/territory proposal only; no store selection or paid agreement here. |
| Rights accountability | Name the person who can sign imported v42 and per-file chain-of-title decisions; authorize replacement/exclusion planning for rows that cannot be cleared. | Signed exact-hash evidence and dated dispositions. |
| Privacy operations | Confirm legal developer, guardian-facing support contact and policy URL, support provider, ticket retention period, and incident owner. | Complete the draft placeholders; publish only after native proof and separate approval. |

## Phase 3 entry, after Phase 2 exit and separate authorization

1. Rebind to the then-current approved main commit and regenerate the exact mobile package. Review superseded iOS PR #13 and Android PR #15 as historical intent only; do not inherit their old binaries or checks.
2. In separate platform lanes, generate unsigned Capacitor projects from the audited, version-matched toolchain. Inventory native packages, permissions, privacy manifests, backup settings, file providers, navigation and network behavior, and notices. Run simulator/emulator three-lab, storage, offline, lifecycle, and zero-egress checks (Gate 2).
3. After Gate 2 passes, test named physical iOS/Android devices (Gate 3), then VoiceOver/TalkBack, focus, reduced motion, large text, touch targets, and fallback access (Gate 4). Test local deletion, uninstall/reinstall, and backup restoration with synthetic profiles. Document failures and return to scoped PRs before advancing.
4. Reserve store records, signing, TestFlight/Play upload, policy publication, and distribution for later protected Phase 4 authorization. Phase 5 remains the candidate and release decision. No Phase 3 action is authorized by this document.

Roadmap: Phase 1 of five is complete; Phase 2 is the current phase; **four phases remain including Phase 2**. The product decisions above narrow Phase 2 to rights, notices, browser Gate 1, and owner decisions. Native and store proof remain later gates.

Policy references checked 2026-10-29: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple category guidance](https://developer.apple.com/app-store/categories/), [Google Families](https://support.google.com/googleplay/android-developer/answer/9893335), [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469), and [Google content ratings](https://support.google.com/googleplay/android-developer/answer/9859655). Recheck at submission against the exact signed binary and current questionnaires.
