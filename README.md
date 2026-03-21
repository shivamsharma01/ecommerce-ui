# MCart UI

Angular 20 storefront with server-side rendering (SSR), Angular Material, and zoneless change detection. The dev server proxies API and auth traffic to a backend on port 3000.

## Prerequisites

- Node.js (LTS recommended)
- npm
- A compatible backend implementing the endpoints below (or adjust `proxy.conf.json`)

## Scripts

| Command | Description |
| -------- | ----------- |
| `npm start` / `ng serve` | Dev server at `http://localhost:4200/` with hot reload |
| `npm run build` | Production build (browser + SSR server bundle) |
| `npm run serve:ssr:mcart-ui` | Run the Node Express SSR server from `dist/` (after build) |
| `npm test` | Unit tests (Karma / Jasmine) |
| `ng generate --help` | CLI schematics for components, services, etc. |

## Local development

1. Start your API on `http://localhost:3000` (or change targets in `proxy.conf.json`).
2. Run `npm start`.
3. Open `http://localhost:4200/`.

Proxy rules (`proxy.conf.json`):

- `/auth` → backend (e.g. login, refresh)
- `/api` → backend (products)

## Backend contract (expected)

The UI is built around these paths (relative URLs, same origin in dev via proxy):

| Area | Method | Path | Notes |
| ---- | ------ | ---- | ----- |
| Auth | POST | `/auth/login` | Body: `{ email, password }`. Response: `{ accessToken, expiresIn }`. Cookies used with `withCredentials: true`. |
| Auth | POST | `/auth/refresh` | Body: `{}`. Same response shape; refresh cookie/session expected server-side. |
| Auth | POST | `/auth/logout` | Body: `{}`. Invalidates server session / cookies when implemented; the client clears its token regardless of HTTP success. |
| Products | GET | `/api/products` | Returns `Product[]`. |
| Products | GET | `/api/products/search` | Query param `q` — search string. Returns `Product[]`. |

`Product` shape: `id`, `name`, `price`, `description`, optional `imageUrl`, `category`.

## Service capabilities (frontend)

- **AuthService** (`src/app/core/auth/auth.service.ts`): Login, refresh, in-memory access token, `isAuthenticated()`, `logout()` (POST `/auth/logout` then clear token in `finalize`), `clearAccessToken()` for interceptor use.
- **Auth HTTP interceptor** (`auth.interceptor.ts`): Attaches `Authorization: Bearer <token>` when a token exists; on `401`, skips refresh for login/refresh/logout URLs and for an already-retried request (`X-Auth-Retry`); otherwise refreshes once and retries the original request.
- **Guards** (`auth.guard.ts`): `publicGuard` redirects authenticated users away from login; `authGuard` is available for routes that should require login (apply in `app.routes.ts` as needed).
- **ProductService** (`src/app/core/services/product.service.ts`): `getCatalog()` and `search(query)`.

The catalog and search screens load data through `ProductService` (loading, empty, and error states are handled in the templates).

## Production SSR

After `npm run build`, the SSR entry is served with:

```bash
npm run serve:ssr:mcart-ui
```

The Node server reads `PORT` from the environment (default `4000`). Ensure the production deployment reverse-proxies `/auth` and `/api` to your real API (the Angular app uses relative URLs).

## Stack

- Angular 20, standalone components, `provideZonelessChangeDetection`
- `@angular/ssr` + Express (`src/server.ts`)
- Angular Material + CDK
- RxJS 7

## Project layout (high level)

- `src/app/core/` — auth and shared services
- `src/app/features/` — login, catalog, search
- `src/app/layout/` — shell with toolbar and `router-outlet`
- `src/app/shared/components/product-card/` — reusable product card (catalog + search)
- `src/server.ts` — Express static + SSR handler

## Testing

Run `npm test` (Karma + Chrome headless in CI-style runs: `npm test -- --no-watch --browsers=ChromeHeadless`). Specs cover `AuthService`, `ProductService`, route guards, `ProductCardComponent`, and the root `App` shell. Zoneless tests use `provideZonelessChangeDetection()` in `TestBed`.
