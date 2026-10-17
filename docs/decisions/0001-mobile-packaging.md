# ADR 0001: Use Capacitor for the first iOS and Android shells

- Status: accepted for initial implementation
- Date: 2026-10-16
- Decision owners: Integration Captain and platform maintainers

## Context

KickLab already has a substantial offline browser game built with Canvas, DOM controls, Web Audio, and a bundled Three.js renderer. The first mobile release needs to reuse those behaviors while the deterministic rules are gradually extracted. The team also needs separate iOS and Android ownership without maintaining three independent versions of each physics formula and progression rule.

## Decision

Use Capacitor to package the shared web application for the first iOS and Android product slices. Keep gameplay rules in the platform-neutral game core and keep native projects as thin shells for lifecycle, accessibility, safe areas, haptics, signing, and store packaging.

Capacitor is a packaging decision, not permission to expose a generic web page. Each platform still needs device testing, native navigation/lifecycle behavior, accessible controls, age-appropriate permissions, offline validation, and platform-specific release review.

## Why this option

- It reuses the working game and offline build instead of funding an immediate three-client rewrite.
- Canvas, DOM, Web Audio, and bundled assets map directly into a web view.
- One shared shell can feed separately owned `ios/` and `android/` projects.
- The game-core extraction can continue independently of presentation technology.
- It keeps a future fully native client possible because domain rules and storage contracts do not depend on Capacitor.

## Alternatives considered

### Separate Swift and Kotlin clients now

This would provide maximum native control but would immediately duplicate rendering, interaction, accessibility work, and immature game rules. It has the highest drift and QA cost. Reconsider only after shared contracts and fixtures are established and a measured requirement justifies it.

### React Native or another cross-platform native renderer

This still requires rebuilding the current canvas/DOM experience and deciding how Three.js, sound, and the existing self-contained artifact map to the new renderer. It offers limited near-term advantage over Capacitor for this codebase. It remains viable if later product requirements demand a native component hierarchy or performance profile the web view cannot provide.

### Progressive Web App only

A PWA remains useful for the web surface, but it does not by itself satisfy app-store packaging, platform lifecycle integration, or native distribution expectations. It complements rather than replaces the mobile shell.

## Consequences and reconsideration gate

The team accepts a web-view runtime and must test low-end devices, memory pressure, audio unlock, resume behavior, keyboard/screen-reader navigation, safe areas, and reduced motion. No plugin may collect child data or request a sensitive permission without a separate privacy and product decision.

Reconsider the packaging choice when reproducible evidence shows that a supported target device cannot maintain the agreed frame budget, an accessibility requirement cannot be met, or an approved feature requires a native API that a narrow audited plugin cannot safely provide. Preference alone is not a migration trigger.

## Foundation implementation note

The shared foundation pins Capacitor Core 8.5.3, CLI 8.4.3, App 8.1.2, and Haptics 8.0.2, with Node 22 or newer in development and CI. CLI 8.4.3 is the latest audited Capacitor 8 CLI line without the vulnerable transitive `xcode` dependency introduced in CLI 8.5.3. The platform plugins remain narrow: App for lifecycle state and Haptics for the three declared feedback cues.

Capacitor 8 establishes the first native support floor: iOS 15 or newer and Android minimum SDK 24, compile SDK 36, and target SDK 36. The Android target follows both the SDK level supported by the pinned Capacitor major and the current Google Play submission requirement. Platform lanes must not force an unsupported target SDK onto an older Capacitor major. Future target-policy changes require a reviewed dependency/toolchain update; they do not change the application id or local-first contract.
