# Universal player wardrobes, v1

## Identity and provenance

The five device-local player IDs remain `rocket`, `wiz`, `tower`, `trick`, and `cannon`. The Race portraits in `src/assets/drivers/v2/` are the identity references. Each Fight and Kick portrait was generated on 2026-10-28 with the built-in Codex image generation tool by editing that ID's Race portrait. The request preserved its face, complexion, hair, expression, build, angle, and crop, changing clothing below the neck only. Fight uses padded training gear; Kick uses a soccer jersey. The Race portrait remains the premium driver outfit with an uncovered face on selection and profile surfaces. Coaches are separate assets and identities.

No third-party photos, real-person likeness references, logos, or brands were supplied. Source PNGs are retained outside the runtime package in `/Users/vambahsillah/.codex/generated_images/01a18264-1fa7-7b60-92b5-c28a4d89cd2c/`. These WebP exports are local, transparent, 512×512, and each below 80 KB. Export command: `cwebp -quiet -q 84 -resize 512 512 SOURCE.png -o src/assets/players/v1/LAB/ID.webp`.

| Player | Fight source PNG | Kick source PNG |
| --- | --- | --- |
| rocket | `exec-bf8b1192-89dc-4ba6-9e60-66b54dbe6052.png` | `exec-6fe474e4-579b-4049-866f-27cf70bb0fbf.png` |
| wiz | `exec-0629185f-97e5-4bdb-bf86-7be5ae281b80.png` | `exec-b775d054-f5be-4340-b598-034a1daf94b8.png` |
| tower | `exec-46987a22-6da5-46a4-9b7c-a9e2e63d5265.png` | `exec-4a0513cf-14d4-4778-87a5-7eb189f7f553.png` |
| trick | `exec-3b536c6a-a93a-43dd-b253-2f6814d3d922.png` | `exec-c0ba401d-58b5-4e76-bc76-8813460be005.png` |
| cannon | `exec-b0b713da-20a1-4c24-9fe9-4c42dfe8969a.png` | `exec-bc3c9873-8cb3-4953-9d29-8e111bbae893.png` |

The prompt for each edit requested the same premium semi-real illustrated finish, true transparency, no extra person, no text, and age-appropriate clothing. The `src/shared/profile-avatar-art.js` mapping selects the local asset by existing ID and lab. The stored schema, `avatarLook`, `impactlab.v1`, and `impactlab.nick` are unchanged. The mapping is additive: an older profile automatically sees the new outfit without a storage rewrite or migration risk.

The local profile and multiplayer IDs stay on device. Quick Challenge and Private Party codes contain no portrait art or avatar ID. This change adds no upload, camera, network, analytics, account, or public matching path.
