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

## Responsive cockpit revision

The follow-on cockpit slice resolves the long-page learning hierarchy without deleting or duplicating the learning tools. Each canonical node now has one owner:

- the stage contains only the canvas and transient game overlays;
- the control deck owns the existing pointer/touch controls and gives every action a readable label;
- the always-visible context column owns the live Math HUD, challenge state, and coach guidance;
- the inspector owns Setup, detailed Math, Review, Goals, and Learn content;
- Dials temporarily borrows the canonical live equation and variable nodes, then returns those same nodes to the Math inspector when it closes.

The Math HUD is derived from the active mode definitions (`M.vars()`, `M.LIVE()`, and `M.eqs()`), rather than scraping rendered text. Inspector interactions explicitly pause modes that could otherwise keep running beneath configuration or math controls, and mobile dismissal returns focus to the invoking tab.

Modal ownership is exclusive. When results, replay, Coach review, a cinematic replay sequence, or a level-up overlay owns the stage, Dials cannot open. The Math HUD keeps a disabled `Dials after round` control and an in-context recovery instruction; keyboard `P` follows the same guard. After the owner closes, Dials re-enables and still returns the singular live-equation and variable nodes to Math.

At mobile and tablet widths, the same canonical inspector moves into an in-flow Utility belt directly below the external control deck. Its five 44 px tabs remain visible together; Setup and Math open the existing paused sheet at that location, while Review, Goals, and Learn keep deeper material behind the same tabs. The sheet grows with the document instead of creating a nested scroll region, and its keyboard events stop before the gameplay handler. Above 980 px, that same inspector returns to the persistent desktop side column.

### Cockpit validation matrix

| Viewport | Mode/state exercised | Result |
| --- | --- | --- |
| 390 × 844 | Fight and Kick/free kick; active play, Utility belt, Setup/Math sheet, knockout result, blocked Dials, Math HUD, challenge, coach, inspector return | No horizontal overflow or stage/control overlap. The belt sits directly below the controls, all five tabs meet the 44 px target, inspector keystrokes do not trigger moves, results remain the sole modal owner, and dismissal restores focus. |
| 768 × 1,024 | Fight and Kick/free kick; active play, Utility belt, Setup sheet and Dials recovery | No horizontal overflow. The belt remains directly below the controls, its five tabs and Return action meet the 44 px target, the sheet uses document scrolling, and Dials returns the canonical Math nodes exactly once. |
| 1,440 × 1,000 | 1v1 Dribble; active play, Setup, Dials, Review, and replay | The stage/control deck and context column remained visible beside the persistent inspector. Canonical Math nodes returned from Dials with no duplicates. |

Focused regression checks cover singular canonical IDs, complete inspector tab/panel wiring, controls outside the stage, responsive Utility-belt ownership and tap targets, definition-derived Math HUD values, exclusive result/replay ownership, Dials node return, and readable control labels. The existing shared-core, build, syntax, and web-contract checks also remain green. Browser review found no console errors or warnings.

Remaining evidence limits: viewport emulation is not a physical-device test, browser automation covered pointer and keyboard paths but not a physical touchscreen, and this slice does not add PWA packaging or offline navigation.

## Prioritized web plan

1. **Document contract repair — complete.** UTF-8, mobile viewport, language and main-content semantics, and contract checks are present.
2. **Responsive learning hierarchy — complete for this cockpit slice.** The active stage, controls, live Math HUD, challenge, and coach are immediately visible, while one responsive inspector preserves Setup, detailed Math, Review, Goals, and Learn.
3. **Input and inspector accessibility — complete for this cockpit slice.** Lab and inspector tabs use roving keyboard navigation, readable control labels are visible, mobile inspector dismissal restores focus, and gameplay remains available through pointer/touch hooks and keyboard mappings.
4. **Rendered cross-viewport review — complete.** Fight, Race, Kick, 1v1 Dribble, Dials, Review, replay, locked configuration, and learning interactions were exercised at mobile, tablet, and desktop widths.
5. **Commit-bound evidence and draft PR closeout — in progress.** Capture the final clean-origin screenshots and playable walkthrough from the exact committed revision, publish validation in the draft PR, and stop before merge or deployment.

The cockpit revision has five finite phases. Four are complete and one remains. Installable/offline packaging, service workers, performance budgets, physical-device touch testing, deployment, and native mobile scaffolding are separate future gates rather than hidden work in this revision.
