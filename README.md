# Phoenix Malls — Web

A responsive Next.js application for exploring Phoenix Malls on an interactive map. Select India to see its mall locations, search by mall or city, filter by current open/closed status, and open a mall's map popup and details.

## Requirements

- Node.js 22 or later
- Yarn Classic 1.22 or later

## Install and run

Run these commands from the `web` directory:

```sh
yarn install
yarn dev
```

The development server normally opens at [http://localhost:3000](http://localhost:3000). If that port is already occupied, Next.js will choose another port and print the address in the terminal.

## Checks and production build

```sh
yarn test
yarn lint
yarn build
```

The build script uses Next.js with Webpack. Shared-core tests cover mall and city search, status filters, map bounds, local time zones, schedule boundaries, overnight hours, holidays, and invalid data.

## Project structure

```text
web/
├── src/app/                App Router pages, layout, and global styles
├── src/components/         Dashboard, Leaflet map, mall popup, UI components
├── src/lib/                Small shared UI utilities
├── packages/core/
│   ├── src/                Mall data, repository, status, filtering, map bounds
│   └── test/               Shared business-logic tests
├── public/leaflet/         Leaflet styles and marker assets
├── next.config.ts          Next.js configuration
└── package.json            Scripts and dependencies
```

## Main interactions

- Pan and zoom the world map, select India, and view mall markers.
- Select a marker or a destination in the list to open the corresponding details.
- Search by mall name or city; filter results by All, Open, or Closed.
- View the local time, today's mock operating hours, address, and contact details.
- Use the popup actions for editing local preview data, deleting a marker after confirmation, adding a route, drawing a radius, opening the mall website, using Street View, and getting directions.
- Switch between light and dark appearance. Network state and tile errors are surfaced while mall data remains available.

## Architecture and data

`packages/core` separates mall data and business rules from the UI:

- `malls.ts` defines the `Mall` shape and sample records.
- `repository.ts` defines the `MallRepository` interface and an in-memory mock implementation.
- `status.ts` computes open/closed status using each mall's IANA time zone. Opening is inclusive, closing is exclusive, and overnight schedules and explicit `closedDates` are supported. Invalid schedules or time zones are reported as unavailable.
- `filter.ts` applies country, mall/city search, and live status filters.
- `geo.ts` calculates safe map bounds from valid mall coordinates.

The web UI calls the repository and shared helpers rather than embedding the mock records in map components. A REST-backed `MallRepository` can be introduced without moving API concerns into the UI.

## Data and limitations

The sample dataset contains Phoenix Marketcity Pune, Phoenix Marketcity Mumbai, and Phoenix Palladium Mumbai. The addresses, phone numbers, hours, coordinates, and image URLs are illustrative and should be verified before public use. Edits and deletions are in-memory previews and are not persisted. The map uses Leaflet and OpenStreetMap; tile imagery and remote mall images require an internet connection, and offline tile caching is not configured.
