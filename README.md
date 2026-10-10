# Family Events

Ukrainian family-event catalog near Canton, Georgia, with themes, filters, four-component ratings, Added/Rejected selections and Apple Calendar downloads.

**Website:** https://serhii-moskalenko.github.io/family-events/

## Weekly catalogs supplied by ChatGPT

Research and ratings belong to the user's existing local ChatGPT Scheduled Task. This repository accepts a structured seven-day JSON catalog, validates it, runs tests and publishes it to the same GitHub Pages website. No new research system or paid AI API is configured. Monthly discovery no longer runs in Actions and cannot overwrite weekly catalogs through the old refresh command.

See [publishing instructions, JSON format, permissions and integration status](docs/weekly-publishing.md). The existing Scheduled Task has not been modified. A real run from that task still needs to be tested; a local CLI or successful Actions run alone is not proof of unattended scheduling.

## Run and test

Node.js 22+; GitHub CLI is required only for remote publication.

```sh
npm ci
npm run catalog:check -- incoming/weekly-catalog.json
npm test
npx playwright install chromium
npm run test:e2e
npm run catalog:ingest
npm run build
npm run dev
```

The frontend remains static with relative paths for `/family-events/`. Unknown prices and end times stay `null`. Rating is `Math.round((children + comfort + distance + uniqueness) / 75 * 100)`, with maxima 30/20/15/10. Price is displayed separately and never changes rating.

Each catalog identifies its seven-day window with `catalogId: "week-YYYY-MM-DD"`. Corrections in the same window preserve browser selections; a successfully published different window resets them. Theme preference remains independent. Downloading an `.ics` marks a card Added but does not guarantee calendar import.

The initial weekly catalog for October 10–16 was selected from the already published October catalog. Original verification timestamps, sources and ratings are retained; this migration is not a new ChatGPT research run. Historical discovery reports and parser configuration are retained for reference: [retired monthly pipeline](docs/legacy-monthly-pipeline.md).
