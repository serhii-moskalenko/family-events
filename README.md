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
npm run scan
npm run refresh
npm run build
npm run dev
```

Buildless ES modules are copied to `dist/` with relative paths, so deployment under `/family-events/` works without a router or a backend. Vite is only a local test/preview server. Runtime has no third-party JavaScript or external fonts.

## Data sources and automation

`config/sources.json` explicitly lists curated events, official source URLs, exact evidence fragments for dates, hours, prices and addresses, verified session dates, and editorial rating components. The October 9, 2026 review expanded the catalog to **14 events** through October 31, including **7 church events**. First Baptist Church Woodstock and its official Church Center event list were also added: October 14 family dinner ($20 for four Café meals; $24 for four Homestyle meals) and October 25 Party with the Pastors (unknown price, whole family explicitly welcome). Mission Church’s Marietta festival was excluded from the locality window; the Crowder concert remains a lead until child ticket terms and official family cost are confirmed. Sources include Canton First Baptist / its official Church Center registration, Hickory Flat Church, Sutallee Baptist, Explore Canton (including Rising Hills and The Mill events), Woodstock city recreation/tourism, Cagle’s Farm and Black Sheep Events. Each card links to its source. `config/sources.json.review` records the review scope and reasons for excluded leads. This was best-effort AI-assisted research in Codex, not an exhaustive list of every event.

`config/source-registry.json` explicitly lists **17 source pages**, their authority/type, review status, candidate link patterns and allowed linked hosts. `npm run scan` fetches these pages and saves `reports/source-scan.json`: availability plus candidate URLs/titles requiring editorial review. The initial October 9 local run fetched 14/15 pages before Woodstock sources were added; the municipal Canton page returned HTTP 403. HTML link extraction cannot read every dynamic calendar or detect every event. The report does not infer dates/prices or publish candidates. New websites were added during this manual research; unattended discovery of new websites is not implemented.

The municipal Multicultural Festival was excluded because its live Eventeny organizer page explicitly said **“This event has been cancelled”**, even though the search-engine copy omitted the notice. November-only festivals, adult-oriented events with unconfirmed child suitability, private-address activities, and incomplete seasonal registration entries were also excluded.

`npm run refresh` fetches the live official pages with a timeout; strips scripts/styles; decodes HTML entities; normalizes whitespace; and checks every configured evidence fragment. Missing/changed information, HTTP errors and explicit cancellation, postponement, closure or sold-out notices quarantine the event. Unknown prices use `familyPrice: null`; unknown end times use `end: null`. Never guess them. Events with no published end time remain visible through their local event day; ICS omits DTEND, and the interface states that the end time is unknown. Expired sessions are removed. An empty catalog is valid and displays a clear empty state. The generated JSON includes verification time, month ID, quarantined IDs and reasons. Each Action retains the JSON report as an artifact and writes a run summary.

**Working, tested automation: verification and refreshing of configured events. Automated discovery of new events is disabled.** This is not a general-purpose event search engine. To add an event or change dates/prices, a maintainer must inspect an official organizer/government page, update the curated record and its evidence, run refresh/tests, and commit the change. Do not copy old dates into a new season. No paid API credentials are needed for the configured public sources.

The verifier deliberately favors omission over publishing unverified facts. Evidence matching does not prove there are no last-minute changes: notices on social media or unconfigured pages are outside its coverage. The interface links to official sources and asks visitors to recheck before travel. Comfort and children's-interest values are editorial judgments; unknown accessibility details are labeled for organizer confirmation. Distances are approximate address-based estimates, not measured driving routes; Maps provides the actual route.

## Monthly publishing and state

`.github/workflows/pages.yml` runs on main pushes, manual dispatch and the first day of every month at 10:17 UTC (06:17 EDT / 05:17 EST; GitHub may delay scheduled runs). Tests run before live source refresh. It validates and builds the refreshed catalog, scans the source registry, retains its candidate report, uploads the Pages artifact and deploys with `pages: write` / `id-token: write`. It then checks the public HTML and data endpoint. Pull requests run tests/build without deployment. Pages repository setting must use **GitHub Actions** as its publishing source. No source commits or other repositories are modified by the workflow.

The published `catalogId` is the year-month in America/New_York. Only upcoming configured sessions in that month are published. localStorage stores each event's Added/Rejected state and selected occurrence under `family-events:v1`. State survives same-month updates and reloads, and resets when a successfully published catalog has a different month ID. Previously stored weekly selections migrate into the same month without loss. Crossing into a new month does not reset state until a new catalog is successfully published. The browser hides ended sessions from All without a new source fetch; Added and Rejected retain this month’s history. Storage failures leave the app usable with an explanatory message.

## Calendar and rating

Apple Calendar generates an RFC 5545 `.ics` download with CRLF, escaping, UTF-8 folding, stable occurrence UID, UTC DTSTAMP, `TZID=America/New_York`, and DAYLIGHT/STANDARD definitions. Only multi-date events show a selector. Downloading marks the event Added; **the site cannot observe or guarantee import into Apple Calendar**. The user must open the file and confirm import. Added cards are green; restoring returns the event to All. Rejection uses a confirmation dialog.

Rating is the sum of five editorial components: children's interest 0–30, cost 0–25, family comfort 0–20, distance 0–15, uniqueness 0–10. Each card exposes the complete breakdown. Family price assumes 2 adults and 2 children aged 3+, with extras excluded and described. Unknown prices receive 0/25 for cost and an explicitly labeled preliminary score; this does not imply paid or free admission. It is not a visitor-review score.

## Tests

Unit tests cover weighted scores, timezone/DST month rollover, persistence/reset/migration, filtering/sorting, valid calendar content/escaping/folding, source parsing, price changes/cancellations, failure quarantine, unknown end times, candidate-link host restrictions and event expiration. Playwright covers mobile overflow, expansion, filtering, date selection, actual downloaded ICS contents, green Added state, persistence, rejection confirmation/cancel/restore, month reset, network-error UI, church/market classification, and exporting the displayed occurrence when only one future date remains. Tests are deterministic and do not depend on live website availability; the refresh command separately exercises the real sources.

## Appearance

White/light and black/dark themes use CSS color tokens, including form controls, dialogs and expanded cards. The initial theme follows the device setting; the header switch saves an explicit preference under `family-events:theme`, independently of event selections. A small pre-paint script prevents a wrong-theme flash. Added cards remain green in both themes.

## AI status and optional future integration

An unattended AI API is **not connected**. Codex performed AI-assisted search, translation, classification and editorial review for the October 9 catalog. Monthly Actions currently scan configured pages for candidate links and verify curated facts using deterministic evidence matching; they do not automatically run Codex or publish newly discovered events. For automatic discovery, an optional future GitHub Actions step could call OpenAI Responses API with web search restricted to reliable organizer/local-government domains, extract dated events with source links, translate descriptions and suggest ratings. Every result would still need validation of dates, prices, cancellation status and locality before publication. Unknown data must stay unknown. This feature has not been implemented or tested and needs an API credential and usage budget.

If integrating later, keep `OPENAI_API_KEY` in this repository's Actions secrets; never ship it to GitHub Pages or browser JavaScript. Run the API request only during the monthly job and publish validated static JSON. Official documentation: [Web search](https://developers.openai.com/api/docs/guides/tools-web-search), [API authentication](https://developers.openai.com/api/reference/overview).
