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
- the on-game settings rail owns configuration through four quick pills and one hierarchical drawer;
- one compact in-game Utility rail owns bounded, progressive-disclosure Math, Review, Goals, and Learn content;
- Dials temporarily borrows the canonical live equation and variable nodes, then returns those same nodes to the Math inspector when it closes.

The Math HUD is derived from the active mode definitions (`M.vars()`, `M.LIVE()`, and `M.eqs()`), rather than scraping rendered text. Inspector interactions explicitly pause modes that could otherwise keep running beneath configuration or math controls, and mobile dismissal returns focus to the invoking tab.

Modal ownership is exclusive. When results, replay, Coach review, a cinematic replay sequence, or a level-up overlay owns the stage, Dials cannot open. The Math HUD keeps a disabled `Dials after round` control and an in-context recovery instruction; keyboard `P` follows the same guard. After the owner closes, Dials re-enables and still returns the singular live-equation and variable nodes to Math.

At every viewport, the four 44 px Utility tabs remain attached to the game frame. Opening Math, Review, Goals, or Learn reveals one bounded, translucent in-game drawer with one intentional scroll owner; closing or pressing Escape restores the invoking tab. The utility drawer never becomes a persistent desktop sidecar or shrinks the gameplay column. Opening settings closes Utility and opening Utility closes settings, so their translucent surfaces cannot compete. Math pauses while its granular canonical controls are active; passive utility content remains nonmodal. Dials may temporarily borrow `#liveEq` and `#vars`, but always returns those singular nodes to the Math utility pane.

### Durable gameplay-math interaction rule

Variables used to play must remain physically attached to the gameplay controls. The full-width Math Console belongs immediately after the control deck at every viewport. Its closed pull-tab names the currently actionable values and reports the live equation/result in plain text. Opening expands a bounded, translucent, non-modal panel above the pull-tab without covering the stage, D-pad, or action buttons and without pausing play. Quick controls project the existing mode definitions and write through the existing variable-update path; they must never clone `#vars`, `#liveEq`, formulas, or state. The Utility belt remains the route to complete Math, Review, Goals, and Learn. Console pointer and keyboard ownership must be explicit, Escape/Close must restore pull-tab focus, and overflow belongs only to the bounded console panel.

The control deck also owns one compact controller-mode toggle: Play by default, or Manual on request. Play renders the original D-pad. Manual replaces that D-pad inside the exact same bounded left-controller footprint; it never opens or expands another drawer beneath the controls. The Manual controller projects one current-mode, unlocked `M.vars()` definition at a time with previous/next selection, its exact value and unit, one canonical range slider, and 44 px Less/More steps. It writes through `adjustVar`, never forks physics state, and owns a named pause during active play. Play or Escape restores the D-pad and toggle focus, resuming only when Manual owned the pause. Results, replay, cinematic, Coach review, and level-up owners disable or return Manual to Play with an in-context reason. Switching labs refreshes the variable set and selected projection immediately while the existing Math Console and current-math HUD continue showing the associated equation/result with singular `#vars` and `#liveEq` ownership.

When the control deck itself reaches 980 px of usable inline width, it switches to a wide cockpit projection. Three balanced, subtly recessed docking surfaces place an enlarged D-pad in the center of the full left zone, the compact variable stack in the center, and enlarged primary actions in the center of the full right zone. The surfaces reuse the dark cockpit palette and stay inside the existing 190 px deck geometry. D-pad arrows and their variable labels share a fixed internal grid, while each action's colored inner face is evenly inset inside its centered shell. The side controls keep clear space around the variable stack instead of hugging the deck edges; one-, two-, and three-action clusters remain centered as a unit. The stack has no internal scroll and writes through the same canonical variable inputs as compact Manual, Math Console, HUD, Dials, and gameplay physics. Challenge locks and result, replay, cinematic, Coach-review, level-up, or in-action guards disable affected sliders and explain why in the stack header. This threshold is based on measured control-deck width through a container query and `ResizeObserver`, so intermediate layouts keep the proven in-place Play/Manual swap instead of squeezing three control systems together.

### Durable game-mode rail rule

The attached Kick rail exposes three top-level experiences: Match, Live Match, and Freestyle. Match launches the authored eight-moment score, saves, goals, transitions, and full-time flow. Live Match launches the four-minute nonstop clock, score, possession, attack, and goalkeeping flow. Freestyle owns the individual activity picker. These experiences remain visibly distinct; Continuous Play is an automatic Freestyle behavior, never a fourth experience or separate entry toggle.

Freestyle activity cards are checked choices and never launch on selection. The rail explains the rule plainly: choose one for a single activity, or choose more than one for Continuous Play. With no selection the primary action is disabled. One choice changes it to `Play activity`; two or three choices change it to `Start continuous`. Selected cards show fixed order as 1, 2, and 3; deselecting and reselecting moves an activity to the end, and a fourth choice is blocked with a useful status message. During a multi-activity run, results name the next activity and acknowledgement advances through the selected keys. Switching experiences or editing the selection stops the temporary run predictably and restores focus. The horizontal activity track owns its inline overflow, while the page must not overflow at mobile, tablet, or desktop widths. Native buttons, checkbox semantics, checked/current state, focus restoration, and 44 px setup actions preserve keyboard, pointer, and touch access.

### Durable on-game settings and guidance rule

Gameplay variables, settings, and guidance use icon-plus-text progressive disclosure near the controls; icons support scanning but never replace accessible words. Coach guidance and the current `Challenge N of N` objective stay in a compact stage HUD band that does not cover the playable canvas. Mode, Player, Environment, and Kit remain one-tap quick pills on the game surface. The settings control opens one canonical, semi-transparent, non-modal drawer attached to the stage: level 1 lists categories, level 2 lists choices, and only Kit Room uses level 3. The drawer must stay bounded, own its single internal scroll region, preserve the pitch and action controls behind or beside it, and never dim the whole page. Opening settings pauses active play through the existing pause owner; Close or Escape resumes play and restores focus to the invoking control. Back preserves the hierarchy, while a lab switch closes the drawer. In D-pad selection mode, the adjacent Math Console shows the selected canonical variable and its exact numeric value, with touch- and keyboard-accessible decrement/increment controls rather than a slider as the primary mobile input. Goal completion appears as a transient, dismissible stage notification with a direct path to the persistent Goals details. None of these projections may duplicate gameplay state, `#vars`, or `#liveEq`.

### Cockpit validation matrix

| Viewport | Mode/state exercised | Result |
| --- | --- | --- |
| 390 × 844 | Fight, Race, Kick/free kick, and 1v1 Dribble; stage guidance HUD, quick settings pills, hierarchical settings, Kit Room, D-pad-selected quick variable, exact stepper input, goal-completion notification, Math Console, results and blocked Dials | No horizontal overflow, canvas/HUD overlap, or clipped Kit Room content. Settings targets are at least 48 px, the drawer does not obstruct the control deck, active play pauses while settings are expanded, touch and keyboard stepper input does not trigger a move, and both notification actions work without leaking input. |
| 768 × 900 | Kick/free kick; stage guidance HUD, quick settings pills, hierarchical settings, Kit Room, Math Console, Utility belt and Dials recovery | No horizontal overflow. The HUD begins after the canvas, settings actions meet the 48 px target, the drawer stays bounded with one scroll owner, the equipment grid remains usable, and the control deck stays unobscured. Dials returns the canonical Math nodes exactly once. |
| 1,440 × 1,000 | Race active-play pause/resume, Kick/free kick, and 1v1 Dribble; hierarchical settings, Kit Room, D-pad selection, quick steppers, goal details path, Math Console, Dials, Review, and replay | The on-game drawer keeps settings and Kit Room in context without page dimming. Opening settings freezes the active run clock; Close or Escape resumes it and restores focus. The console matches the gameplay-column width and canonical Math nodes remain singular. |

Focused regression checks cover singular canonical IDs, complete inspector tab/panel wiring, controls outside the stage, responsive Math Console and Utility-belt ownership, settings icon/text pairing, level 1/2/3 hierarchy, Kit Room ownership, focus restoration, D-pad-selected exact controls, pause/resume ownership, transient goal details/dismissal, tap targets, input isolation, exclusive result/replay ownership, Dials node return, and readable labels. The existing shared-core, build, syntax, and web-contract checks also remain green. Browser review found no application console errors or warnings.

Remaining evidence limits: viewport emulation and emulated touch are not a physical-device test, and this slice does not add PWA packaging or offline navigation.

## Prioritized web plan

1. **Document contract repair — complete.** UTF-8, mobile viewport, language and main-content semantics, and contract checks are present.
2. **Responsive learning hierarchy — complete for this cockpit slice.** The active stage, controls, live Math HUD, challenge, and coach are immediately visible, while on-game settings and one responsive inspector preserve configuration, detailed Math, Review, Goals, and Learn.
3. **Input, settings, and inspector accessibility — complete for this cockpit slice.** Lab and inspector tabs use roving keyboard navigation, readable control labels are visible, settings follow a bounded three-level hierarchy with restored focus, mobile inspector dismissal restores focus, and gameplay remains available through pointer/touch hooks and keyboard mappings.
4. **Rendered cross-viewport review — complete.** Fight, Race, Kick, 1v1 Dribble, Dials, Review, replay, locked configuration, and learning interactions were exercised at mobile, tablet, and desktop widths.
5. **Commit-bound evidence and draft PR closeout — in progress.** Capture the final clean-origin screenshots and playable walkthrough from the exact committed revision, publish validation in the draft PR, and stop before merge or deployment.

The cockpit revision has five finite phases. Four are complete and one remains. Installable/offline packaging, service workers, performance budgets, physical-device touch testing, deployment, and native mobile scaffolding are separate future gates rather than hidden work in this revision.
