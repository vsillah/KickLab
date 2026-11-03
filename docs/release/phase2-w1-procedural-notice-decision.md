# Phase 2 Wave 1 procedural art and packaged notice decisions

Decision base: deployed `origin/main` `3ad2789a38c823f2badb7a97dbd0ad14655c2a68`, with 204 unchanged shipped mobile files. Restricted exact-hash decision receipt `KL-P2-ID-20261102-3AD2789-W1N01-001` has SHA-256 `74d52e70f064d6fa6bd183c29001193dda80e078d040b779a35152a0a6b1d7a0` and remains outside Git. The 15 procedural art rows and the packaged notice are internally clear for **continued commercial preparation only**.

| Shipped mobile path | SHA-256 | Bytes | Basis |
| --- | --- | ---: | --- |
| `assets/awards/race/v1/circuit.webp` | `082c035baa5f7baf7ec709e1efc9609c00098d962242072d332846bfe6a7d37a` | 11108 | Local Blender primitive render |
| `assets/awards/race/v1/core.webp` | `30d28c08e22a6b44a8df86849594756eace34bdd7a89acb4a3001def28080d52` | 12744 | Local Blender primitive render |
| `assets/awards/race/v1/drag.webp` | `7377f3c9cac6c6fe2fc7724f8ac7f37b725f83cb7b0bbe242717f293b4c43898` | 12270 | Local Blender primitive render |
| `assets/awards/race/v1/drift.webp` | `3c43b27d201769ed12bc7067968dd7819691cc46ecf8df6b64c74b08a74441e2` | 13758 | Local Blender primitive render |
| `assets/awards/race/v1/endurance.webp` | `ba9630904554ff037a90319002c9f07b5bccc28d8ff4054fcf84eb3617a34828` | 12886 | Local Blender primitive render |
| `assets/awards/race/v1/hill.webp` | `1142132627ca0660a13c3fade225bd60371045d70b2609ad2bc4220149d25eec` | 12976 | Local Blender primitive render |
| `assets/effects/race/v1/soft-turbulent-smoke.png` | `4c612453d0ff7b7b87aa7fef74d5f90f9daee4748a67a5011018e04d7fe25197` | 9374 | Local procedural Blender smoke bake |
| `assets/effects/race/v1/tire-smoke-00.webp` | `a866d1b747a454d3172b2f4dccb3ebccb1c30cf098b469df5f58ea758a6d5a48` | 2062 | Deterministic local pixel generation |
| `assets/effects/race/v1/tire-smoke-01.webp` | `3c6a5b42028099170855c7acf3cebd3391d778a66adcc5d45e12a864f7dd9d3b` | 1946 | Deterministic local pixel generation |
| `assets/effects/race/v1/tire-smoke-02.webp` | `53f8fb8427d9722e5619415c5507d17b13f5cd993887d6f9a7b3c6df31c0faf2` | 2148 | Deterministic local pixel generation |
| `assets/effects/race/v1/tire-smoke-03.webp` | `c658e427e4fe7df18e90d44f0c933abc72ea6377d75afc927a3863cb289ba19e` | 2122 | Deterministic local pixel generation |
| `assets/effects/race/v1/tire-smoke-04.webp` | `27452dbc379696476fc8e57c9d78ba06e620068ae6f285123bc2c42ead59639d` | 2042 | Deterministic local pixel generation |
| `assets/effects/race/v1/tire-smoke-05.webp` | `79bee506b847820328801039ee6922c9934792953985185ff17c08994c50c15b` | 2296 | Deterministic local pixel generation |
| `assets/effects/race/v1/tire-smoke-06.webp` | `9173509e6257d8b707410a997cbff3360c87f53b97af8e63ac806b715a217222` | 2200 | Deterministic local pixel generation |
| `assets/effects/race/v1/tire-smoke-07.webp` | `060d287a8224b2976f5f29082000772a301c6478a66ac7c7dabc56d5ad871cb1` | 2012 | Deterministic local pixel generation |
| `THIRD-PARTY-NOTICES.txt` | `78741a4d19c7fbe12bdd943497aa03bbf0c8fd99b44fb6c0f8e6e01cb6e964bc` | 2461 | Current mobile-package MIT notice |

## Exact-file evidence

The six awards follow `scripts/render-race-awards.py` and `src/assets/awards/race/v1/asset-record.json`; eight tire-smoke frames follow `scripts/race-cinematic-art/tire-smoke.py`; the remaining smoke PNG follows `scripts/race-cinematic-art/bake.py` and `src/assets/effects/race/v1/asset-record.json`. All 15 current package path/hash/byte triples match the restricted immutable 27-file owner receipt `KL-W1-OA-20261102-FBB7DDB-27-001` (SHA-256 `6409bf1680c8dfeac32d6e255bddb58104ef09630f22f912463acd4196b05d56`) and the active owner addendum `KL-W1-OA-20261102-FBB7DDB-27-002` (SHA-256 `c887854e843ea105ed5ddee36098eb8631ef243473891fdff352ec088ac5c759`). The repository creator/input index `KL-W1-CI-20261102-FBB7DDB-27-001` has SHA-256 `b5286e2eba39d2006571303d338900ea4bd20f4ed9dbd854fe9204c3b96d2d32`. The earlier [27-row assessment](phase2-wave1-internal-commercial-decision-packet.md) proposed these 15 exact hashes for internal clearance. This decision adopts that limited proposal for the current 204-file package; no new handwritten owner signature is claimed. Reopen an affected hash if a conflicting source, mark, likeness, or contributor claim appears.

## Packaged notice verification

`package.json`, `package-lock.json`, and installed package metadata identify Three.js `0.186.1` and qrcode-generator `1.5.2`. `scripts/build.mjs` embeds Three.js in `index.html` and copies installed `qrcode.js` into `party-qr.js`; `scripts/prepare-mobile.mjs` copies those files and the configured notice to the mobile package root. The packaged `THIRD-PARTY-NOTICES.txt` is byte identical to `config/mobile-distribution-notices.txt` at the exact hash and length above. Its Three.js terms match the installed license (SHA-256 `8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc`) and the [upstream r186 license](https://github.com/mrdoob/three.js/blob/r186/LICENSE). Its qrcode-generator terms match the [upstream `js1.5.2` tag license](https://github.com/kazuhikoarase/qrcode-generator/blob/js1.5.2/LICENSE) after whitespace normalization (upstream SHA-256 `3a850fa5f08101db6f40676c2786e10bd2cd5fff7b12ffdf1e0c434d4e49d90c`). The copied QR file retains its author, MIT, and trademark header. This verifies notice text, placement, and scope for the **current mobile package**. Native dependency inventory and native notice placement need separate review after a native project exists.

These exact-file decisions do not clear the remaining 182 held runtime rows, approve the whole package, or authorize signing, distribution, store submission, policy publication, or Phase 2 closeout. Source or dependency changes require renewed notice and rights review.

## Validation

`npm run check` passed 318 tests, source 3D validation, web contract, and Pages contract. `npm run mobile:check` passed seven tests. The 204 shipped files still total 36,184,003 bytes and match ledger hashes and byte counts; the sorted package-tree digest remains `6ac87b156f150ebcde2ef70f8dff812bb018533b9e711b17a84cf91431b99a3c`. Pages HTML remains `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`; mobile HTML remains `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`. No product, asset, or package source file changed. This documentation lane did not run a live user journey, physical-device, native notice, or egress test.
