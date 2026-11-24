# KickLab local 3D pipeline evaluation

This package tests one narrow question: can KickLab author a stylized athlete locally, export one shared-skeleton GLB, render it with the repository's existing offline Three.js runtime, preserve a named kick-contact moment, and degrade cleanly on lower-power devices?

It does not change production gameplay. The asset is built only from Blender primitives and does not use a real athlete, third-party model, downloaded animation, provider account, or remote runtime.

## Reproduce

Prerequisites already present on the evaluation machine:

- Blender 5.1.2 at `/opt/homebrew/bin/blender`
- Node.js 22 or newer
- FFmpeg
- the repository's existing Playwright environment for evidence capture

Generate and validate the asset:

```bash
/opt/homebrew/bin/blender --background --python evaluation/3d-pipeline/generate-placeholder.py
node --test tests/3d-pipeline-evaluation.test.mjs
```

Run the local-only harness:

```bash
node scripts/serve-3d-pipeline-evaluation.mjs . 4176
```

Open:

```text
http://127.0.0.1:4176/evaluation/3d-pipeline/harness/?rev=working-tree&clip=kick
```

Capture deterministic browser evidence:

```bash
node scripts/qa-3d-pipeline-evaluation.mjs \
  'http://127.0.0.1:4176/evaluation/3d-pipeline/harness/' \
  evaluation/3d-pipeline/evidence \
  working-tree
```

## Package map

- `generate-placeholder.py`: reproducible Blender authoring/export script.
- `assets/kicklab-placeholder-athlete.glb`: generated placeholder artifact.
- `harness/`: isolated local renderer, stadium, crowd, metrics, and fallback controls.
- `evidence/`: screenshots, MP4 walkthrough, and machine-readable QA report.
- `../../tests/3d-pipeline-evaluation.test.mjs`: GLB and harness contract tests.
- `../../docs/3d-pipeline-decision-memo.md`: recommendation, source audit, licensing gates, budgets, and staged rollout.

## Boundaries

- No network access is required after the repository is present.
- The harness performs no telemetry, storage, login, upload, or provider call.
- The compact GLB parser exists only to isolate the evaluation. Production should use the official Three.js `GLTFLoader` version-matched to the repository runtime.
- The measured frame timing is a local harness signal, not a cross-device performance claim.
- Blender 5.1 may reorder equivalent mesh-buffer data between fresh exports, so a regenerated file is not assumed to be byte-identical. Treat the committed GLB and its hash as the evaluated artifact; validate semantic invariants after regeneration.
