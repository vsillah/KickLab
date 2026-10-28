// Builds the offline web artifact and emits deterministic runtime/asset metrics.
// Game fragments in src/game/ are joined in filename order into one script.
import { createHash } from 'node:crypto';
import { cpSync, readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAssetSet } from './lib/3d-assets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(root, 'src', p), 'utf8');

const gameDir = join(root, 'src', 'game');
const parts = readdirSync(gameDir).filter((f) => f.endsWith('.js')).sort();
const shared = ['profile-avatar-art.js', 'profile-store.js', 'profile-race-records.js', 'game-core.js', 'gameplay-pacing.js', 'live-physics-combo.js', 'race-garage.js', 'race-origin.js', 'race-competition.js', 'race-multiplayer.js', 'race-progression.js', 'race-vehicle-catalog.js', 'race-modes.js', 'race-driver-navigation.js', 'race-quick-challenge.js', 'race-private-party.js', 'race-finishes.js', 'race-effects-contracts.js', 'race-championship.js', 'race-preflight-guide.js', 'race-speed-perception.js', 'race-simulator.js', 'race-contextual-coach.js', 'race-coach-personas.js'].map((file) => src(`shared/${file}`).replace(/\n$/, '')).join('\n');
const game = shared + '\n' + parts.map((f) => readFileSync(join(gameDir, f), 'utf8').replace(/\n$/, '')).join('\n') + '\n';

const vendor = src('vendor/three.min.js');
const qrVendor = readFileSync(join(root,'node_modules','qrcode-generator','qrcode.js'),'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const threeVersion = packageJson.devDependencies.three;
const threeRevision = threeVersion.split('.')[1];
if (!vendor.includes(`Three.js r${threeRevision} + version-matched GLTFLoader`)) {
  throw new Error('Vendored Three.js runtime does not match the pinned package version');
}
const fill = { STYLES: src('styles.css'), VENDOR: '<script>' + vendor + '</script>', GAME: game };
const html = src('index.html').replace(/\{\{(STYLES|VENDOR|GAME)\}\}/g, (_, k) => fill[k]);
const { metrics: assetMetrics } = await validateAssetSet();

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'kicklab.html'), html);
writeFileSync(join(root, 'dist', 'party-qr.js'), qrVendor);
rmSync(join(root, 'dist', 'media'), { recursive: true, force: true });
cpSync(join(root, 'src', 'media'), join(root, 'dist', 'media'), { recursive: true });
rmSync(join(root, 'dist', 'assets'), { recursive: true, force: true });
cpSync(join(root, 'src', 'assets'), join(root, 'dist', 'assets'), { recursive: true });
if (process.argv.includes('--emit-game')) writeFileSync(join(root, 'dist', 'game.js'), game);
const metrics = {
  schemaVersion: '1.0.0',
  offline: true,
  runtime: {
    threeVersion,
    threeRevision,
    loader: 'GLTFLoader',
    bundleBytes: Buffer.byteLength(vendor),
    bundleSha256: createHash('sha256').update(vendor).digest('hex'),
  },
  build: {
    htmlBytes: Buffer.byteLength(html),
    gameBytes: Buffer.byteLength(game),
    gameFiles: parts.length,
  },
  assets: assetMetrics,
};
writeFileSync(join(root, 'dist', 'build-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
console.log(`built dist/kicklab.html (${(html.length / 1024).toFixed(0)} KB) with Three.js r${metrics.runtime.threeRevision}, GLTFLoader, and ${metrics.assets.length} validated local 3D assets`);
