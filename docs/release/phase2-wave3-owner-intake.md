# Phase 2 Wave 3 — existing evidence disposition basis

Prepared from deployed `main` `15e720dee3f1f427263f23a8a670f02451c9a830`, the merged [PR #174 evidence packet](phase2-wave3-generated-art-evidence.md), and the [25-row identity schedule](phase2-wave3-owner-intake-schedule.csv). The schedule binds H04 (15), H05 (9), and H10 (1) to exact shipped paths, SHA-256 hashes, byte counts, source pointers, and repository-verified lineage.

## No additional owner questionnaire is required

The primary project records already establish the material facts for the portrait rows:

- [Profile avatar art](../profile-avatar-art.md) records that the five original fictional driver portraits were generated on 2026-10-27 with the built-in Codex image generation tool. It preserves the prompts, local source folder, export command, exact character intent, and the fact that no third-party art, real-person likeness, brand, logo, or source photograph was supplied.
- [Player wardrobes](../player-wardrobes-v1.md) records that the Fight and Kick portraits were generated on 2026-10-28 with the built-in Codex image generation tool by editing the corresponding local Race portrait. It records that no third-party photograph, real-person likeness reference, logo, or brand was supplied.
- [Gameplay identity parity](../gameplay-identity-parity.md) records the same locally authored edit chain for the active Fight v2 portraits, including preserved local source PNGs and the absence of outside photographs, real-person references, logos, and brands.
- [Race Coach portrait art](../race-coach-art-v2.md) records that the four fictional Coach sheets were generated on 2026-10-27 with the built-in Codex image generation tool from existing local KickLab identity and art-direction references. It records the prompts, source frames, local assembly/export chain, and that no real-person photograph, brand, logo, or private material was used.
- The exact source PNG and shipped WebP hashes were reconciled in PR #174. The project session record independently confirms that the profile and Coach art was generated with the built-in image tool in the isolated KickLab lane and committed with prompt/provenance documentation.

The owner reaffirmed on 2026-11-03 that the known project creation workflow applies and that no outside photographs were used. Repeating those facts through a new multi-field attestation would add process without adding evidence. No additional owner form, account identifier, workspace identifier, signature, or 25-row response is a prerequisite for the later exact-hash disposition.

## H10 residual record

H10's [asset record](../../src/assets/effects/race/v1/asset-record.json) identifies the nitrous source as an OpenAI image-generation candidate supplied by the Integration Captain, compressed locally to the retained source WebP and processed locally into eight alpha frames with `scripts/race-cinematic-art/prepare-atlas.py`. The retained source WebP and shipped atlas match their recorded hashes. The original generated PNG was not located during PR #174's audit.

That missing historical PNG is a documented audit limitation, not evidence of an outside photograph, third-party mark, runtime provider dependency, or unknown shipped binary. Preserve the limitation and reopen H10 if conflicting evidence appears or either exact hash changes. Do not invent a located source file or reconstructed transaction receipt.

## Recommendation and boundary

The existing records are sufficient to make the next internal exact-hash commercial-preparation decision without another owner questionnaire. The schedule remains a binding identity map. The separate [exact-hash decision](phase2-wave3-internal-rights-decision.md) now updates the active rights ledgers for continued commercial preparation only; it does not authorize release. A later disposition should reopen any row only if its hash changes or conflicting creator, input, likeness, mark, provider-term, or rights evidence appears.

Preserve the 204-file package, privacy, and zero runtime egress. No asset replacement, H11 recapture, native work, policy publication, provider configuration, signing, upload, distribution, store record, submission, or release is authorized by this packet.
