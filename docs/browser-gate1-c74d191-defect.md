# Browser Gate 1 checkpoint at `c74d191`

## Exact artifact

- Deployed main: `c74d19125a6b8252c3ae65226b32457d7a689bff`.
- Public `/KickLab/` HTML and local `dist/pages/index.html` SHA-256: `21fdff8c67f376406caa41829cd09b27be838844fb4866e659c275f512304905`.
- Product runtime is byte-identical to `818828b6bcbf2d4d1c07e8c9b13658591d6522d2`; the intervening main change is the Race offline-entry matrix script.
- Reproduction URL: `http://127.0.0.1:4173/pages/index.html?rev=c74d19125a6b8252c3ae65226b32457d7a689bff` from the exact local Pages build.

## Deterministic client-facing defect

At 390 × 844, enter Fight after the document loads, deny network access, and leave the bout untouched until Rex Mk I knocks the player down. The Fight guidance rail paints over the results card and the right edge of the **Next round** button. The [captured result](evidence/browser-gate1-c74d191-fight-390-loss.png) is from the exact local Pages build above, which matches the public HTML hash. No player data or network service is involved.

`scripts/qa-public-fight-offline-outcome.mjs` repeats this path with a fresh synthetic local profile. In the 390 result, `#results` spans x=17–373, y=303–578; `#gameGuidanceHud` spans x=317–369, y=325–633; and `#rNext` spans x=219–347, y=535–568. The rail has `z-index: 26` and results has `z-index: 3`. The overlapping rail appears above the card. The result is **KNOCKED DOWN**. A 1440 × 900 no-input Fight loss also reached its result; this report does not claim full responsive coverage.

This blocks Browser Gate 1 visual-negative-state qualification. The product implementation needs a separate development lane. Re-test the exact loss card at 360, 390, 768, 1113, and 1440 widths after a fix; inspect both the card and each actionable control.

## Passing checks on this head

- `npm run check`: 313 tests and web/Pages contracts passed.
- `npm run mobile:check`: six checks passed.
- Earned Highland → Marine → Forest Race progression passed all six heats on the public-matching artifact with no QA unlock or forced finish. Final progression `unlocked: 3`; no page errors, external requests, popups, or downloads.
- All eight Kick Freestyle activities reached a visible result across 390, 768, 1113, and 1440 widths. The timed Crossbar challenge ended at 104 points. No errors, external requests, popups, downloads, or horizontal overflow were observed.
- Kick Free kick reached **GOAL!** with the network denied after document load and again with device-local writes denied. Both cases had no page errors, external requests, permission attempts, popups, or downloads. The offline case made zero requests after denial.
- Fight at 390 and 1440 reached outcome overlays offline with zero requests after denial, no external requests, permission attempts, popups, downloads, or page errors. The 390 loss is the blocking visual defect.

## Gate status

Browser Gate 1 remains open. The complete visually reviewed negative-state matrix, additional corrupt/denied-storage cases, all Fight/Kick recovery paths, and a current-head visible-browser frame-time measurement remain unqualified. Keep the 50 ms p95 visible-browser threshold. This checkpoint authorizes no native, rights, signing, distribution, store, provider, DNS, or upload action.
