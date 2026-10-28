# Store declaration and commercial decisions — working copy

**Current-main update, 2026-10-28:** The decisions below remain open at `fca347dc187ef513ec5d127c49cc839082a698ac`. New Fight/Kick outfit portraits and Marine/Forest venue media affect content/rights review. Venue-first selection, Save & Exit, and locked states are present in source but unqualified in the current browser Gate 1. Local deletion is absent; Race highlight OS sharing remains. Recheck Apple Kids-category/age-rating and Google Families/Data Safety/IARC answers against the exact release binary. The [continuation packet](phase2-current-main-continuation.md) lists decisions for Vambah; [product briefs](phase2-product-remediation-briefs.md) define the narrow remediation. Official Apple and Google sources below were rechecked 2026-10-28; no console answer was entered.

**Specific decision prompts for Vambah:** (1) Is the primary Apple audience 9–11, with the continuing Kids-category obligations, or the full 9–15 range outside Kids with compliant metadata? (2) Should the Race highlight OS Share file action be removed for V1 or retained with guardian controls and a sharing declaration? (3) Is the first paid release limited to the United States, or to a reviewed set of English-language territories? (4) Which one-time starting price should be evaluated, such as US$4.99 or US$9.99? These are planning options, not researched demand estimates or console price selections.

Bound to `0e4af0b8e8d7c678486f2006b03b73a838e9d749`; prepared 2026-10-28. No store record, questionnaire, price, or territory was created. Every answer below is a **draft for owner verification**, not a submitted claim. Recheck linked primary sources and the exact release binary before entering anything in a console.

## Apple: Kids category and age rating

Apple's [category guidance](https://developer.apple.com/app-store/categories/) says the Kids category is for apps designed specifically for children 11 and under, with a 9–11 band. KickLab targets ages 9–15. Two coherent options need a product decision:

| Option | Fit and consequences | Decision evidence |
| --- | --- | --- |
| Select Made for Kids, 9–11 | Fits the younger part of the audience if 9–11 is truly the primary audience. External links and purchasing opportunities need parental gates. Apple says Kids-category expectations continue in later updates even if the category is deselected. The 12–15 audience can still use the app, subject to accurate rating and metadata. | Written primary-audience rationale; inventory of every link, export, support route, and gate; child-focused content review. |
| Do not select Kids category | May fit a primary audience extending through age 15. Apple restricts “For Kids” / “For Children” metadata terms outside Kids. Child privacy obligations and accurate age rating still apply. | Written primary-audience rationale; metadata copy review; guardian-facing policy/support path. |

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

**Target audience worksheet.** Draft age groups: **9–12 and 13–15**. Confirm with the final product and marketing; the younger band triggers the [Families policy](https://support.google.com/googleplay/android-developer/answer/9893335). Record content suitability, SDK/identifier inventory, child-appropriate ads declaration (**no ads**), privacy-policy URL, and any link/export behavior. [Google target-audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159) requires the declared groups to match the app's content and presentation. No neutral age screen is proposed because no ads or mixed monetization are approved.

**Data Safety worksheet.** Proposed answers remain **pending** until the final native build and Race highlight export are reviewed. Google says data processed only on-device generally need not be disclosed as collected, but on-device transfer directly to another app can count as sharing. A user-driven `navigator.share` highlight export therefore needs a specific declaration decision; do not answer “no sharing” by looking only for server traffic. Record each data type, purpose, off-device path, optionality, security in transit if applicable, retention, deletion path, and SDK behavior. The local nickname/profile/progress and pasted Private Party code are expected device-only; validate this with network logs, permission review, code payload inspection, and device backup tests. The privacy policy must match actual behavior. [Google Data Safety instructions](https://support.google.com/googleplay/android-developer/answer/10787469) were accessed 2026-10-28.

| Data / capability | Current hypothesis | Required proof before declaration |
| --- | --- | --- |
| Nickname, profile, progress, settings | Local storage only | Exact keys, no egress, backup/restore and delete tests. |
| Private Party code and QR display | Manual local transfer; no camera scan or OS sharing | Payload inspection; UI and permission audit; no clipboard auto-read. |
| Race highlight file | Generated locally; separate OS share action exists | Product decision on inclusion; determine Data Safety sharing treatment and child-facing controls. |
| Device identifiers / diagnostics / SDK traffic | None authorized | Native SDK and network capture; no ad/analytics SDK. |
| Account deletion | No account exists | Confirm no hidden account path; local-data deletion is still required as a product promise. |

**IARC/content-rating worksheet.** Select Games in Play Console and answer the [rating questionnaire](https://support.google.com/googleplay/android-developer/answer/9859655) against the release build. Review Fight's combat presentation and injury cues; Race crashes/collisions; Kick content; language, fear, substances, sexuality, gambling, user interaction, location sharing, and unrestricted web. Use actual video/stills and feature-state evidence. Do not preselect a rating. IARC can assign different territorial ratings and may change a rating after review. Owner records the resulting certificate and any territory restrictions before release.

## Paid-upfront price and territory choices

Pricing is a product decision, not an expense authorization. [Apple pricing guidance](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price) requires a Paid Apps Agreement and permits a base storefront with generated regional prices; [Google Play pricing guidance](https://support.google.com/googleplay/android-developer/answer/6334373) generates local prices from a default price. Confirm actual storefront price points, taxes, and proceeds in each console only after protected authorization.

| Decision | Option A | Option B | Evidence needed |
| --- | --- | --- | --- |
| Upfront price | Low entry price to test family willingness | Higher one-time price reflecting three complete labs | Competitor and family research, support cost, platform net proceeds, school/family accessibility; no IAP or subscriptions. |
| Initial territories | One English-language home market for bounded support and policy review | Small English-language set after local legal, rating, tax, and support checks | Store availability, consumer rules, accessibility/localization, content rating, refund/support capacity. |

Do not select a number or country by default. [Apple availability](https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/app-pricing-and-availability) and [Google territory controls](https://support.google.com/googleplay/android-developer/answer/7550024) were accessed 2026-10-28. Additional territories can introduce different ratings and legal/support obligations; record a deliberate expansion decision later.

**Storefront sequencing risk:** Google [states](https://support.google.com/googleplay/android-developer/answer/6334373) that a paid app can be changed to free, but once an app has been offered for free it cannot later be changed to paid under the same package name. Set the paid-upfront posture before any public release; do not create a free listing as a temporary shortcut. Apple requires its Paid Apps Agreement before offering paid content under its [pricing instructions](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price). Both references were rechecked 2026-10-28. No membership, agreement acceptance, or store operation is authorized here.
