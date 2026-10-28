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
| Race venues and routes | Current main has Highland route cards locked only when a Championship or match fixes the route | The fixed-route explanation stays readable. PR #118 adds Marine and Forest venue cards; the shared CSS also targets its disabled `.race-preflight-venue` cards without changing PR #118's unlock logic. Recheck those cards after integration. |
| Race Championship | Future season events | “Clear prior events” remains visible; future events stay disabled |
| Race local multiplayer | Couch setup with no second local profile; Live Room unavailable | Couch setup names the need for a second local profile. Live Room retains its protected-service explanation. Match-state controls disabled during an active match use their existing transient treatment. |
| Profiles | No unearned badge or collectible cards are rendered | The profile shows earned awards and current progress; it does not invent locked copies |

Temporary disabled controls during a run, pause, loading, preflight transition, or a completed result are availability states, not progression locks. They keep their existing state-specific explanation and do not receive a lock overlay. The same applies to preflight steps ahead of the current step: their disabled state expresses the preparation sequence, while the current step remains clear.

The CSS contract applies only to rendered UI. It does not change unlock logic, scoring, gameplay, storage, feature flags, or the no-egress boundary. PR #119 changes the pause Save & Exit flow; that action is a transient workflow control and does not use `kl-locked`.

Validation: `npm run check`, `scripts/qa-locked-states.mjs`, and `scripts/qa-race-awards-states.mjs` against an exact-head local build. The browser QA checks five viewport sizes, reduced motion, accessible/disabled state, locked-choice mutation, overflow, and external requests. Venue cards from PR #118 require a post-integration rendered check because they are absent from this branch.
