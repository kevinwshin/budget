# Envelope Budget

A zero-based envelope budget that runs as a progressive web app (PWA). It is built for an
Android phone and also works in a desktop browser. All data stays on the device: there is no
server and no account.

## Features

- **Envelopes.** Every dollar of income is assigned to an envelope. Balances carry over from
  month to month, and an overspent envelope shows red until you cover it.
- **Tags.** Each envelope has one budget tag, which groups it on the budget screen, and one
  account tag, which matches a real bank account. Account totals are a report: the sum of the
  envelopes with that tag.
- **Transactions.** Expenses can be split across envelopes. Moves between envelopes can be
  one-to-one, one-to-many, many-to-one, or many-to-many, entered in dollars or as percentages of a
  total. Investment envelopes take value updates. Balance adjustments exist for rare corrections.
- **Reports.** The month's in and out for each envelope, spending by budget tag, income compared
  with spending, investment value history, and account totals, each filterable by account tag.
- **Backup.** Export and import a JSON file that holds all data and settings. The file starts
  with a format version so later app versions can migrate older files. The app reminds you when
  the last backup is more than 30 days old.
- **Offline.** A service worker caches the app, so it opens without a network connection after
  the first visit.

## Tech stack

- [Vite](https://vite.dev/), [React](https://react.dev/), and TypeScript.
- [Dexie](https://dexie.org/) over IndexedDB, the browser's on-device database.
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for the web app manifest and service worker.

## Requirements

- Node.js 24 and npm. Node 24 is the version the deploy workflow uses. The tests use Node's
  built-in test runner and its built-in TypeScript support.

## Run it

Install the dependencies:

```bash
npm install
```

Start the development server, which reloads on each change:

```bash
npm run dev
```

Open http://localhost:5173. The server also listens on your local network.

Build the production version and serve it, including the service worker:

```bash
npm run build && npm run preview
```

The port is fixed at 5173. Browser storage belongs to the scheme, host, and port together, so the
same app on another port starts with an empty database.

### Serve from a subfolder

The site is served from `/` unless `BASE_PATH` is set. GitHub Pages serves a project site from
`/<repository>/`, and the deploy workflow sets `BASE_PATH` to match. To build and preview that
layout locally:

```bash
BASE_PATH=/budget/ npm run build && BASE_PATH=/budget/ npm run preview
```

Then open http://localhost:5173/budget/.

## Run the tests

```bash
npm test
```

The tests are in `tests/`. They cover balance and report calculations, transaction validation,
backup import, money parsing, month arithmetic, and percent splits. `tests/setup.mjs` lets Node
load the app's sources, which import each other without file extensions.

Check types without building:

```bash
npm run typecheck
```

## Deploy

`.github/workflows/deploy.yml` builds the site and deploys it to GitHub Pages on each push to
`main`. In the repository, set **Settings > Pages > Source** to **GitHub Actions** before the
first run.

To install the app on Android, open the Pages URL in Chrome and choose **Install app** from the
menu. The app's data belongs to that URL, so export a backup before you move to a different one.

## Configuration

- **Currency.** `src/config.ts` sets the currency and the number-format locale. Amounts are stored
  as whole numbers of the currency's smallest unit, such as cents, so change the currency only
  before you enter data.
- **Icons.** `npm run icons` redraws `public/icon-192.png` and `public/icon-512.png`.

## Project layout

| Path | Contents |
|---|---|
| `src/types.ts`, `src/db.ts` | Data model and database schema |
| `src/ledger.ts`, `src/ops.ts`, `src/percent.ts` | Balance calculations, validated writes, and percent splits |
| `src/backup.ts`, `src/settings.ts` | Backup export and import, and settings |
| `src/nav.tsx`, `src/App.tsx` | Navigation, which ties pages and sheets to the browser history and the Android back button |
| `src/screens/` | Budget, envelope, transactions, reports, settings, and manage screens |
| `src/sheets/` | Add, move money, value update, adjustment, and edit sheets |
| `tests/` | Tests run by `npm test` |
