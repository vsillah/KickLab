# KickLab Phase 2: rights and privacy foundation

Current assessment prepared 2026-10-29 for exact `origin/main` `a6bef784ddc677f4b3c1f1211a38633a6f894055`. See [the closeout/Phase 3 entry packet](phase2-closeout-phase3-entry.md) and [validation](phase2-a6bef78-validation.md). This document records evidence and holds; it grants no commercial rights, policy publication, native generation, store declaration, or distribution authority.

## Commercial scope and exact package

V1 is paid upfront, local first, ages 9–15, with Fight, Race and Kick; Race is the hero. The approved exclusions are ads, IAP, accounts, chat, uploads, analytics, public matchmaking, public leaderboards, cloud sync, camera scanning, OS Share, Race file Download, and spoken Coach audio. Private Party remains offline QR display and manual paste. These are release requirements to verify against each exact artifact, not a claim that static inspection alone proves every runtime path.

The freshly built [shipped-file ledger](shipped-file-rights.csv) maps all **236** mobile paths to their SHA-256, size, source or generator, owner claim, use basis, attribution, evidence, and disposition. It has **211 held rows**, **23 source/provenance files marked for exclusion**, and **two build metadata rows needing exclusion or necessity review**. A manifest or artist note establishes a claim, not chain of title. The source for `index.html` contains imported v42 code and embedded Fight/Kick content; no signed owner assignment and complete redistribution record was found in this repository. The entire commercial release stays on hold until that is resolved.

The [runtime dependency ledger](runtime-dependencies.csv) maps **128** non-root lockfile packages: five production-tree entries, one embedded-runtime/build entry, and 122 build-only entries. Three.js 0.186.1 is embedded in the HTML bundle and `qrcode-generator` 1.5.2 is copied as `party-qr.js`; both are MIT, requiring full copyright and permission notices in the final distribution. Capacitor Core/App/Haptics are also recorded as MIT; `tslib` is 0BSD per pinned package metadata. The freshly prepared `dist/mobile` contains **no separate license or notice file**. Resolve notice placement before distribution and audit actual generated iOS/Android transitive components later. See the [Three.js MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) and the pinned `qrcode-generator` package metadata and copyright header in `node_modules/qrcode-generator/qrcode.js`. `npm audit --omit=dev` reported zero production-tree findings at this check time; that is not license or native security clearance.

| Held group | Evidence still required |
| --- | --- |
| Imported v42 HTML code, procedural art and sound | Signed creator/assignment history and commercial redistribution permission tied to the exact source and output hashes. |
| Garage thumbnails, roster images, generated player/driver/Coach/effect art | Per-file source or render history, creation-date terms, input/output hashes, likeness/mark review, and owner decision. |
| MakeHuman-derived athlete | Exact upstream CC0 core input snapshot and proof restricted community assets did not enter the shipped derivative. |
| Race models, awards, home and venue captures | Every model, scenery, texture, sound and rendered-input chain; a local capture manifest alone is insufficient. |
| Copied `.blend`, provenance JSON, and build metadata | Separate build change to exclude unneeded source/records or a documented necessity and rights decision. |
| Shipped MIT and other libraries | Full notices in final package plus later native transitive license and privacy inventory. |

For each held row, a rights owner must attach dated evidence and sign an exact-hash disposition. Replace or exclude any row that cannot be cleared through a separate reviewed product/build change, then rebuild and rehash the candidate. Do not silently upgrade the CSV based on this documentation pass.

## Privacy and safety boundary

Merged PR #124 provides a guardian-facing local delete-all action with typed confirmation and app-namespaced storage/cache removal. PR #125 removed OS Share, and PR #127 removed the Race highlight file Download/WebM path while preserving local in-app replay. Private Party remains QR display and paste-code transfer. The packaged CSP contains `connect-src 'none'`, and the release contract has no remote destination; source and browser evidence do not establish native backup, SDK, permission, or all-error-path behavior. A localhost-only audio QA recording helper remains outside the Race highlight feature; verify that no release-visible export path exists in the native binary.

The [privacy/support draft](privacy-and-support-policy-draft.md) remains **unpublished**. Identify the legal developer, guardian contact and policy URL, support provider, ticket retention period, and incident owner. Use synthetic data in QA. Do not request raw child profiles, real names, locations, unredacted screenshots, or Private Party codes in support. Test local deletion after legacy migration, multiple profiles, failed storage, restart, uninstall/reinstall, and backup restoration on each native platform. Publish only after final data-flow review and separate approval.

The [browser Gate 1 plan](browser-gate-1-plan.md) must be executed from the exact current package across all three labs and named widths; Captain's PR #127 public Race smoke is narrower. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple category guidance](https://developer.apple.com/app-store/categories/), [Google Families](https://support.google.com/googleplay/android-developer/answer/9893335), and [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469) were rechecked 2026-10-29. Store declarations and counsel review remain separate gates.
