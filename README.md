# MCart UI

Angular storefront with **SSR** (Express), Material, and zoneless change detection. In dev, `proxy.conf.json` sends **`/api/search`** → search (**8083**), **`/user`** → user profile (**8082**), **`/auth`** → auth (**8081**), and **`/api`** → product (**8084**). Match order is search → user → auth → api.

## Requirements

- Node.js LTS
- npm

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Dev server at `http://localhost:4200` (uses `proxy.conf.json`) |
| `npm run build` | Production browser + server bundles |
| `npm run serve:ssr:mcart-ui` | Run SSR after build (reads `PORT`, default **4000**) |
| `npm test` | Unit tests (Karma / Jasmine) |

## Local development

1. Start auth (**8081**), user (**8082**), search (**8083**), and product (**8084**), or edit `proxy.conf.json` to match your ports.
2. `npm start`
3. Open `http://localhost:4200`

Proxied paths: `/api/search` → search; `/user` → user; `/auth` → auth; `/api` (everything else) → product.

## Production

Build, then serve SSR; set **`PORT`** for the Node listener. Reverse-proxy `/auth` and `/api` to your real auth/product services — the app uses relative URLs.

## Kubernetes

Manifests: **`ecomm-infra/deploy/k8s/apps/mcart-ui/`** (`deployment.yaml`, `configmap.yaml`, `service.yaml`). Image URI is **`asia-south2-docker.pkg.dev/ecommerce-491019/docker-apps/mcart-ui:<short-sha>`** (updated by Cloud Build). See **`ecomm-infra/README.md`**.
