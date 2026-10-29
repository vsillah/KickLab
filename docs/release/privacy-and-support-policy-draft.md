# KickLab privacy, deletion, and support policy — draft

**Current-main review, 2026-10-28:** At `40e12647025ea8b7fa405b9fd8346fd435287465`, merged PRs #124/#125 add an in-app delete-all path and remove Race OS Share. Local highlight Download remains present. The new Fight/Kick outfits and Marine/Forest preview media are bundled locally; they do not by themselves establish network collection. This draft remains unpublished. See [Phase 2 continuation](phase2-current-main-continuation.md) and [product briefs](phase2-product-remediation-briefs.md).

**Internal draft, 2026-10-28. Do not publish until the bracketed fields and evidence gates are resolved.** Applies to the proposed paid-upfront mobile game for ages 9–15. The legal developer is **[confirm legal entity]** and the support contact is **[confirm guardian-facing address and policy URL]**.

## What the game keeps

KickLab is designed for play without an account. It saves a made-up player nickname, chosen avatar and settings, local scores, awards, and progress on the device so a player can continue later. Private Party displays QR cards on one device and accepts a code pasted by the player; the code is not sent to a KickLab server. The app has no ads, in-app purchases, analytics, public chat, public matchmaking, or cloud sync in the approved release plan.

**Evidence gate:** the statements above describe the intended release. Before publication, verify the exact signed iOS and Android builds, included SDKs, permissions, OS backup behavior, network traffic, and any Race highlight export. If any data leaves the device or can be handed to another app, update this policy and store declarations before release.

## Choices, sharing, and retention

The storefront processes the upfront purchase under its own terms. KickLab does not ask a child for a name, email, location, account, camera, or microphone access. Private Party exchange is offline QR display and manual paste only. Race highlights can be replayed in the app and presently offer a local file Download. The OS Share action was removed in merged PR #125. **Release decision pending:** [assess whether Download belongs in V1](phase2-local-download-decision.md) and describe any retained export accurately here and in store declarations. Do not promise control over a file after it leaves KickLab storage.

Local game data remains until it is deleted in the app or the app is uninstalled, subject to verified platform backup and restore behavior. **Release decision pending:** confirm whether iOS/Android backups can restore local saves; disclose the result or change the native backup settings in a separate authorized lane. Support messages, if sent by a guardian, are retained for **[approved period after provider review]** and then deleted, except where law requires longer retention. The support provider, access controls, and deletion workflow must be reviewed before this sentence is finalized.

## Delete local data

In the current web UI, open the player profile, find **Device data** under **For parents and guardians**, select **Delete all local data**, and type the exact word `delete` in the confirmation. Merged PR #124 removes KickLab and legacy ImpactLab local/session keys plus app-namespaced caches, verifies removal, clears app-held Race export state, and returns to first-run setup. The confirmation says downloaded files outside KickLab remain. Browser QA is recorded in PR #124; validate the exact release binary with legacy saves, multiple profiles, restart, uninstall/reinstall, downloaded files, and iOS/Android backup restoration before publishing this as user guidance.

## Get help and report a concern

A guardian can contact **[support address]** with the app version, device model and OS, the lab involved, and a short description of what happened. Please avoid sending a child's real name, contact details, location, raw save, challenge code, or unredacted screenshot. The support owner will acknowledge a privacy or safety concern, restrict access to any submitted material, remove accidental child data from the ticket where feasible, and escalate a suspected exposure to the developer's incident owner and privacy counsel. **[Confirm response target and provider escalation path.]**

If a security or privacy incident is suspected, the team will pause affected release activity, preserve minimal protected evidence, assess data and version scope, make required notices with counsel, fix the cause, and verify the corrected build before resuming distribution.

## Before this draft becomes public

Confirm legal developer identity, contact and policy URL; exact data flows and support-provider retention; Race highlight export disposition; local deletion UI; platform backup behavior; no unauthorized permissions or runtime egress; and matching Apple/Google declarations. The parent/guardian path to privacy and support must be accessible without asking a child to provide personal information. If Apple Kids category is chosen, external links and purchase opportunities require the applicable parental-gate review.

Primary references accessed 2026-10-28: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [Google Play Families](https://support.google.com/googleplay/android-developer/answer/9893335), [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469). This draft is not legal advice or a substitute for final-build inspection.
