# Local player profiles

KickLab profiles are device-local display and progress containers. They are not accounts, identities, authorization records, or consent records.

## Storage

`kicklab.profiles.v1` stores a versioned envelope with an active profile id and up to 12 local profiles. Each profile contains:

- a made-up nickname, avatar style, and color;
- the existing progress object, including XP, badges, records, challenges, equipment, and style;
- local creation and update timestamps.

The profile UI does not request a real name, email address, age, school, location, or raw gameplay telemetry. Profile data stays in browser storage. No profile code calls a network or provider API.

## Legacy migration and mirror

On first use, the profile store reads `impactlab.v1` and `impactlab.nick`. Valid legacy progress becomes one default local profile. Malformed JSON fails to an empty progress object. The original keys are never deleted during migration.

The active profile is mirrored back to `impactlab.v1` and `impactlab.nick` whenever that profile is saved, edited, created, or selected. This lets an older KickLab build see the currently selected player's state without flattening every profile into one record. The versioned envelope remains the source of truth for multi-profile isolation.

## Leaderboards

The Local device board deterministically ranks device profiles across the existing punch, lap, crossbar, match-win, and XP categories. Equal scores share a rank, followed by the next competition rank (for example, 1, 1, 3). Nickname and profile id provide stable display ordering within a tie.

The existing Claude shared database adapter remains optional and unchanged. Its view is labeled separately. When the adapter is unavailable, KickLab states that the shared board is unavailable and keeps the Local device board usable. Remote activation, hosted authentication, guardian consent, deletion/export policy, and provider configuration remain outside this lane.

## Deletion boundary

Profile deletion is deferred. A safe deletion flow needs explicit confirmation, last-profile protection, and a recovery policy. The current UI says this plainly instead of exposing a destructive shortcut.
