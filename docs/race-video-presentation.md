# Race video presentation contract

Final gameplay footage uses the Race 3D canvas as its image source. It may include the car, track, environment, camera action, effects, and a small result caption. It must not burn controller decks, a steering wheel UI, settings or wrench controls, instructional prompts, touch targets, or other gameplay control chrome into the video. An explicitly labeled control tutorial is the exception.

`RACE_VIDEO.source()` is the shared source for in-product Race replay previews, local highlight export, and preflight/car-action recordings. The welcome Race reel uses `raceVideo=cinematic` on localhost. That capture-only query hides the gameplay overlay and page controls for viewport recording; it does not alter ordinary gameplay. The Race reel can be refreshed alone with `scripts/capture-home-preview-media.mjs ... --race-only`, preserving Fight and Kick assets.

Before shipping a new final Race clip, check the rendered 3D car and road, effects and camera, phone and desktop crops, reduced motion, playback/navigation, and absence of external requests. Keep recording local and avoid persisting capture state. A missing 3D source blocks a final gameplay recording; a 2D overlay is not a substitute.
