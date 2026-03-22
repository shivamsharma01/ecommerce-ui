# MCart UI

Angular storefront with **SSR** (Express), Material, and zoneless change detection. In dev, API calls are proxied to a backend (default port **3000**).

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

1. Start your API where `proxy.conf.json` points (default `http://localhost:3000`).
2. `npm start`
3. Open `http://localhost:4200`

Proxied paths include `/auth` and `/api` (adjust `proxy.conf.json` if your backend differs).

## Production

Build, then serve SSR; set **`PORT`** for the Node listener. Reverse-proxy `/auth` and `/api` to your real auth/product services — the app uses relative URLs.

## Kubernetes

Manifests: **`ecomm-infra/deploy/k8s/apps/mcart-ui/`** (`deployment.yaml`, `configmap.yaml`, `service.yaml`). Image placeholders: `<ARTIFACT_REGISTRY_URL>`, `<VERSION>`.
