# KickLab Phase 2: rights and privacy foundation

**Current update:** [Phase 2 continuation at `fca347dc`](phase2-current-main-continuation.md) supersedes the 179-file count and Highland-only finding below. The refreshed [236-file ledger](shipped-file-rights.csv) is current for that base. The prior assessment remains as a dated evidence snapshot.

Assessment bound to `0e4af0b8e8d7c678486f2006b03b73a838e9d749` on 2026-10-28. This is a release hold and decision record, not a rights clearance, policy publication, store declaration, or authorization to distribute. The approved V1 is paid upfront, local first, ages 9–15, with Fight, Race, and Kick; Race is the hero. There are no ads, IAP, accounts, analytics, uploads, cloud sync, public matchmaking, public leaderboards, chat, or spoken Coach audio. Private Party is limited to offline QR display and paste-code transfer.

## Exact shipped-file and dependency map

- [Shipped-file rights ledger](shipped-file-rights.csv) lists **179 files** in `dist/mobile`, each with path, SHA-256, byte count, source or generator, owner claim, license or use basis, attribution obligation, evidence location, and release disposition. The build copies whole `src/assets` and `src/media` trees, so the package includes **21 source/provenance files** marked for exclusion, including editable `.blend` files and JSON records. Two build metadata files also need an explicit packaging decision. Exclusion is a release-plan instruction only; this lane does not alter the build.
- [Dependency ledger](runtime-dependencies.csv) lists all **128 lockfile packages**: five production-tree packages and 123 build-only packages. `src/vendor/three.min.js` embeds Three.js 0.186.1 in `index.html`; `party-qr.js` copies `qrcode-generator` 1.5.2. Both are MIT and require their copyright and permission notices in a release distribution. Capacitor Core/App/Haptics are MIT, and `tslib` is 0BSD according to the pinned lockfile. Native Gradle/SPM transitive components cannot be audited until separately authorized native project generation. This ledger records package metadata, not an independent license opinion.
- The source for `index.html` includes the imported v42 game. No signed owner assignment or complete imported-content rights record was found in the repository. **The whole release stays on hold** until that ownership is documented. Fight/Kick procedural art and sounds bundled in that HTML need the same signoff.

The ledger's `hold` means **do not distribute this exact package** until the named evidence and disposition are signed off. A locally stored manifest or artist note is evidence of a claim, not legal clearance. No file is silently treated as commercially approved. A release owner should attach a dated rights decision and exact source/output hashes to each hold row, then generate a fresh ledger from the release candidate. If an item cannot be cleared, replace or exclude it in a separately reviewed product/build change and rerun all affected gates.

### Bounded unresolved items

| Item | Missing proof or decision | Release disposition |
| --- | --- | --- |
| Imported v42 code and content in HTML | Creator/assignment history, commercial redistribution permission, embedded art/sound review | Hold entire release. |
| Garage thumbnails and roster images | Per-file source or render record and ownership; the roster model record alone does not prove thumbnail rights | Hold these files. |
| Generated driver, Coach, and nitrous art | Generation terms applicable on the creation date, source hashes, derivative chain, visual likeness/mark review | Hold these files. |
| MakeHuman-derived athlete v2 | Snapshot of exact upstream core CC0 inputs and proof no restricted community asset entered the export | Hold until confirmed. |
| Race models, awards, effects, home and preflight captures | Independent authorship review and all rendered-input rights; media manifests show capture lineage, not complete rights | Hold dependent files. |
| MIT libraries embedded or shipped | Full copyright and permission notices in the actual distribution; exact native transitive license inventory later | Hold release until notices and native audit. |
| Extra `.blend`/JSON/metrics files | Decision to exclude unused source and metadata from the release package, with build diff and hash evidence | Exclude through separate build change before distribution. |

## Draft privacy and child-safety operating policy

**Status: internal draft; do not publish unchanged.** The intended data stays on the device: made-up nickname, local profile/avatar choices, game progress, settings, awards, and results. `src/shared/profile-store.js` preserves `impactlab.v1`, `impactlab.nick`, and `kicklab.profiles.v1`; the build contract declares no server URL, navigation allowlist, analytics, advertising, or child-data transport. These are design and static-code facts, not proof of zero egress or platform backup behavior. A current browser network capture and generated native permission/SDK audit must precede any “no data collected” store answer.

The [guardian-facing privacy and support policy draft](privacy-and-support-policy-draft.md) contains publication placeholders and cannot be posted until those gates pass.

**Collection and sharing.** No account, child contact detail, behavioral analytics, advertising ID, or third-party data transport is authorized. Private Party codes are manually pasted or displayed as local QR cards; do not add camera scanning or an OS share action there. `src/game/50b-race-competition.js` contains a separate, opt-in Race highlight export with `navigator.share`. It may pass a local file to another app, so its release status and Google Data Safety treatment require a product/privacy decision. The support process must avoid soliciting raw save files, personal identifiers, unredacted screenshots, or challenge codes.

**Retention and deletion.** Keep device-local data until the player or guardian deletes it or the app is uninstalled, subject to a verified platform backup/restore policy. A release build needs a clear, confirmed “Delete local data” control that removes all three documented storage keys plus any app-owned cache or transient export, leaves unrelated device data alone, and explains whether uninstall or reinstall restores a backup. The current source search did not establish a complete in-app deletion control. Treat this as a product gate, not as a promise already implemented. Test deletion after legacy migration, after multiple profiles, after a failed/corrupt save, and after app restart on each platform. Recheck OS backup eligibility and disclose or disable it consistently.

**Support.** Before submission, designate the legal developer and guardian-facing support contact, publish a privacy-policy URL, and give the in-app route to both. Ask for build/version, device model/OS, the lab and steps to reproduce, and a redacted screenshot only if useful. Never request a child's full name, location, contact details, raw save, or account credentials. A support owner should triage safety/privacy reports promptly, restrict ticket access, delete accidental child data from tickets, document the action, and escalate credible exposure or unsafe content to the developer's incident owner and counsel. Set and publish a ticket-retention period after choosing a support provider; do not invent one before provider behavior is known.

**Incident path.** Freeze affected release or distribution activity, preserve minimal access-controlled evidence, assess whether any child data left the device, identify affected versions and territories, involve privacy counsel for notice obligations, remediate in a separate reviewed change, and verify again before resuming. Do not place raw child data in public issues, PRs, analytics, or QA packets.

## Store and product decision gates

1. Product owner signs the rights ledger, removes or replaces held material, and approves notices. No commercial upload while any shipped row remains on hold.
2. Privacy owner resolves Race highlight export treatment, local deletion, backup/restore, support provider and retention, and zero-egress proof before store declarations.
3. Product owner chooses Apple Kids-category posture and territory/price options using [store worksheets](store-declaration-worksheets.md). Rating answers must follow observed Fight content and every enabled social/export feature.
4. Gate 1 browser evidence in [the exact-head plan](browser-gate-1-plan.md) must pass before native qualification. The Race “Choose your location” step currently offers Highland route cards while Marine and Forest are inside settings; this is an onboarding/productization gap, not a rights issue.

Policy references, accessed 2026-10-28: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [Google Families](https://support.google.com/googleplay/android-developer/answer/9893335), and [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469). Recheck before any store submission. Counsel and store-review decisions remain separate from this engineering evidence.

Rights references accessed 2026-10-28: the [MakeHuman Community MPFB license](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md) distinguishes GPL tool code from CC0 bundled core assets and discusses output; [Three.js MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) requires notice preservation; [OpenAI Terms of Use](https://openai.com/policies/row-terms-of-use/) describe output ownership as between the user and OpenAI, subject to applicable law and input rights. These sources support a rights review, not a finding that the exact KickLab exports are cleared.
