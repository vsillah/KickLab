// Builds dist/kicklab.html from src/. No dependencies.
// Game fragments in src/game/ are joined in filename order into one script.
import { cpSync, readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(root, 'src', p), 'utf8');

const gameDir = join(root, 'src', 'game');
const parts = readdirSync(gameDir).filter((f) => f.endsWith('.js')).sort();
const shared = ['profile-store.js', 'game-core.js', 'gameplay-pacing.js', 'coach-tomi.js'].map((file) => src(`shared/${file}`).replace(/\n$/, '')).join('\n');
const game = shared + '\n' + parts.map((f) => readFileSync(join(gameDir, f), 'utf8').replace(/\n$/, '')).join('\n') + '\n';

const fill = { STYLES: src('styles.css'), VENDOR: '<script>' + src('vendor/three.min.js') + '</script>', GAME: game };
const html = src('index.html').replace(/\{\{(STYLES|VENDOR|GAME)\}\}/g, (_, k) => fill[k]);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'kicklab.html'), html);
rmSync(join(root, 'dist', 'media'), { recursive: true, force: true });
cpSync(join(root, 'src', 'media'), join(root, 'dist', 'media'), { recursive: true });
if (process.argv.includes('--emit-game')) writeFileSync(join(root, 'dist', 'game.js'), game);
console.log(`built dist/kicklab.html (${(html.length / 1024).toFixed(0)} KB) from ${parts.length} game files`);
