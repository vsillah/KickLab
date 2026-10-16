# KickLab provider-neutral service contract

This contract is the smallest safe seam between KickLab clients and a future backend. `src/services/kicklab-service.js` is an executable reference implementation; `src/services/in-memory-repository.js` is a local test adapter, not production storage.

## Domain records

| Record | Required scope and notable fields |
| --- | --- |
| `household` | `id`, `status`, `createdBy`, timestamps |
| `membership` | `householdId`, opaque `accountId`, role `guardian` |
| `childProfile` | `householdId`, optional opaque `accountId`, invented `alias`, `ageBand`, `status` |
| `consent` | `childId`, guardian actor, policy `version`, explicit `scopes`, status and timestamps |
| `progress` | `childId`, revision, bounded game snapshot, provenance (`offline_unverified` or `legacy_local_unverified`) |
| `syncReceipt` | child-scoped idempotency key and resulting revision |
| `leaderboardEntry` | `householdId`, `childId`, challenge/category, score, status (`pending`, `published`, `hidden`) |
| `weeklyChallenge` | public rules/configuration without participant data |
| `moderationRecord` | entry id, action, actor id/role, reason code, time |
| `deletionRequest` | child/household scope, guardian requester, state, time |

Aliases never grant access. Account ids, child ids, and household ids are opaque identifiers, not display values.

## Authorization matrix

| Operation | Guardian, same household | Linked child, self | Different household | Service moderator |
| --- | --- | --- | --- | --- |
| Create child / link account | Allow | Deny | Deny | Deny |
| Grant/revoke consent | Allow | Deny | Deny | Deny |
| Read child progress | Allow with active progress consent | Allow with active progress consent | Deny | Deny |
| Sync child progress | Allow with active progress consent | Allow with active progress consent | Deny | Deny |
| Submit household score | Allow with consent | Allow with consent | Deny | Deny |
| Read household board | Allow | Allow with active board consent | Deny | Deny |
| Publish/hide household entry | Allow | Deny | Deny | Allow only for a supplied entry and audited action |
| Export child data | Allow | Deny in initial contract | Deny | Deny |
| Request child deletion | Allow | Deny | Deny | Deny |
| Manage weekly definition | Deny | Deny | Deny | Allow |

All operations also require active household/profile state. Missing records return the same not-found outcome across scopes where practical to reduce enumeration. Guardian membership establishes authority to manage consent; it does not itself activate child-data processing. The reference service therefore requires active `progress_sync` consent for guardian reads and writes as well as child reads and writes.

## Offline sync contract

`syncProgress(actor, { childId, baseRevision, mutationId, patch, provenance })`

- `mutationId` is unique per child and device mutation. A replay returns the prior revision without applying the patch twice.
- `baseRevision` must equal the current server revision. A stale client receives `conflict` and must fetch, reconcile locally, and retry with a new mutation id.
- The accepted snapshot is bounded and normalized. XP, counts, timestamps, and arrays are not trusted as evidence of achievement.
- Offline and legacy imports remain `unverified`; they cannot directly create a published leaderboard entry.
- The initial merge model replaces allowed top-level progress fields. A later event model can add trusted server-side awards without changing authorization scope.

## Legacy local-key migration

Current keys are `impactlab.v1` (progress and settings) and `impactlab.nick` (display nickname). The observed `impactlab.v1` root is a game-specific object, **not** the service `patch` shape and must never be uploaded directly. Observed root fields include core results (`punch`, `lap`, `goals`, `xp`), awards and presentation (`badges`, `style`), mode state (`play`, `ch`), equipment/settings (`kit`, `gfx`, `mute`), and challenge/match values such as `barHi`, `mWins`, `wk`, `drib`, `gkW`, `passW`, `movesWon`, `duelW`, and `airW`. A future reviewed mapper must explicitly select, bound, and translate supported fields into the narrower service shape. Migration must be a guardian-visible, one-time import:

1. Keep the local keys unchanged until the guardian chooses a target child profile.
2. Parse defensively. Copy only documented progress fields, bound numbers/arrays, and drop unknown keys.
3. Sanitize the nickname into an invented alias; reject email/phone-like values and require correction.
4. Show the target household, child alias, data categories, and “unverified local progress” label before upload.
5. Obtain current consent scopes, then call `syncProgress` with provenance `legacy_local_unverified` and a unique mutation id.
6. Never auto-create or publish leaderboard entries from imported values.
7. Record a local migration receipt only after server acceptance. Do not delete legacy keys until a guardian confirms the synced profile on another session/device.
8. Rollback means retaining local data and removing the imported server snapshot through the guardian deletion path; never silently merge into another child.

## Adapter requirements before activation

A production repository must provide atomic transactions, scoped indexes, unique child/mutation receipts, encryption in transit and at rest, backup/deletion behavior, and provider-level authorization policies matching this contract. Adapters must map conflicts and authorization failures to stable codes without exposing record existence or raw provider errors.
