# Welcome gameplay previews

The three welcome cards use muted local MP4 loops and PNG posters captured from KickLab at `db08f39641a8c8c1daa70bd1f3b967296cc5792a`. Fight uses the released Canvas renderer. Kick uses the released 3D stadium. Race uses its reviewed 3D vehicle scene with `raceSystems=proxy` only in the capture URL; the normal unflagged Race entry is unchanged.

| Lab | MP4 bytes | Poster bytes | Duration |
| --- | ---: | ---: | ---: |
| Fight | 61,117 | 79,498 | 5.8 s |
| Race | 242,398 | 148,901 | 5.8 s |
| Kick | 300,651 | 133,469 | 5.8 s |

The six files total 966,034 bytes. The exact values and codec details are also recorded in `src/media/home-previews/manifest.json`. All three videos are H.264, 640×360, silent, and local to the web, Pages, and mobile packages. The Kick encode crops the local 3D stage for a closer view of the shot and goal; it does not change game rendering.

To reproduce from the recorded source revision, build that checkout, serve `dist` on a free loopback port, then run:

```sh
npm run build
python3 -m http.server 48231 --bind 127.0.0.1 --directory dist
node scripts/capture-home-preview-media.mjs http://127.0.0.1:48231/kicklab.html db08f39641a8c8c1daa70bd1f3b967296cc5792a
```

The capture script requires the supplied revision to equal `HEAD`, waits for each lab's renderer and game state, performs visible gameplay actions, rejects external requests and browser errors, validates the encodes, and removes raw browser video. `npm run check` verifies the web, Pages, and mobile copies. `scripts/qa-home-showcase.mjs` checks responsive playback and reduced-motion fallback in Chromium.
