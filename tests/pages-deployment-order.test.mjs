import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const workflow=readFileSync(join(root,'.github/workflows/pages-prepare.yml'),'utf8');
const deploy=workflow.slice(workflow.indexOf('\n  deploy:\n'));
const guard=deploy.match(/      - name: Refuse stale main deployment\n        env:\n          GH_TOKEN: \$\{\{ github\.token \}\}\n        run: \|\n((?:          .*\n)+)      - name: Deploy to GitHub Pages/);

test('an older successful prepare cannot overwrite the newer main Pages deployment',()=>{
  assert.ok(guard,'the current-main guard must immediately precede deploy-pages');
  assert.match(deploy,/^    concurrency:\n      group: kicklab-pages-production\n      cancel-in-progress: false$/m);
  const script=guard[1].replace(/^          /gm,'');
  const fixture=mkdtempSync(join(tmpdir(),'kicklab-pages-guard-'));
  try{
    const gh=join(fixture,'gh');
    writeFileSync(gh,'#!/bin/sh\nprintf "%s\\n" "$TEST_CURRENT_MAIN"\n');
    chmodSync(gh,0o755);
    const current='b5746176afb26b691871d0402fc0bf75242f70b0';
    const run=sha=>spawnSync('bash',['-e','-c',script],{encoding:'utf8',env:{...process.env,PATH:`${fixture}:${process.env.PATH}`,GITHUB_REPOSITORY:'vsillah/KickLab',GITHUB_SHA:sha,TEST_CURRENT_MAIN:current}});
    const older=run('c771ff7b53144be8becd02ccc26c69b5ea33edf1');
    assert.equal(older.status,1,older.stderr);
    assert.match(older.stdout,/Refusing stale Pages deployment/);
    const newer=run(current);
    assert.equal(newer.status,0,newer.stderr);
  }finally{rmSync(fixture,{recursive:true,force:true});}
});
