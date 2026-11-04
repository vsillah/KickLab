# Android offline Home repair candidate

**Scope:** presentation repair based on deployed main `f53f9684b7f8d7dfd2dbcb30b8a89737c7c77d30`, with the separate draft Android shell PR #15 merged into this development branch. PR #15 itself remains unchanged and unmerged. This candidate is for internal unsigned review only.

## Cause and correction

On the API 37 phone emulator, Android screen capture showed white paint gaps and stale Fight/Race/Kick and standings layers, while WebView's DOM bounds and DevTools screenshot were correct. The clean offline Home did not contain duplicate DOM sections. For the local Home, the WebView now uses a software paint layer; it returns to hardware on lab entry and back to software on Home return. Capacitor's SystemBars plugin had reapplied light status icons after the activity theme; its `DARK` style now selects readable light indicators against the dark bar. The opaque native window background removes an unnecessary transparent backing.

## Package binding

- App ID `com.amadutown.kicklab`, version code `1`, version `1.0`, min/target SDK `24/36`.
- Mobile package: 204 files; sorted `path\0sha256\0bytes\n` tree SHA-256 `11f2b264c98d571f9da2a9bee16cb726612a07ae8834567bb056f306db5d328c`.
- Packaged `index.html` SHA-256 `b309382f4b37b7baadccc6c51e4c5b706a1a7b2410dc2e685943ac9183c18203`; Android asset copy matched it. Browser `dist/kicklab.html` SHA-256 `c1df0a2f16b19bd62708b64d1de3daaa99abf446541f5017a5cad08de81b350c`.
- Debug APK SHA-256 `729fc3cefbb812aa31a74ddf9383754610662389f48d1313537355b2ef8fd284`. Unsigned release APK SHA-256 `f3e6e7c042b32b8d5add4c4469ae9abbafe8ffa15b499e8a8a4cc2cf234fb267`.
- The unsigned APK manifest has no `INTERNET` permission; `VIBRATE` and the app-signature receiver permission remain. No signing, store, provider, upload, distribution, or release authority is implied.

## Validation

- `npm ci`, `npm run check` (322 tests), `npm run mobile:check` (10 tests), `npx cap sync android`, and Gradle `testDebugUnitTest lintDebug assembleDebug assembleDebugAndroidTest connectedDebugAndroidTest assembleRelease` passed. Phone and tablet each passed six instrumented tests, including Home section uniqueness, geometry, ranking interaction, activity recreation, and software-to-hardware-to-software layer transition.
- API 37 phone: clean offline launch reproduced the defect before the change; repaired Home screen capture showed readable white status icons and no stale paint. Race preflight opened after profile setup. API 35 tablet: clean offline Home was visually checked in landscape and portrait, including the compact returning-player header after a cold offline launch.
- Browser and packaged mobile standings QA passed at 360, 390, 768, 844 landscape, 1113, and 1440 CSS widths. It covered pointer, touch, keyboard, reduced motion, ranking, storage denial/corruption, profile switching, no outbound requests, and desktop Home frame p95 8.9 ms.
- `adb mdns services` found no paired physical device; `adb devices -l` listed only the emulator. No physical wireless run was attempted.

## Remaining gate

This is a Home presentation candidate, not full Phase 3 Android qualification. The physical-device run, complete TalkBack spoken/focus review, sustained native memory/frame/thermal comparison, full three-lab journeys, and native dependency notice reconciliation remain open. The exact-head MP4 and final PR/commit binding are recorded in the development-lane handoff.
