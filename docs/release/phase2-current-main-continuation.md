# Phase 2 continuation at current main

Prepared 2026-10-28 against exact `fca347dc187ef513ec5d127c49cc839082a698ac`. This updates the merged PR #117 evidence; it does not repeat or supersede the Phase 1 scope decision. Documentation only. No release, legal clearance, native qualification, store answer, or browser Gate 1 pass is claimed.

## What changed since the prior ledger

The fresh `dist/mobile` build has **236 files**: 57 new paths, zero removed paths, and three changed generated files compared with the prior 179-file ledger. The new paths are 15 player outfit WebPs and 40 Marine/Forest preview MP4/JPG files plus two capture manifests. `index.html`, `build-metrics.json`, and `kicklab-mobile-manifest.json` changed hashes as expected from product changes. [The refreshed file ledger](shipped-file-rights.csv) records the exact current hash, source, ownership/license claim, attribution, evidence path, and disposition for all 236 paths. [The dependency ledger](runtime-dependencies.csv) still has 128 lockfile entries; `package.json` and `package-lock.json` did not change between the prior ledger commit and this base. Three.js remains embedded in HTML and the QR generator remains a copied runtime file. Native transitive dependencies remain outside this unsigned browser package audit.

Source review confirms these changes are now present, pending Gate 1 behavior proof:

| Earlier issue | Current source evidence | Status for this packet |
| --- | --- | --- |
| Private Party camera scan | `src/game/50d-race-private-party-ui.js` and `src/index.html` contain no scan control or `getUserMedia` path | Removed from current source; verify packaged UI and permission behavior in Gate 1/native gates. |
| Highland-only location step | `src/game/65-race-preflight.js`, `src/shared/race-venue-selection.js`, `docs/race-venue-selection.md` | Venue-first Highland, Marine, Forest cards and sequential event journeys are present; visual/interaction Gate 1 remains. |
| Pause Save & Exit | `src/game/61-gameplay-pacing.js`, `src/game/49-profiles.js` | Control and saved setup restore are present; restart/re-entry Gate 1 remains. |
| Inconsistent locked states | `src/styles.css` `.kl-locked`, `src/game/65-race-preflight.js` | Shared visible lock treatment and requirement text are present; viewport/accessibility Gate 1 remains. |

## Rights disposition and evidence needed

The ledger has **211 `hold` rows**, **23 source/provenance rows marked `exclude from release`**, and **two build metadata rows needing an exclusion/necessity decision**. These are exact-path dispositions, not a statement that every held file has an independently bad license. The hold on imported v42 ownership covers the HTML bundle. The main release cannot be sold while these holds remain.

| Group and exact-path pattern | Current evidence | Missing release decision |
| --- | --- | --- |
| `dist/mobile/index.html` | `scripts/build.mjs`, `src/index.html`, `src/game/*.js`, `src/shared/*.js`, `src/vendor/three.min.js` | Establish imported v42 ownership/assignment and Fight/Kick embedded art/sound rights; include Three.js MIT notice. Source changes for HUD, identity, venue and lock UI are inside this bundle. |
| `dist/mobile/assets/players/v1/{fight,kick}/*.webp`; `assets/players/v2/fight/*.webp` | `docs/player-wardrobes-v1.md`, `docs/gameplay-identity-parity.md`, `docs/profile-avatar-art.md`; source PNGs outside runtime | Confirm generation-date terms, original input rights, source/output hashes, likeness/mark review, and owner signoff. v1 Fight remains bundled even though v2 is active. |
| `dist/mobile/assets/drivers/v2/*.webp`; `assets/coaches/v2/*.webp`; `assets/effects/race/v1/nitrous-flame-atlas.webp` | `docs/profile-avatar-art.md`, `docs/race-coach-art-v2.md`, `src/assets/effects/race/v1/asset-record.json` | Confirm generated-art terms and source lineage; do not infer clearance from a prompt alone. |
| `dist/mobile/media/race-preflight/venue-*.{jpg,mp4}` | `src/media/race-preflight/venue-manifest.json`, `venue-arrival-manifest.json`, `docs/race-venue-selection.md`, `scripts/generate-race-preflight-media.mjs` | Verify each captured model, scenery, sound (if any), and source rights. Forty new media files are held. |
| Existing Race media, home previews, Garage thumbnails, models, effects, awards | Exact per-file evidence paths and hashes in CSV; existing asset manifests and art records | Close author/ownership and rendered-input chain, upstream MakeHuman CC0 input snapshot, and any MIT notice. Garage thumbnails still lack a complete per-file source rights record. |
| Copied `.blend`, provenance JSON, and build metadata files | `scripts/build.mjs`, `scripts/prepare-mobile.mjs`, CSV | Remove unused source/records from a later release build or justify inclusion. This packet changes no build behavior. |
| `dist/mobile/party-qr.js` and embedded Three.js | `package-lock.json`, installed package metadata/license, `src/vendor/three-runtime-entry.js` | Ship exact MIT copyright/permission notices and audit native dependencies later. |

No asset is commercially approved by this packet. If a rights owner cannot verify an exact row, keep that row and the dependent release on hold; a separate product/build lane may replace or exclude it. Primary rights references rechecked 2026-10-28: [MakeHuman MPFB license](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md), [Three.js MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE), and [OpenAI Terms of Use](https://openai.com/policies/row-terms-of-use/). Their general terms do not prove the exact KickLab input chain.

## Product/privacy findings that remain open

1. **Local deletion:** no complete guardian-facing delete-all path was found in `src/index.html`, `src/game`, or `src/shared`. The documented local keys include `impactlab.v1`, `impactlab.nick`, `kicklab.profiles.v1`, plus the session-only `kicklab.race.home-entry.v1`. The [standalone deletion brief](phase2-product-remediation-briefs.md) defines a narrow product lane; no code is changed here.
2. **Race highlight OS sharing:** `src/game/50b-race-competition.js` still reveals `#raceShareNative` when `navigator.canShare` succeeds and calls `navigator.share`. This is distinct from Private Party, but it prevents a blanket “no sharing” declaration. The [separate export brief](phase2-product-remediation-briefs.md) presents removal for V1 as the recommended bounded choice, pending Vambah's product decision. Google says direct on-device transfer to another app can count as sharing in [Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469). A final declaration needs final-build proof.
3. **Backup, support, retention:** native backup/restore behavior, legal developer identity, support contact/provider, ticket retention, and incident owner remain undecided. The [privacy draft](privacy-and-support-policy-draft.md) retains placeholders and must not be published.

## Decisions for Vambah before commercial release

- Approve a rights owner and evidence standard for imported v42, generated art, MakeHuman inputs, Garage thumbnails, and media captures; choose replacement/exclusion for any row that cannot be cleared. Approve MIT notice placement and removal of extra source files from the release package.
- Choose whether Race highlight OS sharing is removed for V1 (recommended for the approved local-first child posture) or retained with a precise guardian-facing flow and matching store declarations. Private Party remains display/paste only.
- Approve the local-delete product behavior, backup/restore posture, legal developer/support identity, support ticket retention period, and incident escalation owner.
- Choose Apple Made for Kids 9–11 versus the non-Kids category path for the 9–15 audience; approve final age-rating evidence. Choose Google 9–12/13–15 audience declarations and final Data Safety/IARC answers after product decisions.
- Choose an upfront price and initial territories from [the worksheet](store-declaration-worksheets.md). No console entry or purchase is authorized by this list.

Policy sources rechecked 2026-10-28: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple Kids category guidance](https://developer.apple.com/app-store/categories/), [Apple age-rating reference](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/), [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Google target audience](https://support.google.com/googleplay/android-developer/answer/9867159), [Google Families](https://support.google.com/googleplay/android-developer/answer/9893335), [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469), and [Google content rating/IARC](https://support.google.com/googleplay/android-developer/answer/9859655). Recheck at submission; the actual console questionnaire and final binary are authoritative for declarations.
