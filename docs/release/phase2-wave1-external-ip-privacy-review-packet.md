# Phase 2 Wave 1 external IP/privacy review packet — held intake

Prepared **2026-11-02** from exact deployed main `fbb7ddbdca198f6cccc96efb1ac0e1f0d906a269`. The attached [27-row reviewer schedule](phase2-wave1-external-review-schedule.csv) is the exact-file identity and findings sheet: each shipped relative path, SHA-256 and byte count matches the [210-file ledger](shipped-file-rights.csv), the [209-row plan](runtime-rights-evidence-plan.csv), and the prior [W1 status register](phase2-wave1-exact-file-status.csv). All **27/27 W1 files remain held**. This packet requests review; it is not an external clearance decision or release authority.

## Dated owner confirmation — summarized

On 2026-11-02, the product owner approved a proposed Wave 1 statement through a response annotation. In summary, the owner described the W1 assets as created personally or under KickLab direction, stated a best-knowledge belief about unlicensed third-party inputs and protected likeness/marks/designs, expressed an intent to modify, package and commercially distribute in the United States, and directed that the six packaged-only candidates stay held pending a separate removal assessment. The owner authorized preparation of this external review packet. This paragraph summarizes the approval without reproducing private chat content.

The statement initially contained an unresolved **`[LIST OR NONE]`** exception placeholder. On **2026-11-02**, the owner separately supplied **`W1 owner exception schedule: NONE`**. The schedule records that dated owner-stated answer for **all 27 exact hashes**. The owner then approved an exact-hash attestation action through a Codex response annotation on the same date. Its receipt-ID, hash and evidence-ID fields were placeholders. A private, exact-file receipt bundle was created afterward to bind that electronic attestation intent to the 27 paths, hashes and byte counts; the owner did not type those generated receipt values into the annotation. No handwritten signature or new assignment/license proof is claimed. This remains owner evidence, not independently verified input inventory, chain of title or external legal clearance. The prior register's `owner confirmation required` fields record its pre-annotation state.

## Private receipt metadata

The owner-controlled bundle is outside Git. Only these receipt identifiers and hashes are included in the public review packet:

| Receipt | ID | SHA-256 | Scope |
| --- | --- | --- | --- |
| Active electronic owner-attestation receipt | `KL-W1-OA-20261102-FBB7DDB-27-002` | `c887854e843ea105ed5ddee36098eb8631ef243473891fdff352ec088ac5c759` | Versioned addendum with restricted owner/review-coordinator contact; binds the immutable prior 27-file receipt by ID and hash. No handwritten signature. |
| Immutable prior exact-file receipt | `KL-W1-OA-20261102-FBB7DDB-27-001` | `6409bf1680c8dfeac32d6e255bddb58104ef09630f22f912463acd4196b05d56` | Annotated owner intent, owner-stated `NONE`, and all 27 exact paths/hashes/bytes. |
| Repository creator/input evidence index | `KL-W1-CI-20261102-FBB7DDB-27-001` | `b5286e2eba39d2006571303d338900ea4bd20f4ed9dbd854fe9204c3b96d2d32` | Eight repository evidence batches; no third-party assignment/license receipts. |

The private files are owner-controlled local records. The active owner receipt includes coordinator contact only in the restricted file; no address is published here. That contact is **not** a selected reviewer, approved secure delivery channel or authorization to send anything. The creator/input index points to repository artifacts; it does not prove creator identity or provide a signed third-party assignment. The reviewer must determine whether more underlying evidence is needed.

## Evidence available to the reviewer

The [owner response prefill](phase2-wave1-owner-response-packet.md) groups all 27 exact hashes into eight batches. The reviewer schedule repeats the relevant repository evidence and consumer observations per file. Source material remains in repository paths rather than being copied into this public packet; any restricted owner receipts should be exchanged through an owner-controlled channel.

| Batch | Exact files | Repository finding and principal review question |
| --- | ---: | --- |
| B1-athlete-v1 | 4 | `scripts/generate-direction-c-athlete.py`, retained Blender source and the v1 manifest describe three procedural atlases and one GLB. The GLB contains three embedded images. Confirm creator/assignment, all sources and references, real-person likeness, child-facing treatment and paid rights. No current gameplay loader reference was found. |
| B2-placeholder | 1 | The placeholder manifest cites PR #24 and labels its permitted use `internal-evaluation`. Confirm creator/input chain and whether any paid redistribution right exists; otherwise consider the separate removal path. No current gameplay loader reference was found. |
| B3-roster | 4 | Race roster generators, retained Blender sources and manifests point to Aegis, Kestrel, Sable and Vesper. Catalog consumers include prototype/mastery Race, Garage/preflight and dependent captures. Review every vehicle's geometry, materials, references, trademarks and trade dress. |
| B4-cobalt | 1 | Direction A generator, optimizer and source Blender file point to the default Cobalt GLB; the optimizer embeds three palette images. Review the source-to-atlas chain, vehicle design and paid rights. |
| B5-internals-smoke | 2 | The Race cinematic art bake and asset records point to a GLB and procedural PNG used by Race effects. Review inputs, cutaway design, downstream captures and commercial use. The generated nitrous atlas in the same record belongs to W3 and is outside this packet. |
| B6-legacy-vehicle | 1 | The legacy Race vehicle generator, Blender source and manifest point to an evaluation-era GLB. It is absent from the gameplay catalog but remains a source-level test fixture and packaged file. Review rights or a separate safe-removal decision. |
| B7-awards | 6 | `scripts/render-race-awards.py` renders Blender primitives and converts six temporary PNGs to WebP. Awards are displayed in Race results/progression. Review authorship, visual references, marks and source-to-output records. |
| B8-tire-smoke | 8 | `scripts/race-cinematic-art/tire-smoke.py` computes deterministic frames and converts temporary PNGs to WebP; all eight are loaded by Race effects. Review creator/input chain, commercial use and dependent captures. |

The nine W1 GLBs have no external URI in their JSON chunks; two contain embedded image data. This structural result is not a finding that their geometry, texture pixels or visual designs are original. Manifests and Git history identify repository claims and commits, not signed author/assignment proof. `src/game/50a-direction-c-athlete.js` now loads v2 for Kick. `src/game/21-race-3d.js` and `src/shared/race-vehicle-catalog.js` identify current Race models. `scripts/check-pages-prepare.mjs` and `tests/mobile-foundation.test.mjs` assert packaged athlete GLBs, and `tests/race-systems.test.mjs` reads the legacy vehicle GLB. These tests are why the six packaged-only files remain in the unchanged package.

## Requested reviewer findings and return fields

For **each exact row** of the schedule, the reviewer should return a dated finding with a restricted evidence receipt and mark one of **accept**, **reject**, or **more evidence required**. “Accept” must identify the specific paid US modification/redistribution basis and any obligations; it must not rest solely on the owner statement or a manifest claim. “Reject” should identify the offending input and required replacement/removal or recapture scope. “More evidence required” should name the missing creator, assignment, license, tool term, source, likeness consent, mark/design review or other proof. The schedule leaves reviewer identity, findings, obligations and acceptance/rejection pending.

At minimum, assess: chain of title and contributor assignments; third-party models, geometry, textures, reference imagery, templates and provider terms at creation; likeness and child-facing depiction; logos, trademarks and recognizable vehicle trade dress; commercial use/territory and attribution, expiry or source-disclosure obligations; and privacy implications of the local asset/capture workflow. Review dependent H07 thumbnails and H11 media if an upstream W1 model or scene changes. Record a finding on the six packaged-only candidates, but **do not treat this packet as authorization to remove them**.

## Exact next gates and handoff

1. **Owner exception schedule — answered:** On 2026-11-02 the owner stated `NONE` for all 27 exact W1 hashes. This records the owner's answer; it does not independently prove absence of an exception. Reopen the schedule if the owner or reviewer identifies one.
2. **Electronic owner-attestation receipt — recorded:** The owner approved the attestation action by response annotation; the versioned exact-file private receipt chain and repository index now exist with the IDs/hashes above. The owner subsequently supplied coordinator contact, recorded only in the restricted addendum. The annotation contained placeholders, so no handwritten signature or owner-supplied receipt values are implied. Any actual creator/assignment or external input receipts remain to be supplied if required by the reviewer.
3. **Reviewer handoff — pending:** The owner or authorized coordinator selects a qualified external IP/privacy reviewer and supplies this packet, the exact schedule and private receipts through an approved restricted channel. Ask the reviewer to assess whether the electronic attestation and repository evidence suffice, request further source/assignment proof where needed, and return row-level findings and obligations. No reviewer has been named or contacted by this PR.
4. **Post-review decision — pending:** Keep rejected or uncertain rows held. Any replacement, packaged-only removal, recapture or package rebuild requires a separate product-change authorization and new exact-file validation. Phase 2 release closeout remains separate from this W1 review.

The smallest remaining decision is the external reviewer handoff: identify the qualified reviewer and restricted delivery channel, then separately authorize sharing this packet and the private receipt chain/index. The recorded coordinator contact does not supply either missing value. The reviewer can request additional creator/assignment or source-input evidence and must return exact-row findings. No file is cleared by the owner receipt alone; no reviewer contact or sharing occurred in this lane.

## Validation for this documentation-only lane

From branch `codex/kicklab-phase2-wave1-external-review` based on `fbb7ddbdca198f6cccc96efb1ac0e1f0d906a269`:

- `npm run check` passed: 317 tests, web contract and Pages contract checks.
- `npm run mobile:check` passed: seven mobile foundation tests.
- At initial packet creation, a deterministic CSV/package reconciliation compared exact path, SHA-256 and byte count across all 210 ledger/package files, all 209 runtime-plan rows and all 27 reviewer-schedule rows before and after the builds. Every identity matched; all 27 reviewer rows remained held, with the owner exception schedule and reviewer acceptance then pending. The later `NONE` answer is recorded above.
- Built `dist/kicklab.html` SHA-256: `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`. Built `dist/mobile/index.html` SHA-256: `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`.
- Canonical package-tree SHA-256 over sorted `path\\0file_sha256\\0byte_count\\n` lines for 210 packaged files: `7a7d778c8582002c2e692226af92ed0b17ed25b764fd7a9edb16c79bbe29e3db`. All three values matched the pre-build snapshot and the prior W1 documentation lane; product outputs did not change.

The dated `NONE` follow-up changed only the reviewer schedule and this packet. Revalidation repeated `npm run check` (317 passed), `npm run mobile:check` (seven passed), and exact 27/209/210 path/hash/byte reconciliation before and after the builds. The web, mobile and package-tree digests above were unchanged from the pre-build snapshot. The 27 rows remain held. The later electronic-attestation receipt update again passed `npm run check` (317), `npm run mobile:check` (seven), private-receipt-to-27-row identity/hash checks, and 27/209/210 package reconciliation. All three product/package digests remained unchanged; reviewer findings remain pending.

The later coordinator-contact update created a restricted versioned addendum while preserving the original exact-file receipt and its hash. Documentation/hash validation confirmed the new addendum's SHA-256 and its parent/index hashes, the parent receipt's exact 27-file identity table, owner-only file permissions, absence of the restricted contact address in both public PR files, and 27/209/210 ledger/package reconciliation. The web, mobile and package-tree digests above matched the prior run. Product code and assets were unchanged, so full product checks were not repeated for this contact-only edit. Reviewer identity, delivery channel, findings and obligations remain pending; all 27 rows remain held.

Only this packet and its CSV findings schedule are changed in Git. No client-facing behavior changes are proposed, so Human QA does not apply. No native project, asset removal, policy publication, provider setup, store record, app signing, upload or distribution occurred.
