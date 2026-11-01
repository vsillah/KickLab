# Browser Gate 1 blocker at `25ae40f`

## Exact artifact

- Deployed main: `25ae40f67c81cc9eed7281a5da01de5f2831531a` (merged PR #142).
- Public `/KickLab/` HTML and exact-main local `dist/kicklab.html` SHA-256: `05df4ce3e0ddc1570c90a3f1d23077477e61636ac9dad26f9beedf92b54a04c9`.
- The change since the prior Gate 1 checkpoint `c74d191` is limited to `docs/lab-card-icon-provenance.md`, `src/index.html`, and `src/styles.css` for lab-card icons. The Fight result overlap was reproduced again on the current artifact.
- Reproduction URL: `http://127.0.0.1:4173/kicklab.html?rev=25ae40f67c81cc9eed7281a5da01de5f2831531a` from the exact-main local build.

## Deterministic client-facing defect

At 390 × 844, load the document, deny network access, enter Fight, and leave the bout untouched until Rex Mk I knocks the player down. The Fight guidance rail paints over the results card and the right edge of the **Next round** button. The [current-head capture](evidence/browser-gate1-25ae40f-fight-390-loss.png) is from the local build matching the public HTML hash. The probe uses a fresh synthetic device-local profile.

`scripts/qa-public-fight-offline-outcome.mjs` repeats this path. In the 390 result, `#results` spans x=17–373, y=303–578; `#gameGuidanceHud` spans x=317–369, y=325–633; and `#rNext` spans x=219–347, y=535–568. The rail has `z-index: 26` and results has `z-index: 3`, so the overlapping rail appears above the card. The result is **KNOCKED DOWN**. The 1440 × 900 case reached **K.O.!** and did not show the phone collision. Neither case made a request after network denial or attempted permission queries or media access, popups, or downloads; neither had a page error, external request, or horizontal overflow.

This blocks Browser Gate 1 visual-negative-state qualification. Route the product fix through a separate development lane. Re-test the exact loss card at 360, 390, 768, 1113, and 1440 widths after the fix, including each actionable control.

## Earlier exact-head evidence

The following checks passed on `c74d191`, whose public HTML was `21fdff8c67f376406caa41829cd09b27be838844fb4866e659c275f512304905`. They are historical evidence and do not qualify the changed `25ae40f` artifact:

- `npm run check` passed 313 tests and web/Pages contracts; `npm run mobile:check` passed six checks.
- Earned Highland → Marine → Forest Race progression passed all six heats with no QA unlock or forced finish, ending at `unlocked: 3`.
- All eight Kick Freestyle activities reached visible outcomes across 390, 768, 1113, and 1440 widths; Crossbar ended at 104 points.
- Kick Free kick reached **GOAL!** after network denial and with device-local writes denied. The offline case made zero requests after denial.
- Fight reached offline outcome overlays at 390 and 1440; the 390 loss exposed this blocker.

## Gate status

Browser Gate 1 remains open. Earned Forest and Kick outcomes must be rebound to the current artifact after the Fight fix, along with the full visually reviewed negative-state matrix, additional corrupt/denied-storage cases, Fight/Kick recovery paths, and current-head visible-browser frame-time qualification. Keep the 50 ms p95 visible-browser threshold. This checkpoint authorizes no native, rights, signing, distribution, store, provider, DNS, or upload action.
