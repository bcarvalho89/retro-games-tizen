import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname, normalize } from 'node:path';

const PORT = 8766;
const APP = new URL('./app/', import.meta.url).pathname;
const DATA = new URL('./server-data/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' };
const SAVE = /^\/dev\/saves\/[a-z0-9-]+\/[a-z0-9-]+\.(srm|state)$/;

http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, HEAD, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const inData = path.startsWith('/dev/');
  const file = inData ? join(DATA, path.slice(5)) : join(APP, path === '/' ? 'index.html' : path);
  if (!file.startsWith(inData ? DATA : APP)) { res.writeHead(404); return res.end(); }
  if (req.method === 'PUT') {
    if (!SAVE.test(path)) { res.writeHead(405); return res.end(); }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.concat(chunks));
    res.writeHead(204);
    return res.end();
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
// loopback only: it accepts uploads into server-data/
}).listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}  (dados: server-data/ em /dev/)`));
