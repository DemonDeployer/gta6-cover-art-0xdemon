// Neon Vice Cover Studio — tiny static file server (Node 22, stdlib only).
// Serves app/ at http://localhost:8080 so the app can be tried in a browser:
//   node serve.ts
// An optional port may be given: node serve.ts 8081

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(join(fileURLToPath(new URL('.', import.meta.url)), 'app'));
const port = Number(process.argv[2] ?? 8080);

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const target = resolve(join(appRoot, rawPath === '/' ? 'index.html' : rawPath));
  if (!target.startsWith(appRoot) || !existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': mimeTypes[extname(target).toLowerCase()] ?? 'application/octet-stream' });
  createReadStream(target).pipe(res);
});

server.listen(port, () => {
  console.log(`Neon Vice Cover Studio at http://localhost:${port}`);
});
