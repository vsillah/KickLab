# Phase 2 Wave 1 external IP/privacy review packet — held intake

Prepared **2026-11-02** from exact deployed main `fbb7ddbdca198f6cccc96efb1ac0e1f0d906a269`. The attached [27-row reviewer schedule](phase2-wave1-external-review-schedule.csv) is the exact-file identity and findings sheet: each shipped relative path, SHA-256 and byte count matches the [210-file ledger](shipped-file-rights.csv), the [209-row plan](runtime-rights-evidence-plan.csv), and the prior [W1 status register](phase2-wave1-exact-file-status.csv). All **27/27 W1 files remain held**. This packet requests review; it is not a clearance decision, owner signature or release authority.

## Dated owner confirmation — summarized

On 2026-11-02, the product owner approved a proposed Wave 1 statement through a response annotation. In summary, the owner described the W1 assets as created personally or under KickLab direction, stated a best-knowledge belief about unlicensed third-party inputs and protected likeness/marks/designs, expressed an intent to modify, package and commercially distribute in the United States, and directed that the six packaged-only candidates stay held pending a separate removal assessment. The owner authorized preparation of this external review packet. This paragraph summarizes the approval without reproducing private chat content.

The statement initially contained an unresolved **`[LIST OR NONE]`** exception placeholder. On **2026-11-02**, the owner separately supplied **`W1 owner exception schedule: NONE`**. The schedule now records that dated owner-stated answer for **all 27 exact hashes**. It is an owner statement about known exceptions, not a signed exact-hash attestation, independently verified input inventory, chain of title or external legal conclusion. It does not establish paid distribution rights or clear any row. The prior register's `owner confirmation required` fields remain a record of the pre-annotation state; this packet records the later owner statements and remaining limits.

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
2. **Restricted evidence and signature — pending:** The owner supplies any creator/assignment and source-input receipts, plus a dated signed exact-hash attestation or signed batch schedule identifying all 27 paths/hashes/bytes and the owner-stated `NONE` answer. Store restricted proofs outside the public PR; include only receipt IDs/hashes here. Neither the response annotation nor the later `NONE` message is represented as a signature.
3. **Reviewer handoff — pending:** After the signed exact-hash record and restricted receipts are ready, the owner or authorized coordinator selects a qualified external IP/privacy reviewer and gives them this packet, the exact schedule and restricted proofs through an approved private channel. Request row-level findings and obligation terms. No reviewer has been named or contacted by this PR.
4. **Post-review decision — pending:** Keep rejected or uncertain rows held. Any replacement, packaged-only removal, recapture or package rebuild requires a separate product-change authorization and new exact-file validation. Phase 2 release closeout remains separate from this W1 review.

The smallest remaining owner step is to sign the exact-hash schedule and provide the restricted creator/assignment and source-input evidence receipts for the reviewer. Use [the owner attestation template](runtime-rights-owner-attestation-template.md), attach the 27-row schedule, enter `NONE` only if it remains accurate at signing, sign and date it, and return a restricted receipt ID/hash rather than raw private source or contracts in this PR. The reviewer handoff follows that completed record; no file is cleared by the owner's answer alone.

## Validation for this documentation-only lane

From branch `codex/kicklab-phase2-wave1-external-review` based on `fbb7ddbdca198f6cccc96efb1ac0e1f0d906a269`:

- `npm run check` passed: 317 tests, web contract and Pages contract checks.
- `npm run mobile:check` passed: seven mobile foundation tests.
- At initial packet creation, a deterministic CSV/package reconciliation compared exact path, SHA-256 and byte count across all 210 ledger/package files, all 209 runtime-plan rows and all 27 reviewer-schedule rows before and after the builds. Every identity matched; all 27 reviewer rows remained held, with the owner exception schedule and reviewer acceptance then pending. The later `NONE` answer is recorded above.
- Built `dist/kicklab.html` SHA-256: `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`. Built `dist/mobile/index.html` SHA-256: `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`.
- Canonical package-tree SHA-256 over sorted `path\\0file_sha256\\0byte_count\\n` lines for 210 packaged files: `7a7d778c8582002c2e692226af92ed0b17ed25b764fd7a9edb16c79bbe29e3db`. All three values matched the pre-build snapshot and the prior W1 documentation lane; product outputs did not change.

The dated `NONE` follow-up changed only the reviewer schedule and this packet. Revalidation repeated `npm run check` (317 passed), `npm run mobile:check` (seven passed), and exact 27/209/210 path/hash/byte reconciliation before and after the builds. The web, mobile and package-tree digests above were unchanged from the pre-build snapshot. The 27 rows remain held, with signed attestation and external reviewer findings pending.

Only this packet and its CSV findings schedule are changed. No client-facing behavior changes are proposed, so Human QA does not apply. No native project, asset removal, policy publication, provider setup, store record, signing, upload or distribution occurred.
