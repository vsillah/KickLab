# Race Garage roster still replacement candidate

**Current deployment update (2026-11-03):** PR #168 was approved in Human QA at exact head `75d85479be369ad91e81d359cc1181afb95a7ee9`, merged as `36d7b84b7ebfcad573f91a20adfdba18fcf20298`, and served through successful GitHub Pages run `41648916138`. The three exact WebP hashes below also matched public asset responses from the later verified `be2a0e24720c1dc8a077ab0b48a32bee1b063433` deployment (run `41658473900`), whose 16-case production matrix passed. This confirms presentation and bytes, not owner rights. The three replacement hashes later received [restricted exact-hash owner decisions](phase2-wave2-roster-still-owner-decision.md) for continued commercial preparation only, with Cobalt residual provenance risk carried forward.

Base: deployed `main` `926a589b9c411f091e886cc8f02c1a44fb3e656d` (including the merged preflight card repair from PR #169). Scope is exactly the Cobalt, Kestrel, and Vesper Garage WebP stills. At this historical candidate base, Human QA and owner rights decisions were pending; the current deployment update above records Human QA and production validation. The later owner decision is recorded in the current deployment update. No distribution or Phase 2 closeout follows from this lane.

| Garage choice | Accepted read-only model SHA-256 | Superseded held WebP SHA-256 | Candidate WebP SHA-256 | Bytes |
| --- | --- | --- | --- | ---: |
| Cobalt | `97658df10425c45043f35778872d25d4bb674e701b13548e0a0a16139cfafbcc` | `e2028ee6f5da5b5a99363bcfdba14bdd7a9ae1ed4f6ac1bb01c22153b15eee5d` | `6c2146b4d10fdeac04c723ce5814b9a932ac7fbe8705033d36e14dd709682bf7` | 15,784 |
| Kestrel | `1d933fb1cb3924a2b2ffa811e7c21854b7c8bfc95cd7a928ce9e3b2f89fe2adb` | `21fb5119b6fde4a780288c6bdebc5c55ef9c9d6ad4898bc7b5959470fcd15beb` | `ade93cbc9008edc0c61421a5b2ae656f260f6feb2ca23034532296b7834941b5` | 13,862 |
| Vesper | `f9ef70af796808b9ba02b7dce7ea356de1d3f28c3bb69906634b6857261b6ae6` | `fb9ae8d29844f5c9ec491d6b0a31947fad22771ac68729315c9b7691ae08c34a` | `001488518e94c46c8e1ccf61c2d9730a561018e2ebe2449d86bdf39e32f8ed05` | 12,888 |

The previous WebPs and their held findings remain in [Wave 2 held recovery](phase2-wave2-held-recovery.md) and [Wave 2 exact-file review](phase2-wave2-exact-file-review.csv). Their hashes are historical evidence, not package references for this candidate. The accepted Cobalt model retains its separately documented provenance risk; replacing this still does not change that decision.

## Exact local chain

Each candidate is rendered from its exact accepted GLB by `scripts/race-roster/render-accepted-thumbnail.py` in Blender 5.1.2, then encoded with `cwebp` 1.6.0 using `-quiet -q 84`. The renderer uses Cycles on CPU with one thread, a fixed seed, 32 samples and denoising disabled. The render uses only local model materials and procedural camera, world and area lights; it has no image, provider or network input. `python3 scripts/race-roster/verify-accepted-thumbnails.py` checks tool versions, accepted model hashes, two independent exact rerenders per still, and every other tracked file against the deployed base. It does not write into the repository.

The earlier Eevee candidate at draft head `04d947c` gave one Kestrel WebP mismatch during the first restack verification. That output was deleted with the temporary directory, so its hash and cause cannot be reconstructed. Three subsequent full checks and 20 isolated Kestrel renders matched, but this did not explain the mismatch. The replacement chain was moved to fixed-seed, single-thread CPU rendering and the verifier now requires two independent renders per still. The Eevee candidate hashes (`d57dcac47079eb0a5174a6b2144bbfa91ec365e11a0befdc95c3ae350b00d4ce`, `edcb2fb59026fb15f16f3a6b6347a4b40bc41bece558794f9380a6232b17ed4a`, `b21ceb930d59fa8e7e70e821adaeb115e79e8f2f1796ab877bfc697fa03c51fa`) were never merged or deployed.

The camera, 640×400 transparent framing, lighting and encoder setting follow the five-choice roster presentation. All five remain visually distinct, and the Aegis and Sable WebPs remain byte-identical. A still render is a derived Garage selection asset; no model is re-exported or edited.

## H11 dependency

The existing H11 recapture map identifies model-dependent captures. This lane changes only the three Garage still bytes and the exact package ledgers and authoring evidence. The freeze check compares every other tracked base file, including the model GLBs, Blender scenes, gameplay, catalog, capture scripts and H11 media, byte for byte. Therefore no H11 **gameplay** recapture is triggered by this candidate. Garage selection visibility in an H11 frame, if any, still requires review before the owner resolves the rights hold; an old Garage image in a capture would not be evidence of the new still.

## Historical review gate and result

Before acceptance: inspect the exact-head Garage at 360×800, 390×844, 768×1024, 1113×834, and 1440×900; keyboard, touch, pointer, WebGL and Canvas; reduced motion, profiles and saved choices; offline, storage, privacy, performance and runtime egress. Record a playable privacy-safe MP4 at phone, tablet and desktop widths. The responsive and interaction scope passed Human QA at PR #168 head `75d8547`, and the current public assets match the three hashes. The owner must separately decide whether these hashes may advance for continued commercial preparation.
