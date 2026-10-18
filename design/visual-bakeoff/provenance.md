# Visual provenance

This register covers every visual element in the Phase 1 concept artifact.

## Generated scene plates

The three scene plates were created with the built-in OpenAI image-generation tool on 2026-10-18. The prompts contained no repository content, private material, real-person reference, or child likeness. The outputs remain local to this worktree and the Codex generated-image cache.

| File | Direction | Origin | Restrictions |
| --- | --- | --- | --- |
| `assets/direction-a-matchday-truth.png` | A · Amanitore | New generated bitmap; prompt requested a fictional adult athlete in a stylized-realistic night stadium | No real-person likeness, child, brand, logo, text, or watermark |
| `assets/direction-b-sculpted-velocity.png` | B · Imhotep | New generated bitmap; prompt requested a fictional adult athlete in a sculpted geometric stadium | No real-person likeness, child, brand, logo, text, or watermark |
| `assets/direction-c-kinetic-anatomy.png` | C · Nzinga | New generated bitmap; prompt requested a fictional adult athlete with restrained anatomical hints in a rendered stadium | No real-person likeness, child, brand, logo, gore, text, or watermark |

The generated source cache files are preserved outside the repository. The project copies are unmodified outputs.

## Local authored elements

The following elements are original HTML/CSS/SVG/JavaScript written for this review artifact:

- review layout, typography, direction tabs, state tabs, status card, and selection gate;
- HUD, trajectory, pause indicator, thumbstick, action button, compact physics control, and phone context sheet;
- body-rig line work, joint markers, force and velocity vectors, labels, and responsive positioning;
- device frames for 390×844, 768×1024, and 1440×1000;
- all copy, tradeoffs, performance notes, asset requirements, accessibility notes, and Phase 2 tests.

No third-party asset was downloaded, licensed, purchased, or uploaded. The artifact does not call a remote runtime or external font.

## Relationship to KickLab source

The concept uses the current repository only as local product context: the side-view free-kick, existing Three.js stadium, articulated body-rig approach, action-triggered Physics Vision, responsive control contract, reduced-motion behavior, and Classic fallback. It does not copy or change production renderer code. Any Phase 2 work must derive X-ray regions from the same runtime rig rather than drawing a separate particle body.
