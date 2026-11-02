# Phase 2 W1 exact-file evidence assessment

Baseline: merged main `729875015a99d50a591d8bf668a57bd274b7cd25`, assessed in branch `codex/kicklab-phase2-wave1-evidence`. The companion [27-row register](phase2-wave1-exact-file-status.csv) binds each W1 path to its SHA-256, byte count, source pointer, embedded-input observation, runtime consumer, concern, gap and proposed disposition. All 27 remain **held**. This repository inspection creates no owner attestation, external IP finding, or commercial clearance.

The [owner response packet](phase2-wave1-owner-response-packet.md) prefills repository-backed answers in eight exact-hash batches and contains the remaining owner confirmation form. It does not speak or sign for the owner.

## Findings and evidence limits

- **H03, 12 files:** Nine GLBs and three v1 athlete atlases have local manifests or generator pointers. The nine GLB JSON chunks show material counts and no external URI; v1 athlete and Cobalt contain embedded image data, while the other seven have no embedded images. This is a structural inspection, not proof that geometry, materials, texture pixels, likeness or vehicle shapes are original. The manifests claim KickLab authorship, but none is a signed assignment or independently reviewed commercial license. The placeholder manifest limits use to internal evaluation. Source-to-output rebuild records and the exact input inventory still need owner confirmation.
- **H08, six files:** `scripts/render-race-awards.py` renders Blender primitives to PNG, converts to WebP with `cwebp`, and removes intermediate PNGs. `src/assets/awards/race/v1/asset-record.json` claims local original geometry. The checked-in script and final files are useful provenance pointers; signer identity, source revision/tool versions, full input declaration and paid redistribution decision are absent.
- **H06, nine files:** `scripts/race-cinematic-art/bake.py` generates `soft-turbulent-smoke.png`; `scripts/race-cinematic-art/tire-smoke.py` deterministically makes eight temporary PNG frames and converts them with `cwebp`. `src/assets/effects/race/v1/asset-record.json` binds the output hashes and claims local procedural origin. The separate generated nitrous atlas in the same record is **W3**, not part of this clearance. Signed authorship, exact tool/input chain and review remain pending.
- **Commercial basis and marks:** No W1 file has a signed exact-hash owner statement or external IP/privacy acceptance in the repository. The owner must inspect and attest to third-party inputs, likeness, logo/brand, vehicle trade dress and commercial distribution terms. No “none found” conclusion is made from script comments, a manifest, or a GLB URI scan.

## Packaged-only live-reference analysis

The six packaged-only W1 files are the v1 Direction C GLB and its three atlas PNGs, the placeholder athlete GLB, and the legacy Race vehicle GLB. An exact path/basename search of `src` excluding manifests and binary artwork found no live gameplay loader reference to those files. `src/game/50a-direction-c-athlete.js` points to the **v2** MakeHuman GLB, including for `renderer=direction-c`. `src/game/21-race-3d.js` defaults to the Cobalt `direction-a-atlas.glb` and uses `src/shared/race-vehicle-catalog.js` for the prototype roster. Its legacy Race vehicle is absent from that roster. The placeholder athlete is absent from the Kick 3D loader. `scripts/prepare-pages.mjs` and `scripts/prepare-mobile.mjs` copy assets into their outputs, so package presence alone does not establish a gameplay consumer. `scripts/check-pages-prepare.mjs` and `tests/mobile-foundation.test.mjs` assert the two athlete GLBs exist in their packages; `tests/race-systems.test.mjs` reads the legacy Race GLB as a source-level fixture. These assertions require review if removal is chosen.

This is a static source finding across default and prototype references, not proof of safe removal. The owner must decide whether to retain and clear each file or authorize a separate removal PR. Before removal, review local saved IDs, fallback and offline loading, direct asset URLs, captures and test fixtures; then run browser/WebGL/Canvas and package validation. Keep the current package unchanged in this lane.

The six files' proposed disposition is **remove behind reviewed fallback**, matching the existing plan. The safer immediate choice is to **retain them held in the unchanged package** while the owner decides whether a separate removal PR is worth the package and QA contract changes. This is not an approval to delete them. Their current live-reference classification remains provisional until the product owner reviews the static scan and a separate implementation lane tests the affected routes.

## Proposed owner document packet

Use [the existing attestation template](runtime-rights-owner-attestation-template.md), with one complete row per exact file. The restricted owner record should contain: (1) every creator and dated assignment or license; (2) editable source, generator, exact tool versions, inputs and output hashes; (3) embedded GLB geometry/material/image and raster source inspection; (4) third-party references and terms at creation; (5) likeness, child-facing, marks and vehicle trade-dress finding; (6) paid app modification and redistribution rights, territories and obligations; (7) the chosen keep/replace/remove route and dependent media; (8) signature/date and restricted evidence receipt/hash. The release PR should hold only receipt identifiers and decisions, not private source material. External IP/privacy review must accept the final exact-file packet before any row is marked clear.

## Finite next decision gates

1. **Owner evidence:** obtain signed exact-file/batch attestations and missing source/input receipts for all 27 rows. Stop where a creator, input, permission or hash cannot be established.
2. **External review:** submit the completed restricted packet for IP/privacy review; record each finding. No row clears on an owner claim alone.
3. **Separate asset decision:** for any rejected input or packaged-only removal, authorize a distinct implementation PR; revalidate consumers, fallback, dependent H07/H11 media and the new package. This assessment does not authorize that change.

The broader commercial roadmap remains five phases. Phase 2 is current; four phases including Phase 2 remain open. W1 evidence gathering is at the owner-document gate, while W2–W4, installed notice N01, legal identity, support/privacy and final review remain separate Phase 2 work.

## Validation record

Run on the exact branch above, with no runtime or asset edits:

- Initial `npm run check` stopped before tests because this new worktree lacked `ajv`; `npm ci` installed the pinned lockfile dependencies without changing tracked files.
- `npm run check` then passed: 317 tests, web contract and Pages contract checks.
- `npm run mobile:check` passed: seven mobile foundation tests.
- A deterministic CSV/package reconciliation compared all 210 `shipped-file-rights.csv` paths, SHA-256 values and byte counts to `dist/mobile`; all 209 plan rows and all 27 W1 status rows matched their corresponding ledger entries once.
- Built `dist/kicklab.html` SHA-256: `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`. Built `dist/mobile/index.html` SHA-256: `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`.
- Canonical package-tree digest: SHA-256 of sorted lines `path\\0file_sha256\\0byte_count\\n` for the 210 packaged files: `7a7d778c8582002c2e692226af92ed0b17ed25b764fd7a9edb16c79bbe29e3db`. Web, mobile and package-tree hashes were identical before and after `npm run mobile:check`.
- `git status` showed only this Markdown assessment and its 27-row CSV. No native project, policy publication, provider configuration, store record, signing, upload or distribution was performed.

Follow-up prefill on the same PR added only the owner response packet and pending-declaration/source-commit fields to the register, then reran `npm run check` (317 passed), `npm run mobile:check` (seven passed), and exact 27/209/210 reconciliation. The three digests above matched the prefill's pre-build snapshot and its post-build output byte for byte. No client-facing behavior changed, so no Human QA gate applies.
