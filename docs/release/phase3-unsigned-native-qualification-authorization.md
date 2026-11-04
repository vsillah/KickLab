# Phase 3 unsigned native-qualification authorization

**Status:** prepared for owner authorization; not executed. **Approved plan:** `KL-P3-PLAN-20261103-F101D92-001`, SHA-256 `2d0375d9287bd58975102cd9e858b8168f9ff19f4944e62ffdca7e9c92287f5b`. **Exact product baseline:** `a0be10e6cb23f9d13b8cba4078568b500165359a`. **Package:** 204 files, tree SHA-256 `9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6`. **Web SHA-256:** `4c421ca7210d958927b9914c635f3042a3e5903ef3ba751a121648fd09a477db`. **Mobile HTML SHA-256:** `9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d`.

The final execution message must substitute the exact Phase 2 closeout merge commit for `<CURRENT_MAIN>` and verify that all changes after the product baseline are documentation-only. Existing draft iOS PR #13 and Android PR #15 are candidate lanes to inspect and restack; they must not be trusted, merged or duplicated without exact-base review.

## Authorized scope after the owner sends the execution block

1. Rebind the plan, dependency lock, 204-file package and product hashes to exact `<CURRENT_MAIN>`.
2. Use isolated, visible iOS and Android tasks, branches and worktrees. Inspect existing PRs #13 and #15 first and reuse them only if their history and scope remain suitable.
3. Generate unsigned local native projects only after the baseline checks pass.
4. Inventory native and transitive dependencies, notices, permissions, entitlements, manifests, OS services, WebView bridges, backup behavior and every network endpoint.
5. Qualify all three labs in simulator/emulator and on physical phone/tablet devices, covering clean install, offline launch, lifecycle interruption, local deletion, migration, profiles, progression, 3D and Canvas fallback, reduced motion and storage recovery.
6. Run VoiceOver/TalkBack, focus/name, zoom/text, contrast, reduced-motion and non-canvas alternative checks.
7. Measure startup, frame pacing, memory, thermal behavior, asset budgets and unexplained runtime egress. Stop on unexplained egress.
8. Return exact binary/package identities, pass/fail evidence, privacy-safe playable media for any client-facing findings, and a finite remediation list. Product changes require separate scoped lanes and applicable Human QA.

## Protected exclusions

The authorization does not permit policy publication, provider or DNS changes, developer-account creation, store records, certificates, signing, credentials, uploads, TestFlight/Play distribution, external testers, submission, release or paid recurring services. Stop on source/package drift, unsuitable legacy PR scope, unexpected permission or SDK, unexplained egress, child-data transfer, destructive account action, signing request, product regression or a decision requiring broader authority.

## Ready-to-send execution block

> Authorize KickLab Phase 3 unsigned native qualification from exact main commit `<CURRENT_MAIN>`, product baseline `a0be10e6cb23f9d13b8cba4078568b500165359a`, 204-file package digest `9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6`, and approved plan `KL-P3-PLAN-20261103-F101D92-001` at SHA-256 `2d0375d9287bd58975102cd9e858b8168f9ff19f4944e62ffdca7e9c92287f5b`. Use isolated visible iOS and Android lanes, first inspecting and restacking existing draft PRs #13 and #15 where suitable. Cover dependency and permission inspection, simulator/emulator and physical-device testing, accessibility, offline and lifecycle behavior, privacy, performance, storage, fallback and zero unexplained egress. Stop on drift, unexpected SDKs or permissions, unexplained egress, product regression, signing requirements or broader authority. Keep policy publication, providers, DNS, developer-account creation, store records, signing, credentials, uploads, distribution, submission and release unauthorized.
