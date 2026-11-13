# Highland adaptive DPR repair qualification

Dependency: PR #196 at `97489ecc53dbb3a8408d81a94b8d081b2a5cb9d2`, based on `c57ac3b542cbd0df83a874ff5746e65fef4b493b`. This is a separate, default-off, loopback-only repair. PR #196 remains draft; neither branch has been merged or deployed.

The former controller interpreted every frame above 32 ms as load. The exact-head qualification observed about 33 ms pacing, GPU samples below 2 ms, and DPR falling to 0.65. The repair uses CPU render time, WebGL2 GPU timer results where available, and the 50 ms frame ceiling. It requires 45 strained frames to lower scale by 0.1, waits 120 frames after each change, and requires 240 spare frames to raise scale by 0.05. Scale remains in [0.65, 1]. The game loop caps its delta at 50 ms, so the ceiling comparison includes 50 ms.

## Results

- `node --test tests/race-highland-fidelity.test.mjs`: deterministic 30 Hz cadence stays at 1.0; sustained CPU, GPU, and 50 ms pressure reduce scale; recovery is delayed and bounded; hidden frames do not count.
- `npm test`: 325/325 tests passed after updating the exact native HTML hash and size in the two rights ledgers. `npm run pages:check` passed after preparation.
- Two-width browser matrix at 390×844 and 1440×900, normal and reduced motion, flag off/on: 56 rows, no errors, external requests, or overflow. All 24 flag-off screenshots are byte-identical to PR #196's exact-head captures; all 24 flagged fixed-state captures also match before adaptation begins. Vehicle URL and canonical dynamics agree between flag states.
- Canvas preference, forced WebGL failure to Canvas, offline WebGL entry, visibility recovery, and profile storage reload passed with no external requests.
- Headful Google Chrome on Apple M5 Max ANGLE Metal, WebGL2 GPU timer available: 299 sustained gameplay frames per viewport and flag state. At 1440×900 p95 was 33.4 ms off/on; at 390×844 it was 33.5 ms off and 33.4 ms on. Flagged DPR stayed 1.0 throughout. Six scene GPU timer samples were 0.56–0.86 ms on desktop and 0.46–0.59 ms on phone. These are diagnostic single samples, not a distribution. No page errors or external requests.
- Browser pressure/recovery exercise at both widths: injected sustained 50 ms / 43 ms CPU / 47 ms GPU samples drove actual renderer DPR 1.0 → 0.65; 33.4 ms / 3 ms CPU / 1.7 ms GPU spare samples restored 0.65 → 1.0. This validates controller and renderer application, not a physical GPU overload.
- Native package has 204 files, the same paths as PR #196; only `index.html` bytes changed. New native HTML SHA-256: `624570dbac64a59e526692f7b488cd3fefbb75752c83b76d40beb548d38f5b72`, 2,693,762 bytes. Local web HTML SHA-256: `b07c8133e7e7b49932c6389d887ea00cdfbda949e970b827d9595c53ed14a6fb`. `package.json` and `package-lock.json` are unchanged. The 3D assets, car assets, roster, physics, and feature bindings are untouched.

Raw, ignored local reports are under `qa-artifacts/race-highland-fidelity/`: `adaptive-dpr-final/report.json`, `adaptive-dpr-gpu-qualification.json`, `adaptive-dpr-recovery.json`, and `boundaries/report.json`.

## Remaining gate

The desktop browser still presents about 30 fps with either flag setting; this repair does not establish the 60 fps desktop target. No physical Pixel was connected (`adb devices -l` was empty), so device GPU, thermal, memory, and privacy qualification remain open. Captain visual review and the paired device gate must precede any merge or deployment. Signing, uploads, distribution, store submission, and release remain unauthorized.
