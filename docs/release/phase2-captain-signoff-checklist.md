# Captain Phase 2 signoff checklist

**Status:** owner-approved for simplified closeout on 2026-11-03; effective when the documentation-only closeout merges with passing checks. Bind the check to exact product baseline `a0be10e6cb23f9d13b8cba4078568b500165359a`, public product SHA-256 `4c421ca7210d958927b9914c635f3042a3e5903ef3ba751a121648fd09a477db`, 204-file package digest `9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6` and owner decision [phase2-owner-closeout.md](phase2-owner-closeout.md).

| Gate | Objective pass criterion | Current result |
| --- | --- | --- |
| Package and rights | Rebuild exact 204 paths and hashes; no held/reopened row; reconcile 203 runtime decisions, N01 notice and Cobalt residual risk without conflicting evidence. | **Pass.** Existing owner attestations adopted; reopen changed or conflicting rows only. |
| Legal and store identity | Keep formal entity, assignment and Apple/Google account alignment as later store-action prerequisites without presenting unsupported claims now. | **Pass for Phase 2.** Deferred to the protected store-identity gate. |
| Guardian targets | Preserve verified support email and keep privacy publication separately gated. | **Pass for Phase 2.** Email passed; publication remains a pre-distribution gate. |
| Support operation | Record manual deletion, exceptions, prohibited child-data handling, incident ownership, sole-admin continuity and provider-automation limits. | **Pass with owner-accepted residual risk.** Revisit before distribution. |
| Privacy foundation | Accept browser/local-first assumptions and explicitly assign native SDK, permission, backup, egress and device facts to Phase 3. | **Pass.** No native result is inferred. |
| Owner decision | Adopt exact package, notice, Cobalt condition, support/privacy findings and the no-duplicate-packets rule. | **Pass:** [simplified owner closeout](phase2-owner-closeout.md). |
| Phase 3 plan | Adopt exact iOS/Android qualification scope and protected exclusions without starting execution. | **Pass as plan only.** Execution remains separately gated. |
| Captain validation | Run standard/focused checks, byte identity and precise phase-boundary checks on the closeout change. | **Pass condition:** documentation-only closeout merges with green checks and unchanged bytes. |

**Pass rule:** The documentation-only closeout must merge with passing checks and unchanged product/package bytes. Phase 2 closeout permits a later request for Phase 3 execution authorization; it does not itself start Phase 3 work. An explicit separate execution authorization must bind the then-current source/package and approved plan before native project generation, SDK inspection, simulator/emulator, physical-device, backup/restore, zero-egress or accessibility execution. Signing, store records, uploads, distribution, submission and release remain later gates.
