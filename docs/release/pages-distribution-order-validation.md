# Pages distribution order repair

Draft branch `codex/kicklab-pages-distribution-cleanup` starts from exact merged main `b5746176afb26b691871d0402fc0bf75242f70b0`. The public file persistence is a deployment ordering defect. The Pages deployment for `b5746176` (ID `7498428870`, Actions run `41488456828`) succeeded at 2026-11-02 17:10:17 UTC. An older source commit `c771ff7b53144be8becd02ccc26c69b5ea33edf1` (PR #158, before the six-file removal) was deployed by ID `7498430110`, run `41488438955`, at 17:10:28 UTC. The older deployment finished 11 seconds later and became the public site. The public six-file responses have the old source hashes and HTTP 200, while the exact `b5746176` Pages artifact omits them. The matching public `index.html` hash cannot distinguish these two commits because their rendered HTML is identical.

The Pages deploy job now shares one production concurrency group without canceling an in-progress deploy. Immediately before `actions/deploy-pages`, it reads the live `main` ref using a token limited to `contents: read`, `pages: write`, and `id-token: write`; a run whose commit is no longer current fails before publishing. After deployment, a bounded public probe requires HTTP 404 for every path in the six-file exact exclusion list. The probe fails the job if any path remains public after 12 attempts separated by ten-second waits. Pull-request builds still validate and upload artifacts without deploying.

The Race advanced-tier Canvas timeout was an outdated QA navigation assumption. Its script sampled the wrench while the overlay was transitioning, fell through to the hidden legacy settings button, and timed out. It now waits for the current Race wrench and Garage action; no product UI or assertion was changed.

## Local validation

- `npm run check`: 318 tests passed, including a deterministic replay of the overlapping PR #158/#159 deployment order, web and Pages contracts.
- `npm run mobile:check`: seven mobile tests passed.
- The rebuilt mobile package has 204 files and exact sorted path/hash/bytes digest `6ac87b156f150ebcde2ef70f8dff812bb018533b9e711b17a84cf91431b99a3c`; web/Pages HTML remains `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`. All six paths return 404 from the local Pages package.
- `qa-race-advanced-tier.mjs`: Vesper and Sable WebGL at 390, 768, 1113, and 1440 pixels, locked states, and reduced-motion Canvas Sable passed; no errors or external requests.
- `qa-race-offline-entry.mjs`: selected Cobalt asset was prepared before offline entry; Race WebGL, local profile, permissions, zero post-offline document requests, zero egress, and frame pacing passed.
- `qa-mobile-csp.mjs`: Fight, Race, and Kick passed on mobile and web at 390, 768, 1280, and 1440 pixels; forced Race Canvas fallback and blocked external connection probes passed with zero escaped external requests and zero horizontal overflow.
- A focused Garage sweep rendered all five active vehicles at 390 and 1440 pixels with valid vehicle audits, local asset URLs, zero page errors, and zero external requests. The offline avatar recovery harness passed reload-to-offline, corrupt-storage, and denied-storage cases with zero external origins.

This draft has not been deployed. The public six-file HTTP 200 condition remains until a later, current-main Pages deployment succeeds and its six-path public probe passes. No client-facing behavior or package bytes changed, so Human QA is not required for this draft. Integration Captain review, merge/deployment sequencing, and exact public verification remain the next gate. Active model rights holds remain open.
