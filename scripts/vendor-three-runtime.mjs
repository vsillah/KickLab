import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(join(root, 'node_modules', 'three', 'package.json'), 'utf8'));
const expected = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies.three;
const revision = packageJson.version.split('.')[1];

if (packageJson.version !== expected) {
  throw new Error(`Three.js package drift: expected ${expected}, found ${packageJson.version}`);
}

await build({
  entryPoints: [join(root, 'src', 'vendor', 'three-runtime-entry.js')],
  outfile: join(root, 'src', 'vendor', 'three.min.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'inline',
  banner: { js: `/* Three.js r${revision} + version-matched GLTFLoader/SkeletonUtils (MIT), bundled for offline use. */` },
});

console.log(`vendored Three.js ${packageJson.version} with local GLTFLoader and SkeletonUtils`);
