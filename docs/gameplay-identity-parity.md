# Gameplay player identity parity

The five saved device-local avatar IDs (`rocket`, `wiz`, `tower`, `trick`, `cannon`) now select the controlled athlete's appearance in Fight and Kick. `src/shared/profile-avatar-art.js` is the visual mapping. The mapping is read at render time from the active profile. Kick's `Your player` setting still controls its existing gameplay statistics; it does not choose the avatar or rewrite profile storage. Coaches and competitors retain separate identities.

## Visual implementation

- Fight uses the selected complexion, hair silhouette, face details, body width, and identity color on the player rig. The player wears a sleeveless training top, boxing shorts, and gloves. Fight opponent and dummy visuals remain independent.
- Kick side view, procedural 3D, and Canvas fallback use the same selected identity. The goalkeeper and action poses continue to use the existing physics and animation paths. The optional Direction C athlete recolors and adds head details from the same ID when it is active; its opponent remains separate.
- Profile switches and edits take effect on the next render. No profile migration, network request, or new identity key is required.

## Portrait provenance

The Fight v2 busts in `src/assets/players/v2/fight/` were produced on 2026-10-28 by editing the five local Fight v1 portraits with the built-in Codex image tool. Each edit requested preservation of the face, complexion, hair, expression, pose, transparent background, and game-art finish; only the armored suit changed to a sleeveless fabric boxing training top. The source generation PNGs are retained in `/Users/vambahsillah/.codex/generated_images/01a18264-1fa7-7b60-92b5-c28a4d89cd2c/`. Exports use `cwebp -resize 512 512 -q 90`, except Rocket at `-q 82` to stay below the existing 80 KB mobile budget. The original v1 files remain for provenance. No outside photo, real-person likeness reference, logo, or brand was supplied.

## Validation gates

Run `npm run check` and the exact-head localhost QA script: `node scripts/qa-gameplay-identity-parity.mjs http://127.0.0.1:5198/kicklab.html qa-artifacts/gameplay-identity-parity/HEAD`. Review active and result screenshots for all five IDs at 390, 768, 1113, and 1440 widths. The phone run uses reduced motion. Review Fight and Kick gameplay video for at least two visibly different identities, plus the result state. Direction C and the Canvas fallback need their own visible check. A passing script report is evidence of routing and rendering; subjective identity cohesion requires the image review.
