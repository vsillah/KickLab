import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';

const root = resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 4176);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = pathname === '/' ? '/evaluation/3d-pipeline/harness/index.html' : pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const target = resolve(root, `.${relative}`);
  if (!(target === root || target.startsWith(`${root}${sep}`)) || !existsSync(target) || !statSync(target).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`KickLab 3D evaluation: http://127.0.0.1:${port}/evaluation/3d-pipeline/harness/`);
});
