import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Lightweight health checks for Kubernetes / load balancers (must stay cheap; no SSR).
 */
app.get('/health', (_req, res) => {
  res.status(200).type('application/json').send({ status: 'ok' });
});

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

/**
 * When the UI is served from this Node process alone (e.g. `node dist/.../server.mjs`), the browser
 * still calls same-origin `/auth`, `/user`, `/api`. Without a gateway in front, those requests would
 * fall through to Angular SSR and return index.html (seen as a huge HTML "message" in the UI).
 *
 * Set MCART_LOCAL_API_PROXY=1 for local full-stack testing. In Kubernetes, ingress usually routes
 * API paths to backends and this stays off.
 */
function createLocalApiProxy(): express.RequestHandler {
  const routes: { prefix: string; base: URL }[] = [
    {
      prefix: '/api/search',
      base: new URL(process.env['MCART_PROXY_SEARCH'] ?? 'http://127.0.0.1:8083'),
    },
    {
      prefix: '/user',
      base: new URL(process.env['MCART_PROXY_USER'] ?? 'http://127.0.0.1:8082'),
    },
    {
      prefix: '/auth',
      base: new URL(process.env['MCART_PROXY_AUTH'] ?? 'http://127.0.0.1:8081'),
    },
    {
      prefix: '/api',
      base: new URL(process.env['MCART_PROXY_API'] ?? 'http://127.0.0.1:8084'),
    },
  ];

  return (req, res, next) => {
    const fullUrl = req.originalUrl ?? req.url;
    if (fullUrl == null || fullUrl === '') {
      return next();
    }
    const pathname = fullUrl.split('?')[0] ?? '';
    const route = routes.find((r) => pathname.startsWith(r.prefix));
    if (!route) {
      return next();
    }

    const incoming = new URL(fullUrl, 'http://127.0.0.1');
    const dest = new URL(incoming.pathname + incoming.search, route.base);

    const outHeaders: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower)) continue;
      if (value === undefined) continue;
      outHeaders[key] = value;
    }
    outHeaders['host'] = dest.host;

    const port =
      dest.port !== ''
        ? Number(dest.port)
        : dest.protocol === 'https:'
          ? 443
          : 80;

    const pReq = httpRequest(
      {
        hostname: dest.hostname,
        port,
        path: dest.pathname + dest.search,
        method: req.method,
        headers: outHeaders,
      },
      (pRes) => {
        const status = pRes.statusCode ?? 502;
        res.writeHead(status, pRes.headers);
        pRes.pipe(res);
      },
    );

    pReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).type('text/plain').send(`Bad Gateway (API proxy): ${err.message}`);
      }
    });

    req.pipe(pReq);
  };
}

if (process.env['MCART_LOCAL_API_PROXY'] === '1') {
  app.use(createLocalApiProxy());
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
