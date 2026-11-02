# Wave 1 package-only asset removal

Draft branch `codex/kicklab-w1-package-removal`, based on merged main `f26fdb1c7bd31a892100c07120c11019d69e46ec`. This build excludes only the six exact paths in `config/package-only-asset-exclusions.json` from web, Pages, and mobile output. Their source bytes, manifests, Blender files, and prior rights evidence remain in the repository. The build checks each retained source hash before exclusion and still validates all ten source GLB manifests. The build metrics describe the seven GLBs that actually ship.

The mobile package has **204 files and 36,184,003 bytes**, down from 210 files and 37,660,565 bytes. Its sorted `path\0sha256\0bytes\n` tree digest is `6ac87b156f150ebcde2ef70f8dff812bb018533b9e711b17a84cf91431b99a3c`. A path/hash comparison against the base rights ledger found exactly the six named removals, no additions, and unchanged hashes for all 204 shared paths. The [shipped-file ledger](shipped-file-rights.csv) and [action map](rights-action-map.csv) each have 204 matching rows. The [runtime plan](runtime-rights-evidence-plan.csv) has 203 rows plus the installed notice. All remaining rights rows remain held.

The web and Pages HTML SHA-256 remains `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`. Mobile HTML remains `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`. The installed `THIRD-PARTY-NOTICES.txt` remains `78741a4d19c7fbe12bdd943497aa03bbf0c8fd99b44fb6c0f8e6e01cb6e964bc`. Thus the game code, profile schema, default/prototype behavior, and notice bytes did not change in this draft.

## Validation

- `npm ci` completed from the lockfile. No dependency file changed.
- `npm run check` passed: 317 tests, source GLB validation, web contract, and Pages contract.
- `npm run mobile:check` passed: seven mobile checks, including exact package file set, source evidence, rights ledger, and notice comparisons.
- A fresh local browser run of the exact built HTML checked Fight, Race, and Kick on default WebGL, prototype WebGL, prototype Canvas, and packaged mobile WebGL routes at 390 × 844. All 12 cases had zero page errors, external requests, and requests for the removed paths. Direct links to each removed file returned 404 in web, Pages, and mobile output (18 checks).
- The existing offline avatar readiness harness passed its 360 × 800 Race Canvas case, online-to-offline profile recovery, corrupt storage, and denied storage with zero external origins. Its report and MP4 are under `qa-artifacts/w1-package-removal/offline-avatar/` and are local evidence, not shipped content.
- `git diff --check` passed.

The older `qa-race-systems-proxy.mjs` browser harness timed out while clicking a Race settings control that is hidden in the current UI. The scoped 12-case browser sweep above exercised the current lab navigation and asset requests. The timed-out harness supplied no product-regression finding. No native project, device, store, or production deployment was tested. The six retained active GLBs and their dependent package files are byte-for-byte unchanged. This package-only change has no new client-facing behavior, so Human QA is not a gate for this draft; Integration Captain review remains required before merge or deployment.
