# Race venue-first preflight contract

This prototype keeps the existing Race flags and local profile storage. A player chooses a venue before its route. Highland offers the five existing Race formats. Marine offers the existing Marine Terrace two-heat damp-corner challenge. Forest offers the existing Forest Lantern Descent three-heat descending-turn challenge. Marine and Forest retain the progression unlock order; locked venues stay visible with an explanation. Clearing any solo Highland Race format unlocks Marine. Clearing Marine’s two heats unlocks Forest. Championship and local comparative setup keep their Highland route contracts.

`raceVenue` is a profile-local default. Normalization sends an unknown or no-longer-unlocked venue back to Highland. A draft does not persist until Start heat. The chosen venue then supplies the existing canonical progression geometry, grip, grade, heat, scoring, and results for Marine or Forest. Save & Exit and profile reload restore the saved venue.

The new preview media in `src/media/race-preflight/venue-*.mp4` and `.jpg` was captured locally from the canonical Three.js renderer using `scripts/generate-race-preflight-media.mjs` with `KICKLAB_CAPTURE_VENUES=1`. `venue-manifest.json` and `venue-arrival-manifest.json` retain each venue, vehicle, track key, local asset path, source frame count, duration, bytes, and SHA-256 hashes for the MP4 and poster. `scripts/qa-race-preflight-media.mjs` validates the clips and hashes. These are renderer captures, not external scenery or third-party stock footage.

The broader commercial-rights and native-release gates remain held. This change does not authorize store records, distribution, provider activation, or production deployment.
