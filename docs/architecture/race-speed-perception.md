# Race speed perception

This is presentation code for the explicitly enabled Race expansion. `RACE_SYSTEMS.step` owns vehicle physics, `Race` owns controls, modes, scoring and results, and `RACE_3D` reads their current state. No speed cue writes back into physics or storage.

`KickLabRaceSpeedPerception.cues` maps measured speed, frame to frame acceleration, signed lateral acceleration (`v² × curvature`), telemetry RPM and torque, slip angle, and a deterministic road sample at the car's world position to bounded outputs. Each mode has a presentation gain. The camera response is damped and limited to 4.5° of FOV, 0.16 m of fore and aft movement, 0.018 rad of roll, and 0.035 m of heave. It uses no random shake or image blur.

The track builder places instanced reflectors and road seams along the canonical point list. Their world positions stay fixed as the car passes, including around the Endurance oval. Canvas draws a simpler trackside marker cadence. Reduced motion retains that cadence and audio while suppressing FOV, roll and heave.

`RACE_SPEED_AUDIO` shares the existing user unlocked WebAudio context. It adds one harmonic oscillator and three filtered local noise loops for wind, road and tire. It stops nodes on pause, results, reset, mode or vehicle change, page hide, and mute. There is no network audio source.

Run `node --test tests/race-speed-perception.test.mjs` for deterministic cue and lifecycle checks, `npm run check` for the repository gate, and `node scripts/qa-race-speed-perception.mjs <localhost HTML URL> <output directory>` for real speed, viewport, fallback, reduced motion, no egress and H.264 evidence. The browser sweep requires a localhost build and a Playwright Chromium installation.
