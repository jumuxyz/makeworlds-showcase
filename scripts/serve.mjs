import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { build, root } from './build.mjs';

const portOption = process.argv.slice(2).find(arg => arg.startsWith('--port='));
const port = Number(portOption?.slice(7) ?? 5187);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use --port=<1..65535>');
const prefix = '/makeworlds-showcase/';
const dist = resolve(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
let pending = build();
await pending;

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end('Invalid URL'); return; }
    if (pathname === prefix.slice(0, -1)) { response.writeHead(302, { Location: prefix }).end(); return; }
    const localPath = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(1);
    const file = resolve(dist, localPath || 'index.html');
    const within = relative(dist, file);
    if (within === '..' || within.startsWith('..' + sep)) { response.writeHead(403).end(); return; }
    if (within === 'index.html') pending = pending.catch(() => {}).then(() => build());
    await pending;
    if (!(await stat(file)).isFile()) { response.writeHead(404).end('Not found'); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': bytes.length, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') response.writeHead(404).end('Not found');
    else { console.error(error); response.writeHead(500).end('Preview build failed; see terminal'); }
  }
});
server.on('error', error => { console.error(`Preview failed: ${error.message}. Choose another --port if occupied.`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}${prefix} (PID ${process.pid})`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
