import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const html=read('src/index.html'),css=read('src/styles.css'),showcase=read('src/game/48-home-showcase.js');
const manifest=JSON.parse(read('src/media/home-previews/manifest.json'));

test('makes the three real-game labs the primary home actions',()=>{
  assert.match(html,/class="kicklab-wordmark" aria-label="KickLab"/);
  assert.match(html,/Physics you can play\./);
  assert.match(html,/Pick a game\. Test the physics\./);
  assert.equal((html.match(/class="tab lab-showcase"/g)||[]).length,3);
  for(const lab of ['fight','race','kick']){
    assert.match(html,new RegExp(`id="lab-tab-${lab}"[\\s\\S]+data-preview-state="poster"[\\s\\S]+aria-describedby="lab-${lab}-summary"`));
    assert.match(html,new RegExp(`media/home-previews/${lab}-poster\\.png`));
    assert.match(html,new RegExp(`<source src="media/home-previews/${lab}\\.mp4" type="video/mp4">`));
  }
  assert.match(css,/\.mode-home \.tabs\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media \(max-width:520px\)[^}]*[\s\S]*\.mode-home \.tabs\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test('uses the selected kinetic K mark and concept-D vector wordmark without obsolete geometry',()=>{
  assert.match(html,/viewBox="0 0 132 96" role="img" aria-labelledby="kicklabMarkTitle kicklabMarkDesc"/);
  assert.match(html,/<title id="kicklabMarkTitle">Kinetic K KickLab mark<\/title>/);
  assert.match(html,/<desc id="kicklabMarkDesc">A fast-moving K with cyan and mint speed streaks, an orange ball trajectory, and a measured angle arc\.<\/desc>/);
  for(const part of ['mark-streak-cyan','mark-streak-mint','mark-streak-blue','mark-k-shaft','mark-k-upper','mark-k-lower','mark-trajectory','mark-ball','mark-angle-arc','mark-measure-arc'])assert.match(html,new RegExp(`class="[^"]*${part}`));
  assert.doesNotMatch(html,/M8 11h48v31L32 57 8 42z/);
  assert.doesNotMatch(html,/M21 20v23M43 20v23M21 32h22/);
  assert.doesNotMatch(css,/\.kicklab-mark svg path\+path/);
  assert.match(css,/\.kicklab-mark\{width:clamp\(82px,9\.6vw,130px\);aspect-ratio:1\.375/);
  assert.match(html,/<svg class="kicklab-name" data-wordmark="KICKLAB" viewBox="-9 0 376 64" aria-hidden="true" focusable="false">/);
  assert.match(html,/class="wordmark-vector" transform="skewX\(-8\)"/);
  assert.equal((html.match(/class="wordmark-kick"/g)||[]).length,1);
  assert.equal((html.match(/class="wordmark-lab"/g)||[]).length,1);
  assert.doesNotMatch(html,/<span class="kicklab-name">KICK<span>LAB<\/span><\/span>/);
  assert.doesNotMatch(html,/<svg class="kicklab-name"[^>]*>[\s\S]*?<text\b/);
  assert.match(css,/\.wordmark-kick\{fill:#fff\}\.wordmark-lab\{fill:#13c8f4\}/);
  assert.match(css,/@media \(max-width:400px\)\{\.kicklab-wordmark\{gap:8px\}\.kicklab-mark\{width:clamp\(68px,22vw,86px\)\}\.kicklab-name\{width:clamp\(168px,52vw,200px\)\}\}/);
  for(const guard of ['markNameCollision','markTitle','markDescription','markViewBox','markParts','vectorWordmark','hostedFont'])assert.ok(read('scripts/qa-home-showcase.mjs').includes(guard),guard);
});

test('keeps the hero geometry bounded through desktop, mid-width, tablet, and mobile layouts',()=>{
  assert.match(css,/\.home-hero \.brand\{display:grid;grid-template-columns:minmax\(0,1\.05fr\) minmax\(300px,\.95fr\)/);
  assert.match(css,/\.kicklab-wordmark\{min-width:0;display:flex;align-items:center;gap:clamp\(10px,1\.4vw,18px\)/);
  assert.match(css,/\.kicklab-name\{display:block;width:clamp\(220px,30vw,420px\);height:auto;min-width:0;overflow:visible;flex:none\}/);
  assert.doesNotMatch(css,/\.kicklab-wordmark\{[^}]*font-size:/);
  assert.match(css,/\.hero-copy\{min-width:0;/);
  assert.match(css,/@media \(max-width:820px\)\{\.home-hero \.brand\{grid-template-columns:minmax\(0,1fr\)/);
  for(const width of [1440,1280,1113,1024,900,768,520,390,320])assert.match(read('scripts/qa-home-showcase.mjs'),new RegExp(`\\['w${width}', \\{ width: ${width},`));
  for(const guard of ['heroGeometry.collision','heroGeometry.contained','progressOverlap','cardText.some'])assert.ok(read('scripts/qa-home-showcase.mjs').includes(guard),guard);
});

test('uses muted looping local video with reduced-motion, constrained-device, and error fallback',()=>{
  assert.equal((html.match(/<video muted loop playsinline preload="metadata"/g)||[]).length,3);
  assert.doesNotMatch(html,/<video[^>]+controls/);
  assert.doesNotMatch(html,/<(?:video|source|img)[^>]+(?:src|poster)="https?:/i);
  for(const marker of ['prefers-reduced-motion: reduce','navigator.connection&&navigator.connection.saveData','navigator.deviceMemory','navigator.hardwareConcurrency',"previewState='fallback'",'.video.pause()'])assert.ok(showcase.includes(marker),marker);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.lab-preview video\{display:none\}/);
  assert.equal(manifest.privacy,'local renderer only; no external requests; no audio');
  assert.equal(manifest.clips.length,3);
  for(const clip of manifest.clips){
    assert.match(clip.revision,/^[a-f0-9]{40}$/);
    assert.equal(clip.source,clip.lab==='Fight'?'Current local KickLab Canvas renderer':'Current local KickLab 3D renderer');
    assert.deepEqual(clip.captureFlags,clip.lab==='Race'?['raceSystems=proxy']:clip.lab==='Kick'&&clip.revision!=='db08f39641a8c8c1daa70bd1f3b967296cc5792a'?['kickTime=day']:[]);
    assert.equal(clip.streams[0].codec_name,'h264');
    assert.equal(clip.streams[0].width,640);assert.equal(clip.streams[0].height,360);
    assert.ok(Number(clip.format.duration)>=5&&Number(clip.format.duration)<=7);
    assert.ok(clip.bytes<400_000);
    assert.ok(clip.uniqueFrames>=4);
    for(const path of [clip.mp4,clip.poster]){const local=join(root,'src',path);assert.ok(existsSync(local),path);assert.ok(statSync(local).size>4_000,path);}
  }
});

test('labels progress as overall, three-lab, and device-local without claiming a global board',()=>{
  assert.match(html,/id="progressHud" aria-labelledby="homeScorecardTitle" aria-describedby="homeScorecardScope"/);
  assert.match(html,/class="home-scorecard-header"/);
  assert.match(html,/id="homeScorecardTitle">Your all-lab scorecard</);
  assert.match(html,/id="homeScorecardScope">Fight, Race, and Kick progress · saved on this device</);
  assert.match(html,/class="home-scorecard-body"/);
  assert.match(html,/class="scorecard-records" aria-label="Player records"/);
  assert.match(html,/id="boardBtn" type="button">Local boards</);
  assert.match(html,/aria-label="Device and family player boards"/);
  assert.match(html,/Device-local rankings/);
  assert.doesNotMatch(html,/global leaderboard/i);
  assert.match(css,/\.home-progress\{display:block;overflow:hidden;padding:0/);
  assert.match(css,/\.home-scorecard-header\{display:flex;[\s\S]*?border-bottom:/);
  assert.match(css,/\.home-scorecard-body\{display:grid;grid-template-columns:/);
  assert.match(css,/\.home-progress \.hudtools button\{min-height:44px/);
  assert.match(css,/@media \(max-width:760px\)[^\n]*\.home-progress \.stat\.sess,\.home-progress \.stat\.badges\{display:grid\}/);
  for(const guard of ['scorecard.headerBeforeBody','scorecard.contained','scorecard.subordinate','scorecard.actions.some'])assert.ok(read('scripts/qa-home-showcase.mjs').includes(guard),guard);
});

test('copies the reviewed local preview package into web, Pages, and mobile artifacts',()=>{
  for(const script of ['scripts/build.mjs','scripts/prepare-pages.mjs','scripts/prepare-mobile.mjs'])assert.match(read(script),/media/);
  assert.match(read('scripts/capture-home-preview-media.mjs'),/Current local KickLab Canvas renderer/);
  assert.match(read('scripts/capture-home-preview-media.mjs'),/Current local KickLab 3D renderer/);
  assert.match(read('scripts/capture-home-preview-media.mjs'),/origin!==new URL\(baseUrl\)\.origin/);
});
