/* Static file server for the Playwright prototype suite.
 *
 * Replaces `python3 -m http.server` (and the ThreadingHTTPServer variant):
 * Python's per-connection threading model intermittently dropped sockets
 * under full-suite parallel load (net::ERR_SOCKET_NOT_CONNECTED on a random
 * <script src>), which killed page globals and flaked unrelated tests.
 * Node's single event loop multiplexes every connection, so there is no
 * accept-queue race to lose.
 *
 * Zero dependencies on purpose -- runs straight off the repo checkout.
 * Not a test file: playwright only collects *.spec.ts.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 8888);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filePath = normalize(join(ROOT, urlPath));
    // normalize() resolved any ".." segments; anything that escaped ROOT is a
    // traversal attempt.
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    if (filePath.endsWith(sep)) filePath = join(filePath, 'index.html');
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.byteLength,
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(err && err.code === 'ENOENT' ? 404 : 500).end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`prototype server ready on http://127.0.0.1:${PORT}`);
});
