# KickLab privacy, deletion, and support policy — draft

**Current-main review, 2026-10-29:** At `61e5aff660bb15a6184994c80e3ff3ca958a537c`, merged PRs #124/#125/#127 add local deletion and remove Race OS Share and highlight file Download, preserving in-app Replay. PR #132 allows same-origin and blob packaged 3D assets while external CSP probes remain blocked; PR #133 repairs Fight phone composition. Exact-head browser checks are partial and do not establish native traffic or backup behavior. The Fight/Kick outfits and Marine/Forest preview media are bundled locally; they do not by themselves establish network collection. This draft remains unpublished. See [Phase 2 continuation](phase2-current-main-continuation.md) and [closeout/Phase 3 plan](phase2-closeout-phase3-entry.md).

**Internal draft, updated 2026-10-29. Do not publish until the bracketed fields and evidence gates are resolved.** Applies to the proposed paid-upfront mobile game for ages 9–15. The legal developer is **[confirm legal entity]** and the support contact is **[confirm guardian-facing address and policy URL]**.

## What the game keeps

KickLab is designed for play without an account. It saves a made-up player nickname, chosen avatar and settings, local scores, awards, and progress on the device so a player can continue later. Private Party displays QR cards on one device and accepts a code pasted by the player; the code is not sent to a KickLab server. The app has no ads, in-app purchases, analytics, public chat, public matchmaking, or cloud sync in the approved release plan.

**Evidence gate:** the statements above describe the intended release. Before publication, verify the exact signed iOS and Android builds, included SDKs, permissions, OS backup behavior, network traffic, and every remaining data-transfer path. If data leaves the device, update this policy and store declarations before release.

## Choices, sharing, and retention

The storefront processes the upfront purchase under its own terms. KickLab does not ask a child for a name, email, location, account, camera, or microphone access. Private Party exchange is offline QR display and manual paste only. Race highlights can be replayed in the app. Merged PRs #125 and #127 removed OS Share and the Race file Download path. Prior-version downloaded files outside KickLab remain outside its delete control. Final native data flow and store declarations are still pending; do not promise control over external copies or platform backups.

Local game data remains until it is deleted in the app or the app is uninstalled, subject to verified platform backup and restore behavior. **Release decision pending:** confirm whether iOS/Android backups can restore local saves; disclose the result or change the native backup settings in a separate authorized lane. Support messages, if sent by a guardian, are retained for **[approved period after provider review]** and then deleted, except where law requires longer retention. The support provider, access controls, and deletion workflow must be reviewed before this sentence is finalized.

## Delete local data

In the current web UI, open the player profile, find **Device data** under **For parents and guardians**, select **Delete all local data**, and type the exact word `delete` in the confirmation. Merged PR #124 removes KickLab and legacy ImpactLab local/session keys plus app-namespaced caches, verifies removal, and returns to first-run setup. The confirmation says previously downloaded files outside KickLab remain. Browser QA is recorded in PR #124; validate the exact release binary with legacy saves, multiple profiles, restart, uninstall/reinstall, prior-version files, and iOS/Android backup restoration before publishing this as user guidance.

## Get help and report a concern

A guardian can contact **[support address]** with the app version, device model and OS, the lab involved, and a short description of what happened. Please avoid sending a child's real name, contact details, location, raw save, challenge code, or unredacted screenshot. The support owner will acknowledge a privacy or safety concern, restrict access to any submitted material, remove accidental child data from the ticket where feasible, and escalate a suspected exposure to the developer's incident owner and privacy counsel. **[Confirm response target and provider escalation path.]**

If a security or privacy incident is suspected, the team will pause affected release activity, preserve minimal protected evidence, assess data and version scope, make required notices with counsel, fix the cause, and verify the corrected build before resuming distribution.

## Before this draft becomes public

Confirm legal developer identity, contact and policy URL; exact data flows and support-provider retention; absence of file export in the final native binary; local deletion UI; platform backup behavior; no unauthorized permissions or runtime egress; and matching Apple/Google declarations. The parent/guardian path to privacy and support must be accessible without asking a child to provide personal information. If Apple Kids category is chosen, external links and purchase opportunities require the applicable parental-gate review.

Primary references rechecked 2026-10-29: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [Google Play Families](https://support.google.com/googleplay/android-developer/answer/9893335), [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469). This draft is not legal advice or a substitute for final-build inspection.
