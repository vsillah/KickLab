# Phase 2 product remediation briefs for separate development lanes

Historical briefs prepared 2026-10-28 from `fca347dc187ef513ec5d127c49cc839082a698ac`. Lane A shipped in merged PR #124; Lane B OS Share removal shipped in merged PR #125. The remaining Download choice is assessed in [this decision record](phase2-local-download-decision.md). These briefs do not authorize this documentation lane to edit product code. Keep each change on a named branch/worktree and review it as a client-facing PR. Preserve Fight/Race/Kick physics, saved-profile compatibility, Private Party display/paste behavior, and zero runtime egress.

## Lane A — guardian-facing local data deletion

**Why:** The current UI and source do not expose a complete delete-all path, yet the proposed privacy policy promises device-local deletion.

**Likely surfaces:** profile/settings UI in `src/index.html` and `src/game/49-profiles.js`; storage contract in `src/shared/profile-store.js`; `src/game/01-progress.js`; test fixtures for legacy/current keys.

**Acceptance criteria:**

1. A clearly labeled action is reachable from a guardian-appropriate settings or profile surface on phone, tablet, laptop, and desktop. It explains which profiles, progress, settings, and local exports will be erased. A separate confirmation prevents accidental loss.
2. Confirmation removes `impactlab.v1`, `impactlab.nick`, `kicklab.profiles.v1`, and app-owned transient storage/cache without clearing unrelated origin data. Cancel changes nothing. The current session returns to safe first-run state; no old data reappears after reload, restart, or profile switching.
3. Tests cover legacy-only data, migrated/multiple profiles, corrupted storage, storage exceptions, and cancellation. Manual browser evidence covers visible flow and safe areas. Native gates later verify backup/restore and uninstall expectations on iOS/Android.
4. No account, remote deletion API, analytics, permission, or network request is introduced. Attach a privacy-safe MP4 for client-facing Human QA after Captain visual review; do not claim native qualification from browser tests.

**Stop:** if deletion could erase unrelated data, break legacy migration, or cannot be verified under backup/restore, keep the privacy policy unpublished and release on hold.

## Lane B — Race highlight export release boundary

**Why:** `src/game/50b-race-competition.js` uses `navigator.share` for a generated Race highlight. This must have an explicit V1 decision before a child-facing privacy claim and Google Data Safety answer.

**Recommended V1 scope, subject to Vambah's decision:** remove or disable only the OS Share file action and related copy from the release experience, while preserving local replay and result review. Evaluate whether local Download file is acceptable under the selected Apple Kids category and guardian-facing policy. Keep Private Party unchanged at QR display plus paste-code transfer.

**Alternative:** retain OS sharing only if Vambah approves a specific guardian-facing flow and the privacy owner documents its data payload, recipient-app boundary, Apple Kids-category treatment, and Google Data Safety sharing answer. Do not infer that user initiation exempts the transfer.

**Acceptance criteria for the selected option:**

1. The visible result UI and accessibility labels match the decision at every viewport; no silent or hidden invocation of `navigator.share` remains if removed. Local replay stays bounded and profile-specific.
2. The selected flow is exercised with `navigator.canShare` true/false, permission denial/cancellation, offline mode, and a synthetic profile. Capture request/permission logs with zero app egress. No child name, raw profile, or unrelated progress enters the exported file.
3. Update the policy and store worksheets only after the exact binary is verified. If retained, document the external-app transfer and parental/guardian controls; if removed, confirm no other app-to-app sharing path remains before answering “no sharing.”
4. Captain checks desktop/mobile rendering and all affected actions; provide a privacy-safe MP4 for Vambah's Human QA. No store record, native permission, upload, or distribution is part of this lane.

**Stop:** if OS sharing or download behavior cannot be reconciled with the approved child-safety posture and store declarations, hold the release.
