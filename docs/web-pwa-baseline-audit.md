# Web/PWA baseline audit

Audit date: 2026-10-16
Baseline: `776cea3` (`origin/main`)
Lane: `codex/kicklab-web-experience`

## Assumptions and boundaries

- The imported v42 game is the product baseline. This lane adapts it for the web; it does not replace the game or its architecture.
- Fight, Race, Kick, progress, badges, challenges, the family board, the weekly challenge, audio, replay, Three.js rendering, and the legacy `impactlab.*` storage keys must survive unchanged.
- The Shared Architecture lane owns any future shared game-core contract. This lane will not extract or duplicate that foundation.
- No deployment, provider setup, account creation, production credentials, spending, or app-store work is authorized.

## What is already complete

- One dependency-free build command produces `dist/kicklab.html` from the split source files.
- Fight, Race, and Kick render and switch successfully in the current browser build.
- The game already has mouse/touch pointer handling, keyboard gameplay mappings, labeled on-stage controls, reduced-motion handling, responsive CSS, locally stored progress, and an offline-bundled Three.js runtime.
- At 390, 768, and 1440 CSS pixels, the audited page had no document-level horizontal overflow.

## Confirmed web blockers

| Priority | Finding | Evidence | Minimal response |
| --- | --- | --- | --- |
| P0 | Math symbols, arrows, keyboard hints, and emoji render as mojibake. | The browser reported `windows-1252`; the source had no charset declaration. The issue reproduced in all three labs and all audited widths. | Declare UTF-8 before content and add a build regression check. |
| P0 | Real mobile browsers do not receive an explicit device-width layout contract. | The source had no viewport meta element. Desktop viewport overrides exercised the CSS, but that does not prove real-device behavior. | Add `width=device-width, initial-scale=1, viewport-fit=cover`. |
| P1 | The artifact is not installable as a PWA. | No manifest link, manifest file, application icons, or service-worker registration exists. | Add a sidecar manifest, local icons, and a narrowly scoped cache only after the architecture baseline is confirmed. |
| P1 | Full offline use is not guaranteed. | Game code and Three.js are bundled, but Google Fonts are fetched from the network and there is no offline navigation strategy. | Keep system-font fallbacks, then define cache/version behavior in the PWA slice. |
| P1 | The lab tablist lacks standard keyboard navigation. | All three tabs remain in the tab order and Arrow Right on the focused Fight tab does not move selection. | Add roving `tabindex` plus Arrow/Home/End behavior without changing gameplay keys outside the tablist. |
| P2 | Tablet and mobile learning content requires substantial scrolling. | At 390 × 844 the page measured 5,352 px high; at 768 × 1,024 it measured 4,479 px. The math panel stacks below the game at the current 980 px breakpoint. | Test a compact learning-summary pattern separately; do not hide instructional content as part of the packaging fix. |

## Rendered audit matrix

| Viewport | Labs exercised | Result |
| --- | --- | --- |
| 390 × 844 | Fight, Race, Kick | No horizontal page overflow. Mobile on-stage controls rendered with mode-specific accessible labels. Encoding corruption reproduced. |
| 768 × 1,024 | Fight | No horizontal page overflow. Stage and math panel stacked; long-scroll density remains. Encoding corruption reproduced. |
| 1,440 × 1,000 | Fight | Two-column stage/math layout rendered. Existing gameplay continued until the result state. Encoding corruption reproduced. |

Browser console review found no warnings or errors during the audit. The run used a fresh build served from this worktree at `/kicklab.html`.

## Prioritized web plan

1. **Document contract repair (current slice).** Add UTF-8, a mobile viewport declaration, language and main-content semantics, plus checks that preserve the three labs, legacy storage markers, shared leaderboard/weekly features, Three.js, and keyboard/pointer input hooks.
2. **Installable/offline packaging (captain and architecture gate).** Add a manifest, icons, service worker, explicit cache versioning and an offline smoke test. Keep the existing single-file artifact available.
3. **Input and modal accessibility.** Add tablist arrow navigation, focus containment/restoration for dialogs, and focused keyboard/touch/mouse regression coverage.
4. **Responsive learning hierarchy.** Test compact mobile/tablet access to the coach, controls, live math and notebook without deleting instructional material.
5. **Performance budget and repeatable visual evidence.** Record load/animation budgets and capture final mobile, tablet and desktop evidence for each changed state.

The phase count is five and finite for this lane. Only phase 1 is in implementation; phases 2–5 remain gated or unscheduled.
