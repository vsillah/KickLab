# KickLab child safety, privacy, and threat model

Status: Phase 1 design baseline. This document defines the safety boundary for children ages 9–15. It does not claim legal compliance and must be reviewed by qualified privacy counsel before production activation.

## Assumptions

- A parent or guardian owns the account and creates a household.
- A child may have a linked sign-in later, but a child profile can exist without an email address or other direct identifier.
- The browser game remains useful offline. Offline data is local and untrusted until a scoped service accepts it.
- Household leaderboards are private to that household. There is no public or cross-household discovery in the initial design.
- Weekly challenge definitions may be public, but participation, scores, and progress are private.
- Provider integrations, identity vendors, analytics, advertising, chat, direct messaging, and production deployment are outside this slice.

## Data classification

| Class | Examples | Rule |
| --- | --- | --- |
| Public configuration | Weekly challenge id, rules, start/end time | May be cached without identity data. |
| Household-private | Child alias, progress, badges, household board entries | Accessible only to the linked child and authorized guardians in the same household. |
| Restricted child data | Consent records, account linkage, deletion/export records, moderation history | Guardian-only within scope; service moderators receive the minimum record needed for abuse handling. |
| Security metadata | Actor id, mutation id, revision, audit time | Never shown on leaderboards; retain only for security, sync, and accountability. |
| Prohibited in the initial service | Exact birth date, school, address, phone, child email, precise location, free-form child chat, advertising ids | Do not collect or infer. |

Use an age band (`9-12` or `13-15`) instead of an exact date of birth. Display aliases must be invented names and are rejected when they resemble an email address or phone number.

## Trust boundaries

1. **Device/local storage:** controlled by the user and potentially modified. It is a continuity source, not proof of identity, consent, XP, or scores.
2. **Identity adapter:** authenticates an account and supplies an opaque account id. It does not decide household access.
3. **KickLab authorization service:** canonical source for household membership, child-account linkage, active consent, and record scope.
4. **Persistence adapter:** stores already-authorized records. Provider rules remain defense in depth and must mirror the service rules.
5. **Moderation operator:** may act only on a specific reported leaderboard record and must not receive general access to child profiles or progress.

Every request is denied when actor identity, household scope, child linkage, active consent, or record state is missing or ambiguous.

## Primary threats and controls

| Threat | Existing exposure | Required control |
| --- | --- | --- |
| Cross-family reads or writes | The Claude artifact reads up to 1,000 global `board` documents with no household filter. | Put `householdId` on every private record and authorize it before each read/write. Test same-scope and cross-scope cases. |
| Nickname collision/overwrite | Document ids are `category~slug(nickname)`, so two children can target the same record. | Use opaque child and entry ids. Treat aliases as presentation only. |
| Owner-as-global-admin | `user.isOwner()` can delete any displayed board record. | Separate household guardian moderation from narrowly scoped service moderation. Audit every moderation action. |
| Unverified score/XP submission | The browser writes client-calculated values directly. | Store offline progress as `unverified`. Keep submitted scores `pending` until an authorized guardian or trusted future verifier publishes them. |
| Consent bypass | No consent record exists. | Require current, explicit consent scopes for progress sync and household leaderboard participation. Revocation blocks new writes immediately. |
| Enumeration and oversharing | Global snapshot exposes aliases, scores, and dates. | Return only the requested household board, with alias/category/value; never account ids, consent, age band, or progress details. |
| Replay/conflict during offline sync | Local state has no revision or idempotency key. | Require `baseRevision` and `mutationId`; reject stale writes and replay duplicate mutations safely. |
| Unsafe legacy import | `impactlab.v1` and `impactlab.nick` are trusted implicitly. | Import only after guardian review; sanitize alias, bound numeric fields, mark provenance `legacy_local_unverified`, and never auto-publish. |
| Account loss/deletion gaps | No export or deletion flow. | Guardian-scoped export; deletion immediately disables the profile and hides board entries, then cascades child records through an auditable provider job. |
| Sensitive values in logs | Errors and raw records can be logged by adapters. | Log opaque ids and outcome codes only. Never log aliases, progress payloads, consent evidence, or local-storage snapshots. |

## Retention, export, and deletion boundary

- Export is initiated by a guardian in the same household and contains that child's profile, consent history, progress, and leaderboard history. It excludes account credentials and other household members.
- A deletion request immediately changes the child profile to `deletion_pending`, revokes consent, and hides leaderboard entries. Sync, publication, and ordinary reads then fail closed.
- A production adapter must cascade progress, sync receipts, entries, consents, and account linkage within a documented retention window. Minimal audit evidence may retain opaque ids and timestamps only where required.
- Restoring a deleted profile is not part of the initial contract. Create a new profile and obtain new consent instead.

## Out of scope before production

- Legal determination of COPPA, state privacy, GDPR/UK age-appropriate design, or school/FERPA obligations.
- Parent identity verification and consent-evidence vendor selection.
- Abuse reporting UI, human moderation operations, incident response, and retention schedules.
- Production rate limits, encryption/key management, backups, disaster recovery, and provider row-level policies.
- Global leaderboards, child-to-child communication, social discovery, public profiles, ads, or behavioral analytics.
