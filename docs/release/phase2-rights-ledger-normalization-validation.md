# Phase 2 rights-ledger normalization validation

**2026-11-02 baseline:** deployed `origin/main` `96ed8a5dfa5de5dcf5cfcefd68ad466d369c64f3`. This documentation-only round replaces stale blanket external/counsel-review requirements in the active Phase 2 rights ledgers and guidance with internal exact-hash evidence and owner decisions. Counsel remains an optional escalation for a specific unresolved legal question. No rights clearance, model disposition, package change, policy publication, or release decision is made here.

## Scope and historical boundary

The active [204-file shipped ledger](shipped-file-rights.csv), [204-row action map](rights-action-map.csv), and [203-row runtime plan](runtime-rights-evidence-plan.csv) retain every path, SHA-256, byte count, group, wave, evidence pointer, consumer, and held status. The only CSV cells changed are the notice hold reason, two runtime stop conditions, and 203 runtime review-state explanations. All six active W1 models remain held under the [model-by-model evidence requirements](w1-active-model-evidence-disposition.md).

Current closeout, dashboard, owner-attestation, notice, privacy and intake guidance now names internal owner acceptance as the gate. The older W1 status CSV, prior rights assessment, and package-minimization validation remain dated historical evidence. Their earlier external-review language is not a current requirement; the [W1 owner-response packet](phase2-wave1-owner-response-packet.md) and [internal decision packet](phase2-wave1-internal-commercial-decision-packet.md) identify that boundary. The 15 proposed W1 internal clearances have not been adopted in the current ledger.

## Checks

- `npm run check`: passed 318 tests, web contract, Pages contract, and 3D asset validation.
- `npm run mobile:check`: passed seven mobile foundation tests.
- Deterministic CSV comparison against `git show 96ed8a5:<file>`: all 204 shipped and action-map rows and 203 runtime-plan rows retained exact identities and held status. Only the allowed wording fields changed. The 203 runtime rows still reconcile to the 204 shipped rows excluding the notice; six W1 GLBs remain held.
- Active-document scan: no mandatory external IP/privacy review or counsel language in the current guidance set. Dated historical evidence was excluded from this current-rule scan.
- Full `dist/mobile` file scan: 204 paths; every file's bytes and SHA-256 match the shipped ledger. Web HTML SHA-256 `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`; mobile HTML SHA-256 `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`; sorted `path\0sha256\0bytes\n` package-tree SHA-256 `6ac87b156f150ebcde2ef70f8dff812bb018533b9e711b17a84cf91431b99a3c`. All match the pre-edit build and Captain's deployed-main evidence.

No live product/customer-data smoke was run for this documentation-only change. The 204 shipped holds, final internal owner decision, legal identity, privacy/support, notice and later native/store gates remain open. No Human QA is required.
