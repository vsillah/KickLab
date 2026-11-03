# Imported v42 owner intake — held `index.html`

Rebound **2026-11-03** to exact deployed main `714bfb3075d26519bd0050553aab0f4d5e02ea13`. The original draft was prepared at `2da1df9e4974469473baffdbca20b167dff04dc4` against the earlier mobile HTML hash `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294` (2,638,152 bytes); that dated binding remains in PR #167 history. This is a question packet for the owner, not an attestation, rights finding, or release decision. The **current held** `dist/mobile/index.html` has SHA-256 `9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d` (2,639,746 bytes). Its web/Pages HTML counterpart is `4c421ca7210d958927b9914c635f3042a3e5903ef3ba751a121648fd09a477db`. No ledger status or product byte changes occur in this lane.

## Repository facts already checked

The [23-input initial import lineage](phase2-wave2-v42-import-lineage.csv) identifies commit `4690e4c6b911b23f24b1e3b8cb4aa1c63938ecad`: 20 `src/game/*.js` fragments, `src/index.html`, `src/styles.css`, and `src/vendor/three.min.js`. Each import and current source hash was rechecked against Git and exact main `714bfb3`. The sole changed current source hash since the earlier draft is `src/styles.css`: prior `3095c4f66abed28ecf5f97b89f37cf213f9ac9d815c5673c456c99e2c14106ba`, current `ef430c8ad1afe0d46edda90c56c1fff4a91f164a8fe9272fca143582774ae7fb`; its import hash is unchanged. The [lineage CSV](phase2-wave2-v42-import-lineage.csv) now binds the 23 current source hashes. All 23 paths remain current inputs to `scripts/build.mjs`, which inserts styles, vendored Three.js, and ordered game/shared scripts into the web HTML; mobile preparation packages that HTML as `dist/mobile/index.html`. That shipped HTML is the current consumer across Home, Fight, Race, Kick, profiles, and navigation. The 23 rows are an **initial import map**, not an inventory of every embedded art, sound, snippet, reference, later contribution, or third-party input. Current code and package possession do not establish creator identity, assignment, or commercial rights.

The [Wave 2 recovery audit](phase2-wave2-held-recovery.md) records restricted receipt `KL-P2-W2R-20261103-FBCE23A-4-001` (SHA-256 `a4e30613ef152c015667642756ddc1c3ac7450e689a2819a07f9e55028e7de13`). Its bounded search recovered source lineage but no dated original-v42 creator assignment, paid redistribution grant, or original published HTML. The installed Three.js MIT notice covers that identified library only; do not claim personal authorship of the vendor input or extend its license to other imported content.

An **optional blank restricted audit worksheet**, `KL-P2-W2-H01-INTAKE-TEMPLATE-20261103-714BFB3-23-002` (SHA-256 `05d11f6cda12d5b62174d0d7b4e6e9a811ca312453aa96eb039d58a1035fbd38`), prepopulates only the 23 verified commit/path/hash and current build-consumer facts, plus the exact main commit and held mobile HTML hash and byte count in each row. It is stored outside Git with mode `0600` and is a template, **not an owner response, signature, or release prerequisite**. The prior `KL-P2-W2-H01-INTAKE-TEMPLATE-20261103-2DA1DF9-23-001` (SHA-256 `43975d833bfc2f79cc819ac22a3c8baf0b4e07abd50cbdb0e33349e2d19b53b4`) remains a dated earlier-hash template; use the current template if a specific exception needs row-level audit detail. Keep completed answers, identities, contracts, source materials, and receipts outside Git. Publish only approved receipt identifiers and hashes in later status documents.

## Three bounded evidence gates

The current `index.html` stays **held** while these three gates are reconciled. The 23-row source/hash map and blank restricted worksheet above are optional audit aids. They do not require 23 owner answers. Request file or component detail only when an exception or conflicting evidence identifies a specific input.

1. **Dated owner attestation.** The owner identifies the original imported-v42 code and material covered, states the basis of their authority for **continued commercial preparation only** as incorporated in the exact current HTML hash above, and names any excluded or unknown material in the exceptions schedule. Do not infer creator identity, employment, assignment, or license from Git history or possession.
2. **Identified dependency notices and permissions.** Verify the notice/permission chain for identified third-party dependencies against the exact current mobile package. The [current notice record](phase2-w1-procedural-notice-decision.md) verifies packaged Three.js `0.186.1` and qrcode-generator `1.5.2` MIT terms and placement; Three.js is embedded in HTML and the QR file is a separate packaged runtime path. Recheck if source, version, notice, or package scope changes. Any additional dependency identified by the owner needs its own terms and required notice before this gate closes.
3. **Dated exceptions schedule.** The owner lists every known third-party input, contributor, reference, restriction, or unknown affecting imported-v42 material, including the affected component when known, evidence or missing evidence, and a proposed resolution. `NONE` is permitted only as an explicit dated owner statement after reviewing the source and input inventory; silence or an empty schedule is not `NONE`.

### Concise owner attestation template

Complete and retain the signed or otherwise attributable dated response and supporting records in restricted owner storage. Do not put names, contracts, private source bundles, or raw responses in Git.

> - **Date and owner identity:** [owner to complete]
> - **Exact artifact:** KickLab `dist/mobile/index.html`, deployed main `714bfb3075d26519bd0050553aab0f4d5e02ea13`, SHA-256 `9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d`, 2,639,746 bytes.
> - **Original imported-v42 scope and authority basis:** [owner identifies covered code/material and actual creator, ownership, assignment, or license basis; mark unknowns in schedule].
> - **Limited statement:** [owner states whether they have authority to continue commercial preparation of that scope in this exact artifact, subject to the exceptions below; identify any condition or exclusion].
> - **Dependency records reviewed:** [owner lists applicable notice/permission receipts, versions, and any additions or gaps].
> - **Exceptions schedule receipt:** [restricted ID and SHA-256, or explicit dated `NONE` statement].
> - **Attribution or evidence references:** [restricted receipt IDs and hashes].

### Exceptions schedule

Keep the completed schedule in restricted storage. Add one row per known input, contributor, reference, restriction, or unknown; group only when the same evidence and resolution genuinely cover the whole group. Do not prefill owner facts.

| Item or explicit `NONE` | Type and affected component, if known | Permission/restriction or unknown | Evidence receipt or gap | Proposed resolution and owner |
| --- | --- | --- | --- | --- |
| [owner to complete] | [owner to complete] | [owner to complete] | [owner to complete] | [owner to complete] |

## Owner-response gate

1. Review the exact HTML and three evidence gates above. The optional 23-row worksheet may help locate an exception, but its completion is not required. Save the dated attestation, exceptions schedule, and supporting dependency/authority records in restricted storage; give each final record a receipt ID and SHA-256.
2. Send the receipt IDs and hashes, any unresolved exceptions, and an approved public status summary to the Integration Captain. If a gate is unresolved, keep HTML held and identify the specific missing fact or conflicting input. If all three gates are reconciled against unchanged bytes, the Captain can seek a separate reviewed exact-hash disposition. No per-file answers are required unless an exception points to a file or component.
3. Reopen this intake on a changed HTML hash, source/dependency version, notice, creator/authority claim, exception, or conflicting evidence. A disputed input may need a separately authorized product replacement and affected H11 capture review.

No external contact, counsel engagement, policy publication, native project, store record, signing, upload, distribution, or release follows from this intake.

### Ready-to-send owner intake

> Please provide one dated, attributable attestation for your authority to continue commercial preparation of the original imported-v42 code/material in KickLab's **held** `dist/mobile/index.html` at main `714bfb3075d26519bd0050553aab0f4d5e02ea13`, SHA-256 `9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d` (2,639,746 bytes). Confirm the identified dependency notice/permission records, and complete a dated exceptions schedule listing every known third-party input, contributor, reference, restriction, or unknown. Use `NONE` only as your explicit statement after review. The 23-row map and blank restricted worksheet are optional audit aids; answer by file only where an exception needs it. Keep private evidence in restricted storage and return record IDs, SHA-256 values, unresolved exceptions, and an approved public summary. Keep HTML held until all three gates are reconciled against unchanged bytes. This intake authorizes no product change, H11, Wave 3, native, policy, store, signing, upload, distribution, or release action; stop on a changed hash or conflicting evidence.
