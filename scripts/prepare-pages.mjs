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

console.log('prepared dist/pages/index.html and local media from dist');
