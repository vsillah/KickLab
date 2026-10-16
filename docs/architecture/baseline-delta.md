# Imported v42 baseline delta

Audit date: 2026-10-16
Baseline: `776cea3` (v42 import plus KickLab rename)

## Already complete

The imported product is the source of truth. It already builds as a self-contained offline HTML game and includes:

- Fight, Race, and Kick labs, including the soccer modes;
- local progress, XP, levels, badges, cosmetics, and challenges;
- family leaderboard and weekly challenge integration points;
- sound effects, coaching/notebook feedback, replay, and pause behavior;
- Canvas rendering plus the bundled Three.js stadium path;
- intentional compatibility with `impactlab.v1` and `impactlab.nick` local-storage data.

This lane will not recreate, replace, or remove those systems.

## Genuine shared-architecture gap

Physics and product state currently live inside one ordered browser script scope. Platform clients have no canonical pure API, shared fixtures, storage/sync port, packaging decision, migration sequence, or ownership contract. Copying formulas into iOS or Android would create immediate behavioral drift.

## Minimal change in this lane

1. Preserve the existing build and all modes.
2. Publish the legacy storage keys through one compatibility constant.
3. Extract the existing no-air free-kick calculation as the first deterministic DOM-free core API.
4. Exercise that API from both the existing browser game and Node tests.
5. Record the incremental repository, storage, testing, packaging, and migration contract for platform lanes.

No Capacitor/native scaffold, deployment, provider account, production credential, store publication, data migration, or service activation belongs in this change.

## Known imported-build defect outside this slice

A visual localhost audit reported mojibake in symbols and control labels. It is a baseline presentation defect to route to the web experience lane. It does not mean the existing game or its modes are missing, and this architecture slice does not silently broaden into a copy/encoding rewrite.
