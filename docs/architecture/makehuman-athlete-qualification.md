# MakeHuman athlete qualification record

This record qualifies KickLab's Direction C version 2 athlete as a local derivative of official MakeHuman Community core assets. It does not authorize uploads, hosted processing, community-repository assets, deployment, merging, native release, signing, distribution, or store submission.

## Source identity and license

Qualification date: 2026-10-18.

| Input | Official source | Package identity | Local verification |
|---|---|---|---|
| MPFB add-on | `https://extensions.blender.org/add-ons/mpfb/` | MPFB 2.0.18, build 20261010; `add-on-mpfb-v2.0.18.zip`; 45,956,992 bytes | SHA-256 `c075b3e9b94b8e5556a5f03f4653602d02ea306de08126e8f55ed6dee28a2dad` |
| MakeHuman system assets | `https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html` | `makehuman_system_assets_cc0.zip`; 280,737,770 bytes | SHA-256 `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107` |

MPFB program code is GPL-3.0-or-later. The generated character data and selected MakeHuman core assets are CC0 1.0. KickLab ships the generated GLB and editable Blender source, not the MPFB add-on code. The selected `.mhclo` and `.mhmat` headers explicitly identify their September 2020 CC0 release. No MakeHuman community-repository asset is used.

Selected official-core assets:

| Asset | Key source hashes |
|---|---|
| `clothes/female_sportsuit01` | `.mhclo` `6df057d3116db93afbbbb6d692f92cce84aa16db699f47dd14e825d07c6fd42f`; `.obj` `fd529bb8dd6a994c1e9a3fb2fd8b236f52c0cc7cebb1f6fd9328953d9df6d6ff`; `.mhmat` `1153d5ad8a074f0f02c7102375d6d3ae0b82302b6f3909b5b64609a2d5cfdd6b` |
| `clothes/shoes04` | `.mhclo` `88223bf0c6168e85fd118015e4ca61612c6b35f42a79d7ce5df1864f1a6f715e`; `.obj` `eac355a842a8eb8ae2f09fac8dd18a877a24ef2521ed2d6bf38559b42ce4b49a`; `.mhmat` `dafb73d722453798f4d501f2bf2d668ba41c34fc252cd76d0716ea23baef8753` |
| `hair/short04` | `.mhclo` `d60640aa4c4ffce1aa269647ba436b6ee0bb21bb948f927b84e27a48d2107157`; `.obj` `676964a133ee35ffcea1195382bf75542da7a298931e4001bc7b0d7b707225de`; `.mhmat` `7a3ac74db8478aa0afdb8a596c6fe3997d1a8a09d12211d70e8f1e9f0b7e0e97` |
| `eyes/low-poly` | `.mhclo` `68582e28e9176cba7cfcf35208f671b6201b8d1bc95c32decff61a3160ec34d8`; `.obj` `783fe1e6331162c876520b4c2bed7a8ca06354ca15497e8ebd68bb1b59f4d3de` |
| `skins/young_african_male` | `.mhmat` `11040111c4735028b473f8ce4bb6b0dc0515b7bf26ea815ead85f2c3cbdd7645`; diffuse `e3f0dbb634e4c68561338f0087f7a122444e84ec56df102212f1222aa12e4d50` |

The character is a fictional adult with no real-person likeness. The generator sets adult macro age and locally chosen body proportions; these parameters describe a game athlete, not an identifiable person.

## Local generation and export

Generation used Blender 5.1.2 and MPFB 2.0.18 in a temporary user configuration with MPFB online access disabled. Only the selected core files above were extracted into that temporary MPFB data directory. The workflow made no asset upload, cloud-processing request, telemetry call, or runtime external request. MPFB's logger did update Blender's user-level `mpfb/config/log_levels.json`; this was a local configuration write, not network access.

The complete qualification is CLI-driven; the user does not need MakeHuman, Blender, or another visual authoring interface. From the repository root, run:

```sh
scripts/qualify-makehuman-athlete.sh
```

That one command verifies or downloads the two pinned official archives, checks their SHA-256 digests, extracts only the allowlisted core assets, creates a temporary Blender profile, installs MPFB into that profile, generates and exports the athlete with `blender --background`, runs the glTF and contract checks, builds KickLab, starts a loopback-only local server, captures the responsive/browser evidence and MP4, and checks the diff. To avoid downloading archives that are already present, set `KICKLAB_MPFB_ARCHIVE` and `KICKLAB_SYSTEM_ASSETS_ARCHIVE` to the verified local files. No step requires GUI interaction. The only known non-isolated side effect is the MPFB logger configuration write noted above.

The base deterministic source is `scripts/generate-makehuman-athlete.py`. It creates the body and official-core proxies, applies local flat kit/hair/eye/boot materials, downscales the skin texture to 256×256, binds MPFB's `game_engine` rig, authors the original seven Direction C clips and three marker nodes, saves the editable `.blend`, and exports one embedded GLB.

Stage 3 then runs `scripts/extend-multi-activity-athlete.py` against that checked-in Blender source. The extension performs no MPFB import, asset download, or network call. It adds nine KickLab-authored actions—header ready/contact, dribble cycle, pass contact, combo volley, goalkeeper ready/dive, penalty strike, and crossbar strike—on the same 53-bone skeleton. It also face-assigns the approved core sportsuit into a visually distinct navy jersey, cyan shorts, and white knee-high socks, retaining the existing orange soccer boots. It then saves and exports the same v2 artifact. Existing marker and bone nodes supply contact metadata; no new geometry, likeness, or external source is introduced.

| Output | SHA-256 |
|---|---|
| Generator | `52d53511bf06f9d60e58d0428e7dc3cfb3bc4ef28fe661a3cc9824b9f5f5bbd5` |
| Stage 3 activity and soccer-kit extension | `4ad659f5cb65b76cec549975f081f1c52b5bff3843c76ae6d6cd8a1b7509a227` |
| Editable Blender source after the Stage 3 extension | `4d6e7a931a1857a5db8fcab6f567e6926e593addf70676bad83d1d5157b0bc1f` |
| Runtime GLB | `09b4f85b1c95e16dadd2b220a264aae3dcb012793db5df7267564bdfbf233cec` |

## Skeleton and animation mapping

Version 2 preserves the Direction C clip names, runtime phase contract, and marker names while moving the animations from the version 1 23-joint skeleton to MPFB's 53-bone `game_engine` skeleton.

| Direction C version 1 | MPFB version 2 |
|---|---|
| `Root` | `Root` |
| `Hips` | `pelvis` |
| `Spine` | `spine_01` |
| `Chest` | `spine_03` |
| `Neck` | `neck_01` |
| `Head` | `head` |
| `Shoulder.L`, `Shoulder.R` | `clavicle_l`, `clavicle_r` |
| `UpperArm.L`, `UpperArm.R` | `upperarm_l`, `upperarm_r` |
| `LowerArm.L`, `LowerArm.R` | `lowerarm_l`, `lowerarm_r` |
| `Hand.L`, `Hand.R` | `hand_l`, `hand_r` |
| `UpperLeg.L`, `UpperLeg.R` | `thigh_l`, `thigh_r` |
| `LowerLeg.L`, `LowerLeg.R` | `calf_l`, `calf_r` |
| `Foot.L`, `Foot.R` | `foot_l`, `foot_r` |
| `Toe.L`, `Toe.R` | `ball_l`, `ball_r` |
| `Jaw` | no runtime animation dependency; no direct mapping required |

MPFB adds finger chains and extra spine detail. None changes KickLab's clip-selection or ball-contact API.

## Deterministic source validation

| Gate | Result |
|---|---:|
| GLB payload | 1,643,096 bytes |
| Skeleton | 53 bones |
| Animations | 16 clips |
| Surface | 26,502 triangles; 6 materials; 1 embedded 256×256 texture |
| Strike contact drift | 0.00023 mm |
| Plant drift during strike | 0.00018 mm |
| Plant ground offset | 0.0221 mm |
| Contact height above plant | 109.9782 mm |
| glTF Validator | 0 errors; 0 warnings |

Validator info-only findings are allowlisted in the asset manifest: three empty marker nodes and seven retained UV objects across primitives whose local flat materials do not sample those UVs. Runtime payload, responsive layout, pacing, fallbacks, replay, lifecycle pause, and no-external-request gates are recorded separately by the browser QA report.

The Stage 2 clean-profile browser report recorded a 2,992,652-byte first-play payload, 1,282,948-byte decoded geometry/animation/texture proxy, 16.8 ms maximum p95 frame interval across the tested desktop/tablet/mobile captures, zero horizontal overflow, zero external requests, and zero browser errors.

The Stage 3 final evidence report covers all eight activities at desktop, tablet, and mobile, asserts temporal root/joint motion through normal live controls, and verifies lifecycle pause and reduced-motion freezes. It recorded a 3,315,964-byte first-play payload, 1,367,308-byte decoded geometry/animation/texture proxy, 10 ms maximum p95 frame interval, 0 mm maximum drift across eight isolated contact calibrations, 0.02 mm maximum required plant offset, zero horizontal overflow, zero external requests, and zero browser errors. All dimensional stadium layers passed. The privacy-safe walkthrough is a genuine real-time H.264 browser recording at 1280×720 and 30 fps with no audio; screenshot captures are supplemental rather than synthesized into the video.
