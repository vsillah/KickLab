# Race rewards and competition prototype

## Scope and parity

This is phases 1–2 of a four-phase Race competition roadmap. The feature runs only on a trusted origin with `raceCompetition=prototype`; the ordinary game stays unchanged. Race Expansion remains separately gated by `raceExpansion=prototype`.

| Existing system | Reuse | Adaptation |
| --- | --- | --- |
| `kicklab.profiles.v1`, `impactlab.v1`, `impactlab.nick` | Profile-local progress and legacy mirrors | Add small `raceCompetition` records inside each profile's progress. No new storage key. Report quota failure as session-only. |
| Badges, profile, Coach Nia | Achievement language and profile card | Six Race-specific awards and cosmetic titles/crest; no physics, scoring, or Garage advantage. |
| Family board | Device profile comparison and rank treatment | Race rankings use `Racer 1`, `Racer 2`, etc. and explicitly say device-only. No shared board write or global claim. |
| Race mode result rules | Pass/score for Drag, Drift, Circuit, Hill, Endurance | Only a passed result enters the matching score board. A successful core run records lower-is-better elapsed time. |
| `RECS.race`, `startReplay`, `Race.snap/applySnap` | In-memory deterministic replay frames | Explicit Record / Share captures the final 12 seconds to a local WebM file where supported. An honest PNG highlight is offered if recording fails. No automatic upload or public URL. |

The visible board shows the active profile's personal best, supported improvement from the prior best, current device rank, and six award goals. Rank history is deferred because the profile store currently has no durable rank snapshots. A made-up alias protects the local nickname in the export and Race board. File sharing calls `navigator.share` only from the Share button.

## Phase 3 contract: alternating local head-to-head

One device, two existing local profiles. A match snapshots each participant's profile ID, mode, vehicle rules and target before play. Racer 1 finishes, then Racer 2 plays against Racer 1's recorded ghost. Vs Computer names the human Racer 1 and the opponent Computer. The UI uses these labels throughout setup, handoff, progress, results, Coach guidance, and accessible names while stable internal A/B keys remain unchanged. The match record lives in memory until both runs resolve or the match is explicitly abandoned. A profile switch must remove the previous racer's live data and replay artifact from the current view. Solo XP, badges, bests, autosave and statistics must remain untouched until a resolved match commits only an agreed match result to each participating profile. Failed, abandoned and interrupted matches commit nothing. The UI must show turn, result, blocked actions and recovery clearly. This follows Dark Castle Chess's local-profile presentation and solo isolation contracts while avoiding its connected invite/provider architecture.

## Phase 4 gate

Connected rooms, authentication, provider-backed storage, invitations, spectators, uploads and public leaderboards require a separate design and authority review. None is configured or activated here. A local alias must never be treated as authenticated identity. Future ownership must derive from an authenticated account and enforce participant-only access server-side.

## Validation and stop conditions

Qualify the flagged route at narrow phone, phone, tablet, 1113 px and desktop widths, including short height, reduced motion, Canvas fallback, empty and multiple profiles, failed and successful results, storage corruption/quota failure, and unflagged behavior. The downloadable video must be playable and show actual replay frames; a PNG fallback must be identified as a still. Any profile leak, automatic network write, misleading global rank, replay failure, or scoring/physics change stops integration.
