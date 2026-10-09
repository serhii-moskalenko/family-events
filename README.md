# Family Events

Compact Ukrainian family-event catalog within approximately 20 miles of Canton, Georgia.

**Website:** https://serhii-moskalenko.github.io/family-events/

## Run and test

Node.js 22+.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:e2e
npm run refresh
npm run build
npm run dev
```

Buildless ES modules are copied to `dist/` with relative paths, so deployment under `/family-events/` works without a router or a backend. Vite is only a local test/preview server. Runtime has no third-party JavaScript or external fonts.

## Data sources and automation

`config/sources.json` explicitly lists curated events, official source URLs, exact evidence fragments for dates, hours, prices and addresses, verified session dates, and editorial rating components. The initial sources are:

- [Black Sheep Events / Great Pumpkin Fest](https://www.bsheepevents.com/events/the-great-pumpkin-fest-1): October 10, 2026, 10 AM–3 PM, free entry, Cherokee Veterans Park.
- [Cagle’s Farm](https://caglesfarm.com/): 2026 opening, Friday/Saturday/Sunday hours, $15 per person age 3+, address.
- [Cagle’s entertainment schedule](https://caglesfarm.com/entertainment/): confirms the configured weekends through November 1. Farm opening hours are used for visit windows, not performance times.

`npm run refresh` fetches the live official pages with a timeout; strips scripts/styles; decodes HTML entities; normalizes whitespace; and checks every configured evidence fragment. Missing/changed information, HTTP errors and explicit cancellation, postponement, closure or sold-out notices quarantine the event. Unknown prices can be represented by `familyPrice: null`; never guess them. Expired sessions are removed. An empty catalog is valid and displays a clear empty state. The generated JSON includes verification time, week ID, quarantined IDs and reasons. Each Action retains the JSON report as an artifact and writes a run summary.

**Working, tested automation: verification and refreshing of configured events. Automated discovery of new events is disabled.** This is not a general-purpose event search engine. To add an event or change dates/prices, a maintainer must inspect an official organizer/government page, update the curated record and its evidence, run refresh/tests, and commit the change. Do not copy old dates into a new season. No paid API credentials are needed for the configured public sources.

The verifier deliberately favors omission over publishing unverified facts. Evidence matching does not prove there are no last-minute changes: notices on social media or unconfigured pages are outside its coverage. The interface links to official sources and asks visitors to recheck before travel. Comfort and children's-interest values are editorial judgments; unknown accessibility details are labeled for organizer confirmation. Distances are approximate address-based estimates, not measured driving routes; Maps provides the actual route.

## Weekly publishing and state

`.github/workflows/pages.yml` runs on main pushes, manual dispatch and Mondays at 10:17 UTC (06:17 EDT / 05:17 EST; GitHub may delay scheduled runs). Tests run before live source refresh. It validates and builds the refreshed catalog, uploads the Pages artifact and deploys with `pages: write` / `id-token: write`. It then checks the public HTML and data endpoint. Pull requests run tests/build without deployment. Pages repository setting must use **GitHub Actions** as its publishing source. No source commits or other repositories are modified by the workflow.

The published `weekId` is the Monday date in America/New_York. localStorage stores each event's Added/Rejected state and selected occurrence under `family-events:v1`. State survives same-week updates and reloads, and resets when a successfully published catalog has a different week ID. Merely crossing midnight does not reset state before a new catalog is published. Storage failures leave the app usable with an explanatory message.

## Calendar and rating

Apple Calendar generates an RFC 5545 `.ics` download with CRLF, escaping, UTF-8 folding, stable occurrence UID, UTC DTSTAMP, `TZID=America/New_York`, and DAYLIGHT/STANDARD definitions. Only multi-date events show a selector. Downloading marks the event Added; **the site cannot observe or guarantee import into Apple Calendar**. The user must open the file and confirm import. Added cards are green; restoring returns the event to All. Rejection uses a confirmation dialog.

Rating is the sum of five editorial components: children's interest 0–30, cost 0–25, family comfort 0–20, distance 0–15, uniqueness 0–10. Each card exposes the complete breakdown. Family price assumes 2 adults and 2 children aged 3+, with extras excluded and described. It is not a visitor-review score.

## Tests

Unit tests cover weighted scores, timezone/DST week rollover, persistence/reset, filtering/sorting, valid calendar content/escaping/folding, source parsing, price changes/cancellations, failure quarantine and event expiration. Playwright covers mobile overflow, expansion, filtering, date selection, actual downloaded ICS contents, green Added state, persistence, rejection confirmation/cancel/restore, week reset and network-error UI. Tests are deterministic and do not depend on live website availability; the refresh command separately exercises the real sources.
