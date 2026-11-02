# KickLab privacy, deletion, and support policy — internal draft

Updated 2026-11-01 for exact `origin/main` `7e16186ba85d5f8048104819ae53602870ffecb3`. **Do not publish.** Browser Gate 1 is qualified at this merge, but native SDK traffic, OS backup/restore, permissions, support-provider handling, and final store declarations are unverified. This draft describes the proposed US$4.99 paid-upfront V1 for ages 9–15, with Apple Kids Category primary 9–11 and Google target bands 9–12 and 13–15. It is not a legal opinion or a claim about a signed mobile binary.

The provisional legal developer is **AmaduTown Advisory Solutions**, conditional on active legal registration, matching store-account identity, and written KickLab ownership/license evidence. Vambah Sillah is the internal rights/release approver and initial incident owner. External IP/privacy review is required before distribution.

## What the game keeps

KickLab is designed to work without an account. It stores a made-up player nickname, selected avatar and settings, local scores, awards, and progress on the device. Private Party displays QR cards and accepts a code manually pasted by the player; the approved flow does not send that code to a KickLab server. The proposed release has no ads, in-app purchases, analytics, public chat, public matchmaking, or cloud sync. Fight, Race, and Kick must remain playable locally.

**Publication gate:** inspect the exact signed iOS and Android binaries, native SDKs, permissions, OS backup behavior, and network capture before turning those design statements into public promises. If data leaves the device or platform backup restores deleted saves, update the policy and store declarations first.

## Choices, sharing, and retention

The storefront handles the upfront purchase under its own terms. KickLab does not ask a child for a real name, email address, precise location, account, camera, or microphone permission. Private Party is offline QR display and manual paste; Race highlights replay in the app. The current browser package removed OS Share and Race file Download. Previously exported files outside KickLab, if any, are outside its delete control. Final native transfer and backup behavior still need proof.

Local game data remains until deleted in the app or removed with the app, subject to verified platform backup and restore behavior. The support channel is planned to use the existing email provider. **Ordinary guardian support tickets will be deleted 90 days after resolution**, with only documented legal or security exceptions. Confirm the provider's access controls, retention settings, deletion workflow, exception register, and incident escalation before publication.

## Delete local data

In the current browser UI, open the player profile, find **Device data** under **For parents and guardians**, select **Delete all local data**, and type `delete` in the confirmation. The action removes KickLab and legacy ImpactLab local/session keys plus app-namespaced caches, verifies removal, and returns to first-run setup. Browser evidence is included in Gate 1. Confirm the same outcome after legacy migration, multiple profiles, restart, uninstall/reinstall, and iOS/Android backup restoration before publishing these steps as native user guidance.

## Guardian support and incident response

The reserved guardian support target is **support@amadutown.com** and the reserved policy target is **https://amadutown.com/kicklab/privacy**. Neither address nor URL is claimed active or published by this draft. Confirm ownership, configuration, accessibility, and response workflow in a separately authorized step.

When a guardian contacts support, request only app version, device model/OS, affected lab, and a brief description. **Do not request raw child profiles, real names, precise location, challenge codes, or unredacted screenshots.** Limit access to accidentally submitted child data and remove it from the ticket where feasible. Escalate suspected exposure to Vambah Sillah as initial incident owner and to external privacy counsel. Pause affected release activity, preserve minimal protected evidence, assess version and data scope, make any required notices with counsel, fix the cause, and verify the corrected build before resuming distribution.

## Before this draft becomes public

Confirm the legal developer and store-account match, rights/license chain, final native data flows, backup and deletion behavior, support-provider retention and exceptions, parent/guardian access to policy and support, and matching Apple/Google declarations. Review every external link and purchase opportunity for the Apple Kids Category parental gate. Publish only after external IP/privacy review and separate approval.

Primary references checked 2026-11-01: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple category guidance](https://developer.apple.com/app-store/categories/), and [Google Play Families](https://support.google.com/googleplay/android-developer/answer/9893335). [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) and [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469) remain final-binary declaration references.
