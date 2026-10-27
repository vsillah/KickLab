# Device-local driver portraits

The driver portraits in `src/shared/profile-avatar-art.js` are original, hand-authored SVG shapes and palettes created for this KickLab branch. No third-party art, real person's likeness, logo, generated runtime image, or external asset is used. Five legacy preset IDs (`rocket`, `wiz`, `tower`, `trick`, `cannon`) remain unchanged. Each now maps deterministically to a distinct visual portrait. The editor can change complexion, hair or headwear, face shape, face detail, jacket, and expression within fixed local palettes.

The profile store adds `avatarLook` to each existing `kicklab.profiles.v1` record. Old `avatar` and `color` values, progress, nickname, and `impactlab.v1`/`impactlab.nick` mirrors are preserved. Missing or invalid choices normalize to the matching legacy preset; if portrait rendering fails, the UI falls back to the preset mark. The Coach's Race profile portrait uses the previously approved local five-expression sheet at its ready frame, with initials behind the image if the asset fails. Coach choice remains governed by the existing default-off Race Coach flag.

Local head-to-head seats render the profiles saved on that device. Vs Computer uses a labeled initials fallback. Quick Challenge and Private Party show the local driver's portrait and a text/initials placeholder for the remote alias. Avatar data is never placed in a challenge code or sent across devices.

No photo upload, camera capture, face recognition, biometric inference, EXIF processing, external generation, account, provider, or sharing route was added. Photo support remains deferred pending child-safety consent, retention, and sharing decisions.
