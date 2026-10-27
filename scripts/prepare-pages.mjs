import { copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'dist', 'kicklab.html');
const pagesRoot = join(root, 'dist', 'pages');

rmSync(pagesRoot, { recursive: true, force: true });
mkdirSync(pagesRoot, { recursive: true });
copyFileSync(source, join(pagesRoot, 'index.html'));
cpSync(join(root, 'dist', 'media'), join(pagesRoot, 'media'), { recursive: true });
cpSync(join(root, 'dist', 'assets'), join(pagesRoot, 'assets'), { recursive: true });
copyFileSync(join(root, 'dist', 'build-metrics.json'), join(pagesRoot, 'build-metrics.json'));
copyFileSync(join(root, 'dist', 'party-qr.js'), join(pagesRoot, 'party-qr.js'));

console.log('prepared dist/pages/index.html plus local media, 3D assets, and build metrics from dist');
