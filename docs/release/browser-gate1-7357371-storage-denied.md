# Browser Gate 1 hold: denied local storage reports a false save

**Exact package:** `origin/main` at `73573717ab5e665350522c5c464d23d088eb6af4`. A fresh `npm ci`, `npm run check` (305 passed), and `npm run mobile:check` (6 passed) completed. The rebuilt `dist/pages/index.html` and the live `https://vsillah.github.io/KickLab/?rev=73573717ab5e665350522c5c464d23d088eb6af4` response both hash to SHA-256 `9c08891b053ad7360636c47947373237d73dc294278f8382b5ce3e04454f56e7`. The product runtime was not edited in this lane.

## Reproduction and observed behavior

Run `KICKLAB_QA_HEAD=73573717ab5e665350522c5c464d23d088eb6af4 node scripts/qa-storage-denied-public.mjs https://vsillah.github.io/KickLab/`. The script uses an isolated Chromium context at 390×844 with reduced motion, a synthetic `QA Denied` nickname, and a browser-only override that throws `QuotaExceededError` on every local-storage write. It verifies the public HTML hash before opening the page and blocks requests outside the Pages origin.

Four local-storage writes were denied. After pressing **Save player**, the UI displayed **Profile saved** and **QA Denied is ready to play**, with no form error. The `kicklab.profiles.v1` key was absent. A reload returned to **Lab Rookie**, and no recovery message appeared. The focused repro exits with failure. Its report and privacy-safe screenshots are in `qa-artifacts/storage-denied-public/`; the case recorded zero external requests, page errors, popups, or downloads. Those counts apply only to this case, not the full Gate 1 matrix.

**Expected:** a denied save is disclosed before a success claim, with an in-context next step such as allowing storage or freeing device space. The player must be able to retry without mistaking volatile state for saved progress.

Source inspection points to `src/shared/profile-store.js`: `write()` returns `false` on storage failure, while `createManager()` ignores `persist()` outcomes in its create, update, and progress paths. `src/game/49-profiles.js` then shows the success toast unless a manager method throws. This explains the observed path; other save surfaces need their own rerun before their behavior is claimed.

## Other checks and remaining scope

The repaired Kick Freestyle picker was visually inspected in the integrated browser at 360×800: all eight choices and Start were visible. An earned public-origin Race journey cleared Highland Drag and both Marine events, then entered Forest Descent Entry. That Forest attempt finished but failed its slide threshold, so Forest gameplay remains unqualified; the failed player attempt is not a product defect. The local driving trace is `/tmp/kicklab-7357371-forest.log`.

**Gate state:** Browser Gate 1 remains open. Stop this lane before product edits. Route the storage failure to a separate development lane. Its acceptance criteria should cover denied writes on profile creation, profile edits, and game progress; truthful save feedback; preservation of the player's editable input; safe retry; and no unrelated local-data changes. Then rerun the exact-artifact matrix for Forest, all Kick families and outcomes, offline and denied-network recovery, corrupt and denied-storage recovery, permission/download/popup/request capture, and visual negative states across Fight, Race, and Kick. Native generation, policy publication, rights clearance, signing, distribution, store records, providers, DNS, uploads, and store submission remain held.
