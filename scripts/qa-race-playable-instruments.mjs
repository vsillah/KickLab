import {spawnSync} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:5177';
const cases='kestrel-power-phone,cobalt-hero-desktop,kestrel-360-phone,kestrel-power-reduced,kestrel-canvas,cobalt-drift-negative,aegis-hill-negative,aegis-power-tablet';
const runs=[
  ['qa-race-dial-presentation.mjs'],
  ['qa-race-dial-two-thumb.mjs'],
  ['qa-race-dial-matrix.mjs'],
  ['qa-race-dial-lifecycle.mjs'],
  ['qa-race-signature-finishes.mjs',`${origin}/`,resolve('qa-artifacts/race-dial-signature-finishes',head.slice(0,7)),head]
];
for(const [script,...args] of runs){
  const result=spawnSync(process.execPath,[resolve('scripts',script),...args],{stdio:'inherit',env:{...process.env,QA_CASES:cases}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
