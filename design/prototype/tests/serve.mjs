/* Static file server for the Playwright prototype suite and local preview
 * (scripts/serve-prototype.sh delegates here so the two can never drift).
 *
 * Replaces `python3 -m http.server` (and the ThreadingHTTPServer variant):
 * Python's per-connection threading model intermittently dropped sockets
 * under full-suite parallel load (net::ERR_SOCKET_NOT_CONNECTED on a random
 * <script src>), which killed page globals and flaked unrelated tests.
 * Node's single event loop multiplexes every connection, and the keep-alive
 * timeouts below sit far above test think-time so an idle pooled socket is
 * never FIN-ed in the same tick the browser reuses it.
 *
 * Zero dependencies on purpose -- runs straight off the repo checkout.
 * Not a test file: playwright only collects *.spec.ts.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Port comes from argv (serve-prototype.sh, and playwright.config.ts's
// webServer.command, both pass one explicitly), not process.env here --
// PW_PORT is resolved once in playwright.config.ts and threaded through, so
// baseURL, webServer.url and this server always agree on the same port.
const PORT = Number(process.argv[2]) || 8888;

// Only the types the prototype actually references; octet-stream otherwise.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.ttf': 'font/ttf',
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // join() normalizes ".." segments, so the containment check below is
    // sound; relative() instead of a string-prefix check so a sibling
    // directory sharing the prefix (e.g. prototype-archive) can never match.
    let filePath = join(ROOT, urlPath);
    const escape = relative(ROOT, filePath);
    if (escape.startsWith('..') || isAbsolute(escape)) {
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
    // Never writeHead twice: with the 200 already flushed, a second call
    // would throw ERR_HTTP_HEADERS_SENT inside this async handler -- an
    // unhandled rejection that kills the whole server process on Node 15+.
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const status =
      err instanceof URIError || err instanceof TypeError
        ? 400 // malformed percent-encoding or unparseable URL in the request path
        : err && (err.code === 'ENOENT' || err.code === 'EISDIR' || err.code === 'ENOTDIR')
          ? 404
          : 500;
    res.writeHead(status).end();
  }
});

// Node's 5s keepAliveTimeout default FIN-races a browser reusing a pooled
// connection after a slow assertion -- the exact symptom class this server
// exists to eliminate. headersTimeout must stay above keepAliveTimeout.
server.keepAliveTimeout = 60_000;
server.headersTimeout = 65_000;

server.on('error', (err) => {
  console.error(`prototype server failed to start: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`prototype server ready on http://127.0.0.1:${PORT}`);
});
