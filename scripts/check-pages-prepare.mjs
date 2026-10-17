import assert from 'node:assert/strict';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = join(root, '.github', 'workflows', 'pages-prepare.yml');
const workflow = readFileSync(workflowPath, 'utf8');
const pagesRoot = join(root, 'dist', 'pages');
const pagesEntries = readdirSync(pagesRoot).sort();

assert.deepEqual(pagesEntries, ['index.html', 'media'], 'Pages root must contain the entry point and reviewed local media');
assert.ok(!lstatSync(join(pagesRoot, 'index.html')).isSymbolicLink(), 'Pages entry point must be a regular file');
assert.equal(
  readFileSync(join(pagesRoot, 'index.html'), 'utf8'),
  readFileSync(join(root, 'dist', 'kicklab.html'), 'utf8'),
  'Pages entry point must exactly match the checked KickLab build',
);
for(const file of ['fight.mp4','fight-poster.png','race.mp4','race-poster.png','kick.mp4','kick-poster.png','manifest.json']){
  assert.ok(!lstatSync(join(pagesRoot,'media','home-previews',file)).isSymbolicLink(),`${file} must be a regular local asset`);
  assert.equal(readFileSync(join(pagesRoot,'media','home-previews',file)).compare(readFileSync(join(root,'dist','media','home-previews',file))),0,`${file} must match the checked build`);
}

assert.match(workflow, /^permissions:\n  contents: read$/m, 'workflow permissions must remain read-only');
assert.match(workflow, /actions\/upload-pages-artifact@v5/, 'workflow must package a Pages artifact');
assert.match(workflow, /path: dist\/pages/, 'workflow must upload the prepared Pages root');
assert.match(workflow, /run: npm run check/, 'workflow must preserve the full repository check contract');
assert.match(workflow, /^  push:\n    branches: \[main\]$/m, 'automatic deployment must be limited to pushes on main');
assert.match(workflow, /^  pull_request:$/m, 'every pull request must validate and package without deploying');
assert.match(workflow, /deploy_production:\n        description: Deploy the main branch artifact to https:\/\/vsillah\.github\.io\/KickLab\/\n        required: true\n        type: boolean\n        default: false/, 'manual deployment must require an explicit production confirmation');

const deployJob = workflow.slice(workflow.indexOf('\n  deploy:\n'));
assert.ok(deployJob.startsWith('\n  deploy:\n'), 'workflow must define a dedicated deploy job');
assert.match(deployJob, /^    if: github\.event_name == 'push' \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.deploy_production && github\.ref == 'refs\/heads\/main'\)$/m, 'deploy job must exclude pull requests and non-main manual dispatches');
assert.match(deployJob, /^    needs: prepare$/m, 'deploy job must depend on the artifact preparation job');
assert.match(deployJob, /^    permissions:\n      pages: write\n      id-token: write$/m, 'deploy job must have only the required write permissions');
assert.match(deployJob, /^    environment:\n      name: github-pages\n      url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}$/m, 'deploy job must report the official Pages environment URL');
assert.match(deployJob, /actions\/deploy-pages@v5/, 'deploy job must use the official Pages deployment action');
assert.doesNotMatch(deployJob, /pull_request/, 'pull requests must never satisfy the deploy job condition');

const actionUses = [...workflow.matchAll(/^\s+(?:- )?uses: ([^\s]+)$/gm)].map((match) => match[1]);
assert.deepEqual(actionUses, [
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'actions/upload-pages-artifact@v5',
  'actions/deploy-pages@v5',
], 'workflow must not invoke provider or unreviewed actions');

for (const forbidden of [
  /^\s*deployment:/m,
  /\$\{\{\s*secrets\./i,
  /\b(?:cname|custom[-_ ]?domain|dns)\b/i,
]) {
  assert.doesNotMatch(workflow, forbidden, `Pages workflow contains forbidden external integration behavior: ${forbidden}`);
}

console.log('bounded Pages release contract checks passed');
