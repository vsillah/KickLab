# KickLab Direction C 3D production pipeline decision

**Decision owner:** KickLab integration captain

**Evaluation lane:** Ptahhotep

**Access date for external sources:** 2026-10-18

**Scope:** production-ready local athlete, animation, anatomy, stadium, and web-runtime pipeline. No production integration, purchase, trial, download, account creation, provider write, deployment, or merge is included.

## Decision

Adopt **Blender → glTF/GLB → Three.js** as KickLab's default local pipeline.

Author one versioned humanoid skeleton and skin in Blender. Keep the stylized athlete surface, anatomy overlay, and contact markers as separate nodes bound to that skeleton. Export versioned GLB artifacts. Load them through the official Three.js `GLTFLoader`, then add Meshopt/KTX2 only when measured production assets require them. Build stadium geometry in modular tiers and use instancing plus LOD for the crowd. Keep KickLab's current Canvas path as the explicit low-power and WebGL-failure fallback.

This is the smallest path that meets the privacy boundary, preserves local ownership, fits the repository's offline runtime, and gives the team a clean procurement gate for specialist tools later.

The isolated proof produced a 301,592-byte GLB with one 23-joint skin, two named clips, ten simple materials, 1,668 triangles, zero textures, one exact foot-contact marker, and one contact target. In the local browser harness it rendered with 22 draw calls, 480 instanced crowd figures, two stadium LOD levels, zero off-origin requests, and measured contact drift below 0.001 mm. These numbers validate the pipeline mechanics; they are not final character budgets or cross-device benchmarks.

## Tool decision matrix

| Tool | Role | Offline/privacy fit | Commercial/licensing boundary | Current cost signal | Decision |
|---|---|---|---|---:|---|
| Blender 5.1 | Primary modeling, rigging, skinning, animation, export | Strong. Local application; no account or network required for the tested workflow. | Blender is GPL; artwork created with Blender remains the creator's property and can be used commercially. Review licenses for any add-ons or imported assets. | $0 | **Adopt now** |
| Three.js r128 already vendored | Local web renderer | Strong. Repository already carries a local build; no CDN is needed. | MIT-licensed runtime. Asset licenses remain separate. | $0 | **Adopt now; plan a controlled version upgrade before production GLTFLoader integration** |
| glTF Validator | Export validation | Strong. CLI/browser validation can run locally and emit machine-readable reports. | Apache-2.0 tool; validation does not grant asset rights. | $0 | **Add at production integration gate** |
| glTF Transform / Meshopt | Optimization and inspection | Strong when run locally. Network access is opt-in in glTF Transform. | Apache-2.0 / MIT tooling; preserve source-asset provenance. | $0 | **Use after baseline measurement, not by default** |
| Mixamo | Optional motion seed library | Weak for strict privacy. Custom autorig requires Adobe login and upload. | Adobe says characters and animations are royalty-free for games and commercial projects. The current official FAQ reviewed here does not settle every raw-asset redistribution scenario; legal review is required before shipping source assets or editable packs. Humanoid-only. | $0 with Adobe ID | **Reject for private custom rigs; allow only after an explicit cloud-upload and license gate** |
| Reallusion Character Creator 5 | Optional licensed character authoring | Local software, but procurement and per-content licensing records are required. | Standard content can be exported to games; some CC components limit commercial output count unless an Extended License is held. Character-generator, AI/ML, synthetic-data, and stock-model uses have separate restrictions. | $299 perpetual Standard; $479 Deluxe; subscription offers vary | **Strongest paid character option, gated by a license manifest and procurement approval** |
| AccuRIG | Optional free autorig | Local standalone workflow. | Useful for body and finger rigs, but its official page reserves mesh/bone/texture reduction, material merging, advanced skin weighting, and facial rigging for Character Creator. | $0 | **Good bridge tool, not the final optimization stack** |
| ActorCore | Optional motions/actors | Account and service dependency; downloaded files can enter the local pipeline. | Per-item licenses and subscription entitlement must be retained. Downloaded motions remain licensed after subscription end, while unused monthly credits expire. | motions roughly $1.50–$12; plan from $29/month | **Optional, procurement gated** |
| Cascadeur | Contact-sensitive animation authoring | Local desktop workflow after entitlement setup. | Free tier is noncommercial and cannot export standard exchange formats. Indie permits commercial work below $100k revenue; Pro adds retargeting and environment interaction. Annual plans include perpetual builds after 12 paid months. | Indie $19/month or $96/year; Pro $49/month or $396/year | **Best specialist purchase if Blender contact cleanup becomes the bottleneck** |
| Rokoko Studio | Optional mocap cleanup/retargeting | Starter through Pro use team/cloud sync. Enterprise explicitly adds local storage/no cloud sync. | Export capabilities and retargeting vary by plan. Keep plan and source-motion provenance with every export. | Starter $0; Basic $10/month annual; Plus $20/month annual; Pro $70/month; Enterprise from $150/month | **Reject lower tiers for strict-private captures; reconsider Enterprise only if mocap is proven necessary** |
| MakeHuman | Optional body prototype | Strong for core local assets. | Core assets and exports are CC0. Community assets can be CC0 or CC-BY and must be tracked separately. No official in-app animation workflow. | $0 | **Accept for prototypes only with per-asset license checks** |
| Chaos Anima | Crowd authoring | Poor. Current license flow requires uninterrupted internet unless a special secure-network setup is arranged; the application is Windows-only. | Current subscription models generally cannot use standard export, and 4D humans have additional export limitations. | Subscription/enterprise pricing varies | **Reject for KickLab web crowd pipeline** |

Prices are public list-price signals observed on 2026-10-18, not quotes. Taxes, regional pricing, renewals, exchange rates, and content add-ons are excluded. Any purchase follows the separate spending gate.

## Recommended authoring architecture

### Character and skeleton

- Freeze a KickLab skeleton contract before producing a character library: joint names, hierarchy, rest pose, forward axis, units, scale, root-motion policy, facial scope, and hand/foot marker names.
- Keep one armature for the player surface, anatomy layer, hit/contact markers, and optional equipment sockets.
- Treat proportions as parameters in Blender source, then bake each approved body profile to its own skin. Avoid changing bone names or rest pose between profiles.
- Store the `.blend` source, exported `.glb`, generator/export settings, validator report, license manifest, and preview evidence together under one artifact version.
- Do not identify a placeholder with a real athlete. Any scan, likeness, licensed kit, or external mesh enters through a separate consent and rights review.

### Decoupling body, skeleton, anatomy, and motion

The GLB should carry four independently addressable layers:

1. `AthleteSurface`: final stylized skin bound to the shared skeleton.
2. `SharedSkeletonAnatomy`: simplified anatomy/highlight meshes bound to that same skeleton.
3. named bones and sockets: stable runtime references for equipment, telemetry, and coaching overlays.
4. contact/event nodes: exported markers with clip/frame metadata, separate from the visual mesh.

This lets KickLab change kit colors, hide the body for anatomy focus, attach a ball/contact graphic, or reuse one clip across compatible profiles without duplicating the full asset.

### Animation and retargeting

- Author and clean the canonical clips in Blender. Use Cascadeur only when repeated foot-slide, landing, balance, or contact cleanup consumes enough time to justify the license.
- Normalize all incoming clips to the KickLab skeleton in Blender before export. Runtime retargeting should be reserved for experiments and tooling, not normal gameplay delivery.
- For a purchased or Mixamo motion, retain the original file, source URL, download date, account/license evidence, original rig, retarget mapping, cleaned clip, and final export hash.
- Name clips by action and intent, not provider name. Keep an immutable source clip and a derived cleaned clip.
- Use root motion only where the game loop explicitly consumes it. Otherwise bake locomotion in place and let the game controller own position.

### Contact-sensitive animation

Treat a kick, landing, catch, block, or foot plant as an authored event, not a frame someone happens to remember.

Each clip should include:

- a named contact marker parented to the relevant bone;
- an event time or frame stored in clip/node metadata;
- the intended contact target and tolerance;
- a short pre-contact and post-contact window;
- a validation test that samples the exported clip and measures marker-to-target distance.

Blender constraints and IK are appropriate for authoring. Bake the final deformation and marker path for export. Use a corrective pose or a narrowly bounded runtime IK pass only when body-profile variation exceeds the approved tolerance. Physics can react after contact, but it should not be asked to invent the contact pose.

### Stadium and crowd

- Build the field, goals, boards, and stand tiers as modular meshes with repeated materials.
- Use `InstancedMesh` for repeated spectators, seats, flags, and simple props. Keep a tiny palette of crowd geometries and materials instead of unique figures.
- Supply at least high and low stadium LODs. Cull unseen tiers and swap distant crowd bodies for cards, low-poly blocks, or static color fields.
- Reserve skinned crowd characters for close hero shots. Normal gameplay should use static or vertex-animated instances.
- Keep a Classic/Canvas stadium mode available when WebGL initialization fails, reduced motion is requested, or device performance crosses a tested threshold.

## Web runtime and optimization path

1. Upgrade the vendored Three.js runtime and matching examples modules together in a dedicated compatibility lane. Production `GLTFLoader`, `KTX2Loader`, Meshopt decoder, and `SkeletonUtils` must come from the same release.
2. Load one manifest-selected athlete GLB and reuse geometries/materials across views. Dispose buffers explicitly when changing large scenes.
3. Record `renderer.info.render.calls`, triangle count, GPU texture estimates, asset bytes, load/decode time, animation cost, average frame time, p95 frame time, and fallback activation.
4. Establish the uncompressed baseline before optimizing. Then measure mesh joining, Meshopt compression, simplification, animation resampling, and KTX2 one change at a time.
5. Keep the fallback independent of the 3D asset so a missing decoder, context loss, or unsupported device still leaves a playable game.

Three.js r128 can render the proof asset, but it is old enough that the production lane should upgrade it deliberately instead of bolting current loaders onto an unmatched runtime.

## Initial production budgets and gates

These are starting gates for measurement, not permanent design limits.

| Surface | Initial target | Hard review gate |
|---|---:|---:|
| Hero player triangles, LOD0 | 20k–35k | 45k |
| Player LOD1 / LOD2 | ≤15k / ≤6k | 20k / 8k |
| Deform bones | ≤65 | 80 |
| Materials per player | ≤4 | 6 |
| Player textures | one 2048 atlas plus optional normal/ORM | review any 4096 map |
| Compressed player GLB | ≤2.5 MB | 4 MB |
| Animation payload per core set | ≤1.5 MB | 3 MB |
| Full first-play 3D payload | ≤8 MB | 12 MB |
| Draw calls in gameplay camera | ≤80 | 120 |
| Hero skinned meshes | 1–3 | 4 |
| Distant crowd | instanced, ≤4 draw calls per visible tier | review unique/skinned crowd |
| Contact marker drift at authored frame | ≤10 mm | 20 mm |
| Desktop target | 60 fps, p95 frame ≤16.7 ms | p95 >20 ms |
| Mobile target | 30 fps minimum, p95 frame ≤33.3 ms | p95 >40 ms |

The production gate requires at least one representative low-end phone, one current mid-range phone, one tablet, and desktop integrated graphics. The current harness timings are not substitutes for those devices.

## Accessibility and graceful degradation

- The gameplay meaning must not depend only on 3D depth, color, animation, or a visible anatomy overlay.
- Keep text/audio explanations, numeric readouts, visible focus, keyboard/touch controls, and reduced-motion behavior available outside the 3D canvas.
- Pause nonessential animation when the document is hidden. Cap pixel ratio and disable shadows/crowd animation in reduced mode.
- Fall back to the existing Canvas renderer on WebGL failure, sustained frame-budget failure, or user choice. Preserve the same action timing and learning feedback across modes.
- Provide a static high-contrast frame for any coaching moment that otherwise relies on rapid motion.

## Privacy, licensing, and procurement gates

### Fail-closed provenance record

Every production model, motion, texture, sound, kit, logo, or likeness needs:

- stable asset ID and version;
- creator/provider and original source URL/path;
- license name, purchased tier, permitted use, and proof/receipt;
- download/acquisition date and account owner;
- whether upload, biometric/likeness data, or a cloud processor was involved;
- source hash and derived artifact hashes;
- required attribution;
- renewal or subscription dependency;
- restrictions on redistribution, editable files, AI/ML, synthetic data, character generators, and marketplace resale.

If any field is unknown, the asset remains evaluation-only.

### Procurement order

1. Spend nothing for the baseline: Blender, local GLB, Three.js, Validator, glTF Transform, and Meshopt are sufficient.
2. After a representative production clip set exists, measure authoring and cleanup time.
3. If contact cleanup is the bottleneck, evaluate one month or one annual seat of Cascadeur under the applicable revenue tier.
4. If character production quality is the bottleneck, evaluate Character Creator 5 with a written list of required base and content licenses before purchase.
5. Add ActorCore only for named motion gaps with a retained per-file license manifest.
6. Reconsider mocap hardware or Rokoko Enterprise only after a capture study shows a clear advantage over keyframing and licensed clips.

No trial should begin until its export rights, cancellation/renewal terms, cloud behavior, and data-retention policy are recorded.

## Versioning and folder contract

Use immutable releases and derived artifacts:

```text
3d/
  characters/<character-id>/<version>/
    source/<character>.blend
    source/external/            # original licensed inputs, never overwritten
    exports/<character>.glb
    validation/gltf-report.json
    validation/runtime-metrics.json
    licenses/asset-manifest.json
    evidence/
  animations/<clip-id>/<version>/
    source/
    derived/
    exports/
    validation/contact-report.json
```

Increment the artifact version when topology, skeleton contract, material slots, event markers, or clip timing changes. Record the Blender version, exporter version, Three.js version, optimization command, input hashes, and output hash in a machine-readable build manifest.

The current Blender 5.1 generator is semantically reproducible but fresh exports were not byte-identical in a local two-run check because mesh-buffer ordering changed. Production provenance should therefore identify the reviewed, committed GLB by hash and rerun semantic/visual validation after regeneration instead of assuming a stable build hash.

## Staged rollout

### Stage 0 — completed in this lane

Prove a self-authored, local-only GLB can share one skin across body and anatomy, preserve a named contact event, render in the current local Three.js environment, instance a crowd, expose LOD, and fall back to 2D. The committed evidence is internal pipeline validation, not a production experience.

### Stage 1 — compatibility foundation

In a separate development lane, upgrade Three.js and add version-matched `GLTFLoader`, local Validator, asset manifest schema, and build-time metrics. Acceptance: the placeholder passes all validation with zero runtime network requests and the Canvas game is unchanged.

### Stage 2 — first representative athlete

Create one original stylized production candidate with approved proportions, kit, skeleton contract, anatomy layer, Idle, run, jump/land, and one kick. Test the full budget on named low-end and mid-range devices.

### Stage 3 — contact and profile expansion

Add profile variants only after the shared rig survives contact-tolerance tests. Decide whether Blender alone is adequate or Cascadeur procurement is justified by measured cleanup time.

### Stage 4 — production integration

Integrate behind a reversible feature flag, preserve Classic mode, instrument only privacy-safe local performance counters, perform client-facing desktop/mobile/tablet QA with a playable MP4, then follow the normal PR, deployment, and Human QA gates.

## Official source register

All sources were accessed 2026-10-18.

- Blender glTF 2.0 exporter manual: <https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html>
- Blender licensing and ownership: <https://www.blender.org/about/license/>
- Khronos glTF 2.0 specification: <https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html>
- Khronos glTF Validator: <https://github.com/KhronosGroup/glTF-Validator>
- Three.js GLTFLoader: <https://threejs.org/docs/pages/GLTFLoader.html>
- Three.js SkeletonUtils: <https://threejs.org/docs/pages/module-SkeletonUtils.html>
- Three.js SkinnedMesh: <https://threejs.org/docs/pages/SkinnedMesh.html>
- Three.js InstancedMesh: <https://threejs.org/docs/pages/InstancedMesh.html>
- Three.js LOD: <https://threejs.org/docs/pages/LOD.html>
- Three.js KTX2Loader: <https://threejs.org/docs/pages/KTX2Loader.html>
- Three.js renderer metrics: <https://threejs.org/docs/pages/WebGLRenderer.html>
- glTF Transform CLI: <https://gltf-transform.dev/cli>
- Meshoptimizer glTF optimization: <https://meshoptimizer.org/gltf/>
- Adobe Mixamo FAQ: <https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html>
- Adobe Mixamo rigging/upload workflow: <https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html>
- Adobe Mixamo additional terms: <https://wwwimages2.adobe.com/content/dam/cc/en/legal/servicetou/Mixamo-Addl-Terms-en_US-20210623.pdf>
- Reallusion Character Creator pricing: <https://www.reallusion.com/plan-and-pricing/individual/perpetual/character-creator-5-3101>
- Reallusion Character Creator overview and polygon bases: <https://www.reallusion.com/character-creator/>
- Reallusion content license: <https://www.reallusion.com/license/content.html>
- Reallusion Character Creator EULA: <https://www.reallusion.com/Content/EULA/AP/EULA_CNAP.htm>
- Reallusion AccuRIG: <https://www.reallusion.com/auto-rig/accurig/default.html>
- Reallusion ActorCore: <https://actorcore.reallusion.com/>
- ActorCore motion subscription: <https://actorcore.reallusion.com/motion-subscription>
- Cascadeur plans: <https://cascadeur.com/plans>
- Cascadeur downloads: <https://cascadeur.com/download>
- Cascadeur glTF export: <https://cascadeur.com/help/category/283>
- Cascadeur fulcrum/contact points: <https://cascadeur.com/help/tools/physics_tools/fulcrum_points>
- Cascadeur AutoPhysics: <https://cascadeur.com/help/tools/physics_tools/autophysics>
- Cascadeur environment interaction: <https://cascadeur.com/help/category/220>
- Rokoko Studio plans: <https://www.rokoko.com/products/studio>
- Rokoko system requirements: <https://support.rokoko.com/hc/en-us/articles/4418023603345-Download-and-Minimum-Requirements>
- Rokoko local cache/cloud sync behavior: <https://support.rokoko.com/hc/en-us/articles/10987248236433-Rokoko-Studio-2-3-0>
- MakeHuman license: <https://static.makehumancommunity.org/about/license.html>
- MakeHuman commercial export FAQ: <https://static.makehumancommunity.org/makehuman/faq/can_i_sell_models_created_with_makehuman.html>
- MakeHuman export formats: <https://static.makehumancommunity.org/makehuman/docs/exports_and_file_formats.html>
- Blender instancing: <https://docs.blender.org/manual/en/4.1/scene_layout/object/properties/instancing/index.html>
- Chaos Anima export restrictions: <https://docs.chaos.com/display/ANIMA/Export%2BScenes>
- Chaos Anima 4D export limits: <https://docs.chaos.com/display/ANIMA/4D%2BDigital%2BHumans>
- Chaos Anima licensing/network behavior: <https://docs.chaos.com/display/ANIMA/Chaos%2BLicense%2BQuick%2BStart%2BGuide>
- Chaos Anima installation: <https://docs.chaos.com/display/ANIMA/Installation>
