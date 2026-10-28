# KickLab locked states

The `kl-locked` class marks a choice or collectible whose content exists but whose unlock requirement has not been met. The shared CSS desaturates the component, dims its contents, and centers one translucent white lock. The requirement remains readable in the component and in its accessible name. The lock artwork is decorative and does not receive pointer events. Reduced motion removes lock transitions and animation.

| Surface | Current locked state | Unlock requirement and behavior |
| --- | --- | --- |
| Home | None; Fight, Race, and Kick entry cards are available | No lock treatment on the three lab cards |
| Fight | Level-gated Style choices | Level requirement stays on the choice; current Fight challenges do not fix tuning variables |
| Kick | Level-gated Style choices; fixed challenge variables in later free-kick challenges | Level and challenge requirements remain visible; fixed variables cannot change |
| Race | Level-gated Style choices; fixed Core challenge variables and future progression levels in the legacy non-Expansion view | Style and challenge requirements remain visible; future levels stay disabled when that view is active |
| Race awards | Five later journey chapters until their prerequisite collectible is earned | The next collectible's prerequisite stays readable; earned and available chapters retain their distinct visuals |
| Race vehicles | Mastery-gated Garage and preflight roster cards | The specific mastery requirement stays readable; selecting a locked car changes neither the chosen car nor profile progress |
| Race venues and routes | Marine and Forest venue cards remain visible until their sequential journeys unlock; Highland routes can be fixed by a Championship or match | Marine requires a cleared Highland format; Forest requires both Marine events. A fixed route states why it cannot change. Unlocked venues remain vivid and selectable. |
| Race Championship | Future season events | “Clear prior events” remains visible; future events stay disabled |
| Race local multiplayer | Couch setup with no second local profile; Live Room unavailable | Couch setup names the need for a second local profile. Live Room retains its protected-service explanation. Match-state controls disabled during an active match use their existing transient treatment. |
| Profiles | No unearned badge or collectible cards are rendered | The profile shows earned awards and current progress; it does not invent locked copies |

Temporary disabled controls during a run, pause, loading, preflight transition, or a completed result are availability states, not progression locks. They keep their existing state-specific explanation and do not receive a lock overlay. The same applies to preflight steps ahead of the current step: their disabled state expresses the preparation sequence, while the current step remains clear.

The CSS contract applies only to rendered UI. It does not change unlock logic, scoring, gameplay, storage, feature flags, or the no-egress boundary. The pause Resume and Save & Exit actions are ordinary, equal-size workflow controls and do not use `kl-locked`. The Race venue media remain on their commercial-rights hold in `docs/race-venue-selection.md`.

Validation: `npm run check`, `scripts/qa-locked-states.mjs`, and `scripts/qa-race-awards-states.mjs` against an exact-head local build. The browser QA checks five viewport sizes, reduced motion, accessible/disabled state, locked-choice mutation, venue locks and vivid unlocked cards, transient disabled controls, pause action geometry, overflow, and external requests. The source venue and pause behavior retain their own focused browser suites.
