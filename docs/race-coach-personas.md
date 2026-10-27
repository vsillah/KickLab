# Race Coach personalities prototype

This local prototype requires a trusted origin and `raceExpansion=prototype&raceInstruments=prototype&raceCoaching=prototype&raceCoachPersonas=prototype`. Coach Nia remains the default. The selected ID is stored as `raceCoachId` in the active profile's existing `kicklab.profiles.v1` progress object, so legacy progress and other profiles remain separate. No new storage key or network service is used.

All Race Coaches receive the same canonical instructions, safety rules, timing windows, score interpretations, and next actions. The live cue is still capped at one concise sentence and 72 characters. The roster offers a distinct manner preview, name, and expression art. The Coach history and review retain full canonical detail. Expression transitions are presentation only: setup → ready; correct action, award, or win → celebrate; mistake or missed timing → supportive concern; recovery, loss, or pause → calm encouragement; instruction → focus. A loss never shows anger or shame.

## Voice boundary

The current audio engine synthesizes game tones and car sound locally with Web Audio (`src/game/03-audio-fx-engine.js`, `19c-race-speed-audio.js`, `19d-race-supercar-audio.js`). It has no speech voice files or proven commercially redistributable speech model. Platform speech synthesis varies by device and does not establish redistribution rights. The prototype therefore ships no spoken Coach audio, speech provider, voice clone, downloaded voice, or runtime speech request. The local voice-style contract is: Nia clear and practical, Imani warm and steady, Mateo brief and technical, Arun bright and energetic. A future speech lane must prove commercial redistribution rights, local execution, zero egress, intelligibility, lifecycle cancellation, and user mute before activation.

## Art provenance

The four transparent expression sheets were generated with the built-in image generation skill on 2026-10-27 and converted locally to WebP with `cwebp -q 82 -alpha_q 90`. Each sheet has five left-to-right portraits: ready, celebration, supportive concern, focused instruction, calm encouragement. The source PNGs remain under the Codex generated-images directory; the selected optimized assets are in `src/assets/coaches/v1/`.

Shared prompt: “Premium modern animated-feature cartoon half-body Race Coach expression sheet, five side-by-side transparent panels, identical face, hair, jacket, framing, lighting, proportions and rendering; ready, restrained celebration, supportive concern after missed timing, focused instruction, calm encouragement. Painterly dimensional shading for ages 9–15; no text, logo, watermark, caricature, shame or anger.” Character details varied by sheet:

| Coach | Character prompt details | Source PNG | Selected WebP SHA-256 |
| --- | --- | --- | --- |
| Nia | Black woman, early 30s, deep brown complexion, sculpted natural curls, teal jacket with gold piping | `exec-5f18f9af-1ca2-4c02-a5e0-86cbe02d1564.png` | `8c4defb4cae74a60be46d8e4f56af9c85ffc30c1ed36f65468594235615d55c8` |
| Imani | Black woman, late 50s, medium-dark complexion, short silver locs, plum jacket with cream trim | `exec-1d6a1a29-bb92-48cc-88d9-7ccd1ca4fccf.png` | `61917164f2deecf0720e7415b593a8f671304bcc7d6480caf0bd91e429fa1b29` |
| Mateo | Latino man, early 40s, medium olive complexion, dark wavy hair and neat mustache, amber jacket with slate trim | `exec-f7b2f3c0-75b9-47ff-9ee6-dd6bbcec6604.png` | `b463c1d9d4e6c7f4c0ce0d9afff1483d73dba6be23b0975b5d0775fe76c07c6e` |
| Arun | South Asian man, late 20s, warm brown complexion, long dark hair in a low bun, cobalt jacket with mint trim | `exec-b389bc2c-48c1-4710-8586-33a50dd8b6a1.png` | `f27780003d22aacad4a5510ceb3167850f27152e3f59c0b0bffde31512f10e3f` |

The generated characters are fictional. No real person's likeness, voice, or private data was used. Source PNGs: `/Users/vambahsillah/.codex/generated_images/01a17e74-9ede-7850-91fd-6faca6051f77/`.

## Exact generation prompts

Nia:

> Use case: stylized-concept. Asset type: premium cartoon game coach expression sheet for a racing math game, one character, five side-by-side equal square panels, transparent background. Character: Coach Nia, a confident Black woman in her early 30s, deep brown complexion, distinctive sculpted natural curls, teal racing jacket with small gold piping, no logo. Five half-body portraits in exact order: neutral ready; joyful but restrained celebration; supportive concern after a mistake; focused instruction with one hand gently raised; calm encouragement. Maintain precisely the same face, hairstyle, wardrobe, framing, lighting, proportions and rendering in all panels. High quality modern animated feature character art with painterly dimensional shading, mature and inclusive for ages 9–15, expressive eyes, clean silhouette. Transparent edges throughout. No text, no watermark, no caricature, no scolding or anger.

Imani:

> Use case: stylized-concept. Asset type: premium cartoon game coach expression sheet for a racing math game, one character, five side-by-side equal square panels, transparent background. Character: Coach Imani, a Black woman in her late 50s, medium-dark complexion, short silver locs, broad face and warm smile, plum racing jacket with cream trim. Personality calm, parental, precise and kind. Five half-body portraits in exact order: neutral ready; joyful but restrained celebration; supportive concern after a mistake; focused instruction with one hand gently raised; calm encouragement. Maintain precisely the same face, hairstyle, wardrobe, framing, lighting, proportions and rendering in all panels. High quality modern animated feature character art with painterly dimensional shading, mature and inclusive for ages 9–15, expressive eyes, clean silhouette. Transparent edges throughout. No text, no watermark, no caricature, no scolding or anger.

Mateo:

> Use case: stylized-concept. Asset type: premium cartoon game coach expression sheet for a racing math game, one character, five side-by-side equal square panels, transparent background. Character: Coach Mateo, a Latino man in his early 40s, medium olive complexion, close cropped wavy dark hair and neat mustache, sturdy build, amber racing jacket with slate trim. Personality terse technical delivery with gentle confidence. Five half-body portraits in exact order: neutral ready; joyful but restrained celebration; supportive concern after a mistake; focused instruction with one hand gently raised; calm encouragement. Maintain precisely the same face, hairstyle, wardrobe, framing, lighting, proportions and rendering in all panels. High quality modern animated feature character art with painterly dimensional shading, mature and inclusive for ages 9–15, expressive eyes, clean silhouette. Transparent edges throughout. No text, no watermark, no caricature, no scolding or anger.

Arun (the first attempt returned a generation error; this retry produced the selected sheet):

> Use case: stylized-concept. Transparent expression sheet for Coach Arun, an Indian man in his late 20s with warm brown complexion, long dark hair tied in a low bun, slim build, cobalt racing jacket with mint trim. Five equal square panels side by side, half-body portraits in order: neutral ready, joyful celebration, supportive concern after missed timing, focused instruction with hand raised, calm encouragement. Keep precisely same face, hair, wardrobe, framing, lighting, proportions and rendering across all five. Premium modern animated feature character art for ages 9–15, painterly dimensional shading, clean silhouettes and transparent edges. No text, no logo, no watermark, no caricature, no shame or anger.
