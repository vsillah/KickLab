# Browser Gate 1 checkpoint at `42dbb1f`

## Exact artifact

- Deployed main: `42dbb1fe414d967494c7c848a21223ed64dc5ad4` (merged PR #144).
- Public `/KickLab/` HTML and exact-main local `dist/kicklab.html` SHA-256: `e949a4532cd69b7bf05d840f01b97e139e10197e310bb3280786a0532a45a6c9`.
- PR #143 remains test-only. It adds no product runtime change.

## Passing current-head checks

- `npm run check`: 313 tests, web contract, and Pages release contract passed.
- `npm run mobile:check`: six checks passed.
- The public-origin Fight result rail harness passed 30 checks: real no-input losses at 360, 390, 768, 1113, and 1440; a second 390 loss after Next round; and real Cross-control K.O. results at 390 and 1440. The victory path uses no localhost-only fixture. The rail is hidden during results, Next round has a clear hit target, and the card stays inside the viewport. The headless harness measured active-state p95 at 8.7 ms on 390 and 9.7 ms on desktop; visible-browser qualification against the unchanged 50 ms threshold remains open. No page errors or external requests were recorded. Phone and desktop MP4s were encoded and probed as playable.
- The exact-main earned Race journey passed Highland, both Marine heats, and all three Forest heats through visible controls, with zero Forest slide time. No QA unlock or forced finish, page errors, external requests, popups, or downloads.
- All eight Kick Freestyle activities reached rendered result overlays across 390, 768, 1113, and 1440 widths. The run recorded no page errors, external requests, permission queries, media access requests, popups, downloads, or horizontal overflow. Visual review exposed the blocker below.

## Deterministic client-facing defect

At 390 × 844, enter Kick → Freestyle → Combo attack on the exact-main local build, start the activity, and let Rio intercept the pass. The result overlay says **RIO INTERCEPTED THE PASS**. The Kick guidance rail paints over the right side of the results card and the **Next round** button. The [current-head screenshot](evidence/browser-gate1-42dbb1-kick-combo-390-loss.png) records the visual collision.

The focused probe recorded `#results` at x=17–373, y=303–597; `#gameGuidanceHud` at x=317–369, y=325–633; and `#rNext` at x=219–347, y=554–587. The rail has `z-index: 26` and results has `z-index: 15`. A hit test ten pixels from the right edge of Next round lands on `#physicsDetailsHud`, not on the result button. This is a blocked touch area, not just visual overlap. The same output had zero page errors, external requests, permission queries, popups, downloads, and horizontal overflow.

`scripts/qa-public-kick-outcomes.mjs` now records the result/rail geometry and fails when the right edge of Next round is obscured. Run it from a clean exact-head local build after a separate product fix. Recheck Kick result states at 360, 390, 768, 1113, and 1440 widths, including pointer, touch, and keyboard access to each visible action.

## Gate status

Browser Gate 1 stops at this deterministic product defect. Remaining work includes Fight/Kick offline and denied-network recovery beyond the completed entry and Fight result paths, additional corrupt and denied-storage recovery, the complete visual negative-state matrix, privacy instrumentation, and current-head frame pacing across the planned states. Keep native generation, rights, signing, distribution, store, provider, DNS, upload, and publication actions on hold.
