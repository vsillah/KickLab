# Race speed perception

This is presentation code for the explicitly enabled Race expansion. `RACE_SYSTEMS.step` owns vehicle physics, `Race` owns controls, modes, scoring and results, and `RACE_3D` reads their current state. No speed cue writes back into physics or storage.

`KickLabRaceSpeedPerception.cues` maps measured speed, frame to frame acceleration, signed lateral acceleration (`v² × curvature`), telemetry RPM and torque, slip angle, and a deterministic road sample at the car's world position to bounded outputs. Each mode has an onset, perceptual full-speed reference, and gain; gearing limits do not define visual speed. Endurance reaches a substantial cue level at approximately 48 km/h. The camera response is damped and limited to 7° of FOV, 1.4 m of setback, 0.28 m of lift, 0.22 m of acceleration movement, 0.018 rad of roll, and 0.09 m of suspension-linked heave. It uses no random shake or image blur.

The track builder places denser instanced reflectors, road seams, and shoulder ticks along the canonical point list. Their world positions stay fixed as the car passes, including around the Endurance oval. Canvas draws a simpler trackside marker cadence. Reduced motion retains that cadence and audio while suppressing FOV, setback, lift, roll and heave.

`RACE_SPEED_AUDIO` shares the existing user unlocked WebAudio context. It adds two quiet engine harmonics and three filtered local noise loops for wind, road and tire. It stops nodes on pause, results, reset, mode or vehicle change, page hide, and mute. There is no network audio source.

Run `node --test tests/race-speed-perception.test.mjs` for deterministic cue and lifecycle checks, `npm run check` for the repository gate, and `node scripts/qa-race-speed-perception.mjs <localhost HTML URL> <output directory>` for real speed, viewport, fallback, reduced motion, no egress and H.264 evidence. `node scripts/record-race-sustained-speed.mjs <localhost HTML URL> <output directory>` records one continuous 15.3-second Endurance run and verifies at least 10 consecutive seconds above 40 km/h. The browser checks require a localhost build and a Playwright Chromium installation.
