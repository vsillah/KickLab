# Exact-file owner attestation template

Use one signed record per exact shipped file, or a signed batch with **one complete row per file**. Copy identity and required review fields from [runtime-rights-evidence-plan.csv](runtime-rights-evidence-plan.csv). Keep source proofs in a restricted evidence location; store only a path, receipt ID, and hash in this release packet. An attestation is an owner claim until the internal owner accepts the exact-hash evidence and final packet; counsel is optional for a concrete unresolved legal question.

## File identity

| Field | Required entry |
| --- | --- |
| Package and base | KickLab `dist/mobile`, deployed main `96ed8a5dfa5de5dcf5cfcefd68ad466d369c64f3`; replace with the exact candidate commit at signing |
| Shipped relative path | `[copy exact mobile_path]` |
| SHA-256 and bytes | `[copy exact ledger SHA-256]`; `[copy exact ledger size]` |
| Rights group and wave | `[H01–H11 or H09R]`; `[W1–W4]` |
| Source inputs | `[source files, generators, prompts, models, textures, sound, third-party components, source revisions, hashes]` |
| Evidence location | `[restricted path or receipt ID, access owner, SHA-256; no raw private chat or child data]` |
| Product use | `[lab, screen, player/Coach identity, mode/vehicle, capture or fallback]` |

## Owner declaration

1. **Creation and chain:** I identify each creator and contributor, my relationship to their work, dated assignment/license terms, and the exact source-to-output chain. Repository presence, a generator manifest, or local capture alone is not proof of ownership.
2. **Inputs:** I list every third-party input, tool or service and its terms at creation time. I identify fonts, geometry, textures, image references, sound, source photos, and embedded code. For generated art, I attach the prompt/edit lineage and source/output hashes. For MakeHuman, I identify each upstream core asset and prove no restricted community asset entered the derivative.
3. **People and marks:** I record the real-person likeness, child-facing, brand, trademark, vehicle trade dress, and attribution review, including a signed “none found” decision only after inspection.
4. **Use granted:** I state the right to modify, reproduce, package, distribute, and sell the exact file in the proposed paid KickLab release and territories. I identify expiry, credit, source-disclosure, share-alike, or other obligations.
5. **Disposition:** Choose **clear with evidence**, **recapture/regenerate**, **replace**, or **remove behind a reviewed fallback**. If replacing or removing, name dependent UI, saved IDs, captures, notices, and the separate implementation PR. A proposed disposition does not change the shipped ledger or clear release.

| Decision field | Entry |
| --- | --- |
| Decision and reason | `[one disposition; cite evidence IDs]` |
| Replacement/recapture dependencies | `[exact paths and consumer surfaces; link the recapture map]` |
| Required validation | `[tests, browser/device matrix, privacy/egress, accessibility, hashes]` |
| Owner | Vambah Sillah, internal rights/release approver |
| Owner signature and date | `[signed record and date; no unsigned checkbox]` |
| Internal owner decision | `[dated exact-hash acceptance or rejection, evidence IDs and obligations]` |
| Candidate build identity | `[commit, package tree/hash, exact resulting path/SHA after any edit]` |

**Stop:** reject an absent signature, stale hash, ambiguous creator or consumer, missing source input, unsupported license claim, incomplete likeness/mark check, or mismatch between the signed file and the candidate package. Reopen dependent media and validation if any upstream source changes. Keep the [installed notice row](shipped-file-rights.csv) separate; the MIT text in the package does not itself complete final terms and placement verification.
