# Store declaration and commercial decisions — working copy

**Current owner defaults, 2026-11-01:** At exact `origin/main` `7e16186ba85d5f8048104819ae53602870ffecb3`, Browser Gate 1 is qualified; rights, notices, native proof, and final declarations remain open. Apple: Kids Category primary 9–11, gameplay through 15, Games/Sports positioning with Education support, and parental-gate review for external links. Google: 9–12 and 13–15 target bands, Families-compliant, no ads/IAP. Commercial: US$4.99 paid upfront, Family Sharing where available, no trial/subscription/IAP, United States only for a 30-day controlled launch after release approval. Canada/UK/Australia/New Zealand remain future expansion decisions. These are product-owner planning defaults, not entered store answers. See the [Phase 2 packet](phase2-closeout-phase3-entry.md), [rights actions](rights-owner-action-groups.md), and [privacy draft](privacy-and-support-policy-draft.md).

Historical worksheet origin: `0e4af0b8e8d7c678486f2006b03b73a838e9d749`; prepared 2026-10-28 and reconciled to current main above. No store record, questionnaire, price, or territory was created. Every answer below is a **draft for owner verification**, not a submitted claim. Recheck linked primary sources and the exact release binary before entering anything in a console.

## Apple: Kids category and age rating

Apple [category guidance](https://developer.apple.com/app-store/categories/) identifies the Kids Category for apps designed for younger children. The product owner selected **Kids Category, primary 9–11** with gameplay suitable through 15. Games/Sports is the proposed positioning and Education is supporting positioning; exact category/metadata selections remain for the later console gate. Inventory every external link, support route, and purchase opportunity for Apple's [parental-gate requirement](https://developer.apple.com/app-store/review/guidelines/). Review child-focused content and metadata with the final native build. No category checkbox has been selected.

The category choice is **not** the age rating. Apple [generates the age rating from questionnaire answers](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/), which may vary by region/OS. Complete the following from the final build:

| Questionnaire topic | Draft observation | Evidence / owner action |
| --- | --- | --- |
| Violence / combat | Fight Lab has stylized sports combat. Severity, realism, injury, blood, sound, and frequency need visual review. | Record exact Fight clips/screens and descriptor answers; do not infer a 9+ rating from target age. |
| Fear, language, substances, sexuality, gambling | No such content is specified in the release contract; verify all three labs and media. | Content pass with screenshots and owner signoff. |
| User-generated content / communication | No chat or public UGC is approved. Private Party exchanges manually transferred codes; no public matchmaking. | Confirm code payload and visibility in final build. |
| Unrestricted web / external links | No remote navigation is approved; privacy/support links or OS export need separate review. | Link/action inventory and parental-gate decision if Kids chosen. |
| Advertising and purchases | No ads or IAP; one upfront storefront price. | SDK and native manifest audit. |
| Location, camera, microphone | No permission is authorized; camera scan was removed in `0e4af0b8`. | Native permission audit and runtime denial test. |

Primary sources accessed 2026-10-28: [App Review Guidelines 1.3 and 2.3.8](https://developer.apple.com/app-store/review/guidelines/), [Apple Kids guidance](https://developer.apple.com/kids/), [age-rating values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/), [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/). The continuing Kids-category expectation is an effectively persistent product commitment, even though the console checkbox can be changed.

## Google Play: Families, Data Safety, IARC

**Target audience worksheet.** Product-owner target groups: **9–12 and 13–15**. Verify against the final product and marketing; the younger band triggers the [Families policy](https://support.google.com/googleplay/android-developer/answer/9893335). Record content suitability, SDK/identifier inventory, child-appropriate ads declaration (**no ads**), privacy-policy URL, and any link/export behavior. [Google target-audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159) requires the declared groups to match the app's content and presentation. No neutral age screen is proposed because no ads or mixed monetization are approved.

**Data Safety worksheet.** Proposed answers remain **pending** until the final native build, SDKs, backups and remaining data paths are reviewed. Google says data processed only on-device generally need not be disclosed as collected, but on-device transfer directly to another app can count as sharing. Merged PRs #125/#127 remove Race OS Share and Download; do not answer “no sharing” from source changes alone. Record each data type, purpose, off-device path, optionality, security in transit if applicable, retention, deletion path, and SDK behavior. The local nickname/profile/progress and pasted Private Party code are expected device-only; validate this with network logs, permission review, code payload inspection, and device backup tests. The privacy policy must match actual behavior. [Google Data Safety instructions](https://support.google.com/googleplay/android-developer/answer/10787469) were rechecked 2026-10-29.

| Data / capability | Current hypothesis | Required proof before declaration |
| --- | --- | --- |
| Nickname, profile, progress, settings | Local storage only | Exact keys, no egress, backup/restore and delete tests. |
| Private Party code and QR display | Manual local transfer; no camera scan or OS sharing | Payload inspection; UI and permission audit; no clipboard auto-read. |
| Race result and Replay | In-app replay retained; OS Share and file Download removed in merged PRs #125/#127 | Confirm final binary has no export path and review all other SDK, backup and transfer behavior before Data Safety answers. |
| Device identifiers / diagnostics / SDK traffic | None authorized | Native SDK and network capture; no ad/analytics SDK. |
| Account deletion | No account exists | Confirm no hidden account path; merged PR #124 adds local-data deletion; verify final binary, backup and restore. |

**IARC/content-rating worksheet.** Select Games in Play Console and answer the [rating questionnaire](https://support.google.com/googleplay/android-developer/answer/9859655) against the release build. Review Fight's combat presentation and injury cues; Race crashes/collisions; Kick content; language, fear, substances, sexuality, gambling, user interaction, location sharing, and unrestricted web. Use actual video/stills and feature-state evidence. Do not preselect a rating. IARC can assign different territorial ratings and may change a rating after review. Owner records the resulting certificate and any territory restrictions before release.

## Paid-upfront price and territory defaults

The product owner set **US$4.99 paid upfront**, Family Sharing where available, no trial/subscription/IAP, and **United States only** for an initial **30-day controlled launch** after release approval. Canada, the UK, Australia, and New Zealand are later expansion decisions. The 30-day period has no scheduled start; no price, territory, agreement, or store record has been entered. Verify final storefront availability, taxes, platform net proceeds, family-sharing eligibility, support capacity, and ratings before later action. [Apple pricing](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price) and [Google Play pricing](https://support.google.com/googleplay/android-developer/answer/6334373) are decision references.

**Storefront sequencing risk:** Google [states](https://support.google.com/googleplay/android-developer/answer/6334373) that a paid app can be changed to free, but once an app has been offered for free it cannot later be changed to paid under the same package name. Set the paid-upfront posture before any public release; do not create a free listing as a temporary shortcut. Apple requires its Paid Apps Agreement before offering paid content under its [pricing instructions](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price). Both references were rechecked 2026-10-28. No membership, agreement acceptance, or store operation is authorized here.
