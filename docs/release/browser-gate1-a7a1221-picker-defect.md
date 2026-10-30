# Browser Gate 1: earned Race unlock and Kick picker hold

**Bound package:** `a7a1221e8c1697136186bad69879ddfd7b87d807` on `origin/main`. The rebuilt Pages HTML and the live `https://vsillah.github.io/KickLab/?rev=a7a1221e8c1697136186bad69879ddfd7b87d807` response both have SHA-256 `34e7049a19e7830c0431bae51766919e3f8a645a79c609630634e45ad298cef8`. `npm run check` passed 305 tests and `npm run mobile:check` passed 6 tests on Node 24.15.0 / npm 11.12.1. The product runtime was not edited for this round.

## Earned Race progression

A fresh synthetic device-local profile completed Highland Drag through visible preflight, throttle, and Shift controls. The saved Race progression changed from `unlocked: 0` to `unlocked: 1`; Marine became enabled while Forest retained its visible unlock requirement. The same player then selected Marine through preflight, chose Cobalt with soft suspension, wide tires, and endurance brakes, and used the visible Autopilot steering option with live throttle and brake controls. Damp Entry passed in 17.59 s with zero sliding and `brakeFactor: 0.9062`, advancing to `heats: 1`. Brake Consistency passed in 17.60 s with zero sliding and `brakeFactor: 0.9068`, advancing to `unlocked: 2`. Keep racing opened the venue picker with Forest enabled. Its three displayed events were Descent Entry, Clean Left, and Heat Control in order. This proves the earned unlock boundary, not completion of Forest's events or the rest of Gate 1. Local bounded driving trace: `/tmp/kicklab-a7a1221-earned-9.log`.

## Deterministic Kick picker defect

On the exact live Pages artifact, choose **Kick → Experience → Freestyle** and inspect the picker at 360×800, 390×844, or 768×1024. The left side of the picker extends outside the viewport. Free kick and the first column are mostly cut off; the Start control is also clipped at phone widths. The document's `scrollWidth` equals the viewport width, so page horizontal scrolling does not reveal the missing content. The expected state is a fully visible, operable picker and action at each planned width.

| Width | Picker left | Free kick left | Start left |
| --- | ---: | ---: | ---: |
| 360 px | −127.9 px | −117.9 px | −117.9 px |
| 390 px | −139.0 px | −129.0 px | −129.0 px |
| 768 px | −157.6 px | −147.6 px | 330.4 px |

`KICKLAB_QA_HEAD=a7a1221e8c1697136186bad69879ddfd7b87d807 node scripts/qa-kick-public-picker-clipping.mjs https://vsillah.github.io/KickLab/` produces the exact-artifact measurements and privacy-safe screenshots under `qa-artifacts/kick-public-picker-clipping/`. The focused repro fails at all three widths, with zero external requests, page errors, popups, or downloads. The rendered defect was also confirmed in the integrated Codex browser at 360 px. The likely CSS ownership is the overlapping `@media (max-width:800px)` `.game-shell-nav .experience-panel` right anchoring and viewport-sized width in `src/styles.css`; the geometry and rendered screenshot, rather than that inference, establish the defect.

**Gate state:** Browser Gate 1 remains open. Stop this lane before product edits. A separate development lane should repair the picker placement and verify all eight Kick families, action/result paths, touch and keyboard access, and the planned 360/390/768/1113/1440 px matrix on the resulting exact package. Offline and denied-network recovery, corrupt and denied-storage recovery, full request/permission/download/popup instrumentation, and visual negative states across Fight/Race/Kick remain unqualified. Native, rights, store, provider, DNS, upload, and release gates remain held.
