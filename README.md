# Phoenix Malls — Web app

Standalone Next.js application for discovering Phoenix Malls on an interactive map. Shared mall data, timezone-aware status logic, filtering, and tests are included in `packages/core`; no parent repository is required.

## Requirements

- Node.js 22 or later
- Yarn 1.22 or later

## Install and run

From this directory:

```sh
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```sh
yarn test
yarn lint
yarn build
```

## Structure

- `src/app` — Next.js App Router entry points and global styles.
- `src/components` — interactive map, mall details, search, filters, and reusable UI.
- `packages/core/src` — mall model and mock repository, geographic bounds, shared filtering, and local-time operating status.
- `packages/core/test` — tests for filters, geographic bounds, and operating hours.

The map uses Leaflet and OpenStreetMap. Mall contact details, hours, and imagery are mock content and should be verified before production use. Replace the mock repository in `packages/core` with a REST-backed implementation without coupling API access to the UI.
