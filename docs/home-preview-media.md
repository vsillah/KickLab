# Welcome gameplay previews

The welcome cards use silent, local H.264 MP4 loops and PNG posters. Fight and Race remain byte-for-byte identical to the `db08f39641a8c8c1daa70bd1f3b967296cc5792a` release. Kick was recaptured from the Day scene at `eeee5daf3ce3075d352090ce00ccd346b1da8638` after the stand lighting fix; it shows readable seats and canopy during the free kick, ball flight, goal, and replay. The capture changed no gameplay or physics.

| Lab | MP4 bytes | Poster bytes | Duration |
| --- | ---: | ---: | ---: |
| Fight | 61,117 | 79,498 | 5.8 s |
| Race | 242,398 | 148,901 | 5.8 s |
| Kick | 328,332 | 157,645 | 5.8 s |

The six files total 1,017,891 bytes. Codec details and per-clip source revisions are recorded in `src/media/home-previews/manifest.json`. The Kick encode crops the local 3D stage to 640×360 for a closer view of play. Every media file is packaged with the web, Pages, and mobile builds; there are no external media URLs.

To reproduce Kick without touching the Fight or Race files, build the source commit, serve `dist` on a free loopback port, and run:

```sh
npm run build
python3 -m http.server 48271 --bind 127.0.0.1 --directory dist
node scripts/capture-home-preview-media.mjs http://127.0.0.1:48271/kicklab.html eeee5daf3ce3075d352090ce00ccd346b1da8638 --kick-only
```

The capture script requires the supplied revision to equal `HEAD`, selects the Day presentation, waits for the 3D renderer, performs the Kick action, rejects external requests and browser errors, probes the encoded video, and removes raw browser video. `npm run check` verifies web, Pages, and mobile copies. `scripts/qa-home-showcase.mjs` checks responsive playback and reduced-motion fallback in Chromium.
