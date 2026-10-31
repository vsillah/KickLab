# Browser Gate 1 continuation at `f2e715d`

**Status: held at a deterministic offline Race entry defect.** This packet binds to deployed main commit `f2e715d79287ec040bf89da7f078d5b2c0f0d36b` and Pages HTML SHA-256 `02fe414efbc1108b959461398642424d8d744b360fb1d1552707d89aba1dba99`. The localhost served HTML matched `dist/pages/index.html` byte for byte. The reported public Pages artifact has the same hash. All profiles used here were synthetic and device-local. No product runtime file changed.

## Completed exact-artifact checks

- `npm ci --ignore-scripts` completed. `npm run check` passed 310 tests, the web contract, and bounded Pages release contracts. `npm run mobile:check` passed 6 tests.
- `scripts/qa-race-public-earned-forest.mjs` completed one uninterrupted visible-control Highland → Marine → Forest journey at 1113×834 with reduced motion. It used the Home Race entry, preflight, car and Garage choices, keyboard gas/Brake, results, and Home re-entry. No QA unlock, state mutation, or forced finish was used.
- Highland Drag passed and unlocked Marine. Marine Damp Entry passed in 15.72 s with 0 s slide, 41.64 km/h entry, and 90.88% brake power. Marine Brake Consistency passed in 17.24 s with 0 s slide, 37.33 km/h entry, and 90.74% brake power, unlocking Forest.
- Forest used the available Aegis, soft suspension, wide tires, endurance brakes, autopilot steering, and bounded exit throttle. Descent Entry passed in 20.32 s, Clean Left in 20.55 s, and Heat Control in 21.22 s. All three had 0 s slide, entry above their minimum, and brake power above 92%; canonical progression ended at `unlocked: 3`. The run observed zero external requests, popups, or downloads.

## Blocking defect: offline Home → Race

**Reproduction:** Run `scripts/qa-public-offline-race-entry.mjs` against the exact localhost Pages artifact. At 390×844, reduced motion, forced Canvas, load `/pages/index.html?rev=f2e715d79287ec040bf89da7f078d5b2c0f0d36b`, create the synthetic local player, then set the browser context offline. Fight opens on the loaded page. Use Lab controls → All labs, then select Race.

**Observed:** Race selection requests the same Pages HTML with ten Race flags and `location.replace`. The request fails with `net::ERR_INTERNET_DISCONNECTED`, and the tab becomes `chrome-error://chromewebdata/`. The Race UI, saved local profile, and in-context recovery action are inaccessible from that tab. The request log contains only same-origin URLs; no popup or download occurred. The blank error-page screenshot and sanitized request report are in ignored local `qa-artifacts/public-offline-race-entry/`.

**Source path:** `src/game/53-weekly-challenge.js:25` calls `KickLabRaceOrigin.enterFromHome()` on Race selection. `src/shared/race-origin.js:20-26` builds a flagged URL and calls `location.replace`. The product must keep Race reachable after an initially loaded package goes offline. Repair and rerun the exact offline path before resuming Gate 1.

The reproducer intentionally exits 1 when it confirms this blocked state. Its run on this commit recorded the failed flagged HTML request, `chrome-error://chromewebdata/`, 14 same-origin requests, zero popups, and zero downloads. The earlier exploratory offline/storage harness was discarded after the defect was isolated.

## Open qualification after repair

Gate 1 remains open for Kick activity outcomes, the full offline and denied-network three-lab journeys, corrupt and denied storage beyond the completed profile-save case, permission/download/popup instrumentation across every path, and visual negative states in Fight, Race, and Kick. The prior visible-browser 50 ms performance threshold also remains open. Native, policy, rights, signing, distribution, store, providers, DNS, and uploads remain held.
