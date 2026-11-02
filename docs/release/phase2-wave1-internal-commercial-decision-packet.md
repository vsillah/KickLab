# Phase 2 Wave 1 internal commercial-release decision packet

Prepared 2026-11-02 against exact deployed main `fbb7ddbdca198f6cccc96efb1ac0e1f0d906a269`. The [27-row exact-hash decision schedule](phase2-wave1-internal-commercial-decision-schedule.csv) binds each shipped relative path, SHA-256 and byte count to the [210-file ledger](shipped-file-rights.csv), [209-row runtime plan](runtime-rights-evidence-plan.csv), and prior [W1 status register](phase2-wave1-exact-file-status.csv). This packet supersedes the proposed external-review handoff in this PR. External counsel is an optional, risk-based escalation, not a blanket release prerequisite. This is an internal evidence assessment for owner adoption; it is not a legal opinion or Phase 2 release authorization. The classifications below do not amend the main rights ledger or authorize product changes.

## Decision rule and result

The owner is the internal commercial-rights decision maker. The schedule proposes one of four dispositions for each exact shipped hash. Owner adoption is still required before any clearance or removal decision becomes operative:

- **Internally cleared:** owner-stated no exceptions, exact-file receipt, and repository generator/input evidence support internal commercial use for that hash. Reopen on contrary evidence or any changed output hash. This does not settle other rights rows, store, privacy, or notice gates.
- **Remove:** the file is unnecessary to current gameplay or has an explicit use restriction; exclude it through a separately authorized product/package change. While the current hash remains shipped, it remains a release hold. Removal must include consumer/test updates, a rebuilt ledger, and dependent capture review.
- **Replace:** a confirmed conflicting input or design requires a new asset and downstream recapture. No W1 row currently has that confirmed finding.
- **Held:** available evidence cannot support internal commercial clearance. Obtain the specified source, creator, reference, or design evidence, then reassess; replacement is the fallback. Counsel may be requested for a concrete unresolved legal question, but the absence of counsel alone is not the hold reason.

| Decision | Exact rows | Effect on current package |
| --- | ---: | --- |
| Internally cleared | 15 | Six procedural award images, eight procedural tire-smoke frames, and one procedural smoke PNG are supported candidates for internal exact-hash clearance. |
| Remove | 6 | Four superseded athlete-v1 files, one internal-evaluation placeholder, and one legacy Race vehicle remain shipped and held until removal is implemented and verified. |
| Replace | 0 | No confirmed conflict supports a replacement order yet. |
| Held | 6 | Four active roster vehicles, one Cobalt model, and one Race internals model need stronger input/reference and design evidence. |

Thus **15/27 are supported internal-clearance proposals; 12/27 retain substantive release holds after adoption**. Until the owner adopts these decisions and the ledger is updated, **all 27 remain held in the current package**. The other 182 runtime rows and the separate notice row retain their existing states. No blanket commercial release follows from this W1 subset.

## Receipt chain and limits

On 2026-11-02 the owner stated that the W1 assets were created personally or under KickLab direction, gave a best-knowledge belief about third-party inputs and protected likeness, marks and designs, expressed intent to modify, package, and commercially distribute in the United States, and supplied the exception schedule `NONE`. The owner approved an exact-hash attestation action by response annotation. The annotation used placeholder receipt fields; the local receipt ID and hash were generated afterward. No handwritten signature or owner-entered receipt hash is claimed.

| Restricted record | Receipt ID | SHA-256 |
| --- | --- | --- |
| Active versioned owner addendum | `KL-W1-OA-20261102-FBB7DDB-27-002` | `c887854e843ea105ed5ddee36098eb8631ef243473891fdff352ec088ac5c759` |
| Immutable parent exact-file owner receipt | `KL-W1-OA-20261102-FBB7DDB-27-001` | `6409bf1680c8dfeac32d6e255bddb58104ef09630f22f912463acd4196b05d56` |
| Repository creator/input evidence index | `KL-W1-CI-20261102-FBB7DDB-27-001` | `b5286e2eba39d2006571303d338900ea4bd20f4ed9dbd854fe9204c3b96d2d32` |

These owner-controlled records stay outside Git. The active addendum binds the parent receipt and index; the parent lists the 27 paths, hashes and byte counts. The index is repository evidence, not independent creator assignments, licenses, or a legal finding. The restricted coordinator contact is not published or used for outreach. No private receipt body, signature, source evidence, or contact is included here.

## Row evidence assessment

The [owner response packet](phase2-wave1-owner-response-packet.md) and schedule contain the exact repository pointers and consumers. The local scripts and asset records show that the award images are Blender primitive scenes rendered locally; tire-smoke frames are computed deterministic pixels; the additional smoke PNG is generated locally. Combined with the exact owner statement, these support the 15 internal decisions. They do not prove that every visual reference used during design was independently original, so a later contrary input, mark, likeness, or contributor claim reopens the affected hash.

The four athlete-v1 files are superseded by v2 in Kick but still packaged. The placeholder manifest limits use to `internal-evaluation`. The legacy Race vehicle is a packaged source-level test fixture. Those six are **removal decisions, not completed removals**. Current package checks and tests refer to some of them; removal needs its own scoped implementation and regression proof.

The active Race roster, Cobalt and cutaway models are generated locally, but scripts, manifests, Git history, and GLB structure do not fully resolve creator/input references or recognizable vehicle/cutaway design. The six exact hashes therefore stay held. The next internal evidence request is a per-model input/reference inventory, actual creator or assignment chain where applicable, and design assessment. If that evidence cannot support commercial use, replace the model and recapture dependent H07/H11 media. Seek counsel only if a specific unresolved likeness, trademark, trade dress, contributor, or license question remains after that evidence is gathered.

## Boundary and next gates

1. Submit this schedule for owner adoption as the proposed W1 decision overlay. Older Phase 2 plans describe the previous blanket external-review gate and remain historical baselines until a broader rights-plan update is integrated. Their other held rows and requirements are not waived.
2. Route the six removal candidates to a separate product-change lane. Do not delete shipped assets or edit package assertions in this documentation PR.
3. Collect the six held models' input, reference, creator, and design evidence in restricted records. Update exact-hash decisions only with evidence. A confirmed conflict moves the row to **replace**; insufficient evidence leaves it **held**.
4. Reconcile all 209 runtime rows and the notice row before Phase 2 closeout. Legal identity, support/privacy, notice placement, browser/native, and distribution gates remain separate. No native project, store record, signing, upload, provider action, policy publication, or release is authorized here.

## Validation

This PR changes documentation/evidence only. The decision schedule was reconciled to all 27 W1 exact hashes, 209 runtime-plan rows, and 210 packaged paths against the restricted receipt chain. `npm run check` passed (317 tests plus web and Pages contracts); `npm run mobile:check` passed (seven tests). The generated web SHA-256 is `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`, mobile SHA-256 is `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`, and sorted package-tree SHA-256 is `7a7d778c8582002c2e692226af92ed0b17ed25b764fd7a9edb16c79bbe29e3db`; all match the pre-build snapshot. No client-facing behavior changes, so Human QA is not required.
