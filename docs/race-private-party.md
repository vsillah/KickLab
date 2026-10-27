# Race Private Party prototype

Private Party is enabled only on trusted origins with both `raceMultiplayer=prototype` and `racePrivateParty=prototype`. It extends the existing device-local Quick Challenge run and ghost path. Couch Duel, Vs Computer, Quick Challenge, and solo progression keep their existing entry points.

## Exchange

1. Racer A chooses Private Party, races, and shares every QR card or the full `KLP1` code privately.
2. Racer B scans every card or pastes the code, checks the frozen car, Garage parts, venue, controls, target, and opponent result, then races the imported 3D ghost.
3. Racer B shares the response cards or full code. Racer A compares that response in the same open tab.
4. Both racers repeat for the next round. The first to two wins takes the series; a tied third round can leave the series tied. Either racer can abandon; a completed series can start a fresh rematch.

Each code binds the series ID, round, frozen setup, and challenge checksum. A damaged, oversized, wrong-round, or mismatched response is rejected. Results are self-reported because this prototype has no service or authenticated identity. Series state and ghost samples remain in memory. Reloading or changing the local profile clears the series; it cannot be resumed. QR scanning requests camera access only after the player selects Scan and stops all tracks on Stop, page hiding, or leaving the series. Copy and paste remains available on browsers without `BarcodeDetector`.

The QR generator is a pinned local dependency copied into the offline build as `party-qr.js`; the default-off build does not load it until a Private Party code is displayed. No runtime request leaves the app origin.

## Local review

```sh
npm ci
npm run check
npm run mobile:check
python3 -m http.server 5884 --bind 127.0.0.1 --directory dist
node scripts/qa-race-private-party.mjs http://127.0.0.1:5884/kicklab.html qa-artifacts/race-private-party
node scripts/qa-race-private-party-boundaries.mjs http://127.0.0.1:5884/kicklab.html qa-artifacts/race-private-party-boundaries
```

For the physical Pixel exchange, connect the device with USB debugging, run `adb reverse tcp:5884 tcp:5884` and `adb forward tcp:9222 localabstract:chrome_devtools_remote`, then run `node scripts/qa-race-party-pixel.mjs qa-artifacts/race-party-pixel`. This script uses synthetic profiles and QA race fixtures; a human still needs to judge real driving feel and camera scanning from a second screen.
