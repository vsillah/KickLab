import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/game/63a-race-instruments.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('released Race instruments do not uncover legacy controls between live play and results',()=>{
  assert.match(source,/race-instruments-idle/);
  assert.match(source,/M===Race&&!present&&setupPreview\.hidden&&!deck\.classList\.contains\('race-result-review'\)/);
  assert.match(styles,/\.control-deck\.race-instruments-idle \.pad\{display:none!important\}/);
});
