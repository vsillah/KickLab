# W1 five-model internal rights decision

**Decision base:** deployed `origin/main` `dbcd4b97d80cc1c15254c2f4ced3dd1090a36f46`, with 204 shipped mobile files. Vambah Sillah adopted sufficient owner and reconstruction evidence for **continued commercial preparation** of the five exact shipped hashes below on 2026-11-02. Restricted decision receipt `KL-W1-ID-20261102-DBCD4B9-5-001` has SHA-256 `70c50601bbef40f36fc412923a9d2642157e4e464e11459ccd515eea1fe269a4` and remains outside Git.

| Shipped mobile path | SHA-256 | Bytes | Internal decision |
| --- | --- | ---: | --- |
| `assets/3d/kicklab-race-aegis/v1/aegis-original.glb` | `130f89f00f420b615dbc1ca081909be8c85691c232a071628175422017fbc916` | 641,396 | Clear for continued commercial preparation |
| `assets/3d/kicklab-race-kestrel/v1/kestrel-original.glb` | `1d933fb1cb3924a2b2ffa811e7c21854b7c8bfc95cd7a928ce9e3b2f89fe2adb` | 488,024 | Clear for continued commercial preparation |
| `assets/3d/kicklab-race-sable/v1/sable-original.glb` | `b5eb204f6481d54a01ec84c9a5890296b61d2400013cf386cac47e4f61fab501` | 430,280 | Clear for continued commercial preparation |
| `assets/3d/kicklab-race-vesper/v1/vesper-original.glb` | `f9ef70af796808b9ba02b7dce7ea356de1d3f28c3bb69906634b6857261b6ae6` | 440,076 | Clear for continued commercial preparation |
| `assets/3d/kicklab-race-internals/v1/race-internals.glb` | `b82b329071bf14a68f63588e00c0f002ba9b08dba0bf4d8500766a573609e505` | 561,920 | Clear for continued commercial preparation, with UV variance disclosed below |

The restricted receipt binds the owner confirmation `KL-W1-OC-20261102-DBCD4B9-6-001` (SHA-256 `68bba357594f49d5909772b5b049be5f138e6eba58be925f2abd1c80659337da`) and reconstruction index `PRIVATE-COMPLETION-INDEX-RECONSTRUCTION.md` (SHA-256 `8330552c83c87b5f365089e8464e68d8e39f2523f0333ea67926952fd799f666`). Private evidence and contact details remain in restricted storage.

**Race internals qualification:** An isolated repeat reconstruction has the same length and matching GLB JSON, material metadata, positions, normals, and indices. It differs from the shipped file by seven bytes confined to VEC2 UV accessors 17 and 49. This decision applies to the shipped hash above; the reconstruction is not represented as byte identical.

**Cobalt remains held:** `assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb`, SHA-256 `97658df10425c45043f35778872d25d4bb674e701b13548e0a0a16139cfafbcc`, 1,001,744 bytes. Its provider/reference and design evidence is not cleared by this decision.

The decision changes five rights rows only. It does not authorize signing, distribution, store submission, publication, or Phase 2 closeout. The remaining 198 runtime paths and packaged notice remain held; dependent captures and other package files need their own exact-hash decisions. Reassess a model if its shipped hash or underlying owner evidence changes, or if a conflicting source is identified. Earlier [six-model intake](w1-six-model-evidence-intake.md) and [model assessment](w1-active-model-evidence-disposition.md) record the historical pending state; the current exact-file states are in the [shipped ledger](shipped-file-rights.csv), [runtime plan](runtime-rights-evidence-plan.csv), and [action map](rights-action-map.csv).

## Validation of the unchanged package

`npm run check` passed 318 tests, source 3D validation, the web contract, and Pages contract. `npm run mobile:check` passed seven tests. The 204 shipped paths still total 36,184,003 bytes and match their ledger hashes and byte counts; the sorted package-tree digest remains `6ac87b156f150ebcde2ef70f8dff812bb018533b9e711b17a84cf91431b99a3c`. Pages HTML remains `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`; mobile HTML remains `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`. No product, asset, or package source file changed. No live runtime, device, or egress test was run in this documentation lane.
