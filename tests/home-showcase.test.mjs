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

test('uses muted looping local video with reduced-motion, constrained-device, and error fallback',()=>{
  assert.equal((html.match(/<video muted loop playsinline preload="metadata"/g)||[]).length,3);
  assert.doesNotMatch(html,/<video[^>]+controls/);
  assert.doesNotMatch(html,/<(?:video|source|img)[^>]+(?:src|poster)="https?:/i);
  for(const marker of ['prefers-reduced-motion: reduce','navigator.connection&&navigator.connection.saveData','navigator.deviceMemory','navigator.hardwareConcurrency',"previewState='fallback'",'.video.pause()'])assert.ok(showcase.includes(marker),marker);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.lab-preview video\{display:none\}/);
  assert.equal(manifest.privacy,'local renderer only; no external requests; no audio');
  assert.equal(manifest.clips.length,3);
  for(const clip of manifest.clips){
    assert.equal(clip.revision,'30fac409da7f8c3695cec7dcb4fa0690c91699b7');
    assert.equal(clip.source,'Current local KickLab renderer');
    assert.equal(clip.streams[0].codec_name,'h264');
    assert.equal(clip.streams[0].width,640);assert.equal(clip.streams[0].height,360);
    assert.ok(clip.uniqueFrames>=4);
    for(const path of [clip.mp4,clip.poster]){const local=join(root,'src',path);assert.ok(existsSync(local),path);assert.ok(statSync(local).size>4_000,path);}
  }
});

test('labels progress as overall, three-lab, and device-local without claiming a global board',()=>{
  assert.match(html,/id="progressHud" aria-label="Overall player progress across Fight, Race, and Kick\. Saved on this device\."/);
  assert.match(html,/Overall player progress/);
  assert.match(html,/Fight · Race · Kick/);
  assert.match(html,/Saved only on this device\./);
  assert.match(html,/id="boardBtn" type="button">Local boards</);
  assert.match(html,/aria-label="Device and family player boards"/);
  assert.match(html,/Device-local rankings/);
  assert.doesNotMatch(html,/global leaderboard/i);
});

test('copies the reviewed local preview package into web, Pages, and mobile artifacts',()=>{
  for(const script of ['scripts/build.mjs','scripts/prepare-pages.mjs','scripts/prepare-mobile.mjs'])assert.match(read(script),/media/);
  assert.match(read('scripts/capture-home-preview-media.mjs'),/Current local KickLab renderer/);
  assert.match(read('scripts/capture-home-preview-media.mjs'),/hostname!=='127\.0\.0\.1'/);
});
