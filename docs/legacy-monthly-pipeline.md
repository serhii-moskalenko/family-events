# Historical monthly pipeline — retired October 10, 2026

The following describes the previous implementation. Its scheduled discovery is disabled; use [weekly publishing](weekly-publishing.md) instead. The old adapters and their tests remain for reference and never run in the deployment workflow.

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

**Working automation: discovery, validation and automatic publication from four configured sources, plus verification of manually curated events. No AI API is used.**

`config/discovery.json` enables these tested adapters:

- Explore Canton: list-page links, Event JSON-LD, event-specific address and full description markup, recurring date rows, explicit daily hours for multi-day festivals.
- Canton First Baptist: official Church Center list and detail HTML; dated occurrence rows, Google Maps address and organizer metadata.
- First Baptist Church Woodstock: the same Church Center adapter; nonlocal campuses are excluded by ZIP/area checks.
- Hickory Flat Church: calendar links (including event URLs in sharing links) and Event JSON-LD.

The monthly `npm run refresh` now runs both curated verification and discovery, merges by source URL, reuses existing card IDs, updates parsed facts and publishes new eligible records without editing `config/sources.json`. Stable URL-based IDs preserve same-month selections. Cancellation results cannot be restored through the curated fallback. Changed prices use current parsed prices; ambiguous prices stay unknown. Previously verified Ukrainian descriptions are retained only when the original evidence still matches. New titles and a maximum 24-word source excerpt remain in the source language; Ukrainian interface text explains that no automatic translation is performed.

New records need an explicit year, time, full Georgia street address/ZIP, family-interest evidence, and no cancellation/closure/sold-out notice. Volunteer recruitment, adult-only activities, incomplete dates, unconfirmed recurring daily hours, multiple same-day time slots, and addresses outside the configured local ZIPs are excluded. Family matching is a conservative keyword rule, not a semantic judgment or a guarantee of child suitability. HTML structure changes may require adapter maintenance. There is no unattended discovery of entirely new websites.

US Census Geocoding Services resolves unique street-number/ZIP matches. A 20-mile haversine radius is measured from the configured Canton reference point **along a straight line, not driving roads**. Two previously reviewed Canton venues (1 Mission Point and 225 Reformation Pkwy) have exact address allowlist exceptions because Census has no match. Those records disclose that distance is not measured and receive 0/15 distance points. No coordinates or driving distances are invented. Unknown/unresolved addresses outside this explicit allowlist are quarantined. [Census API documentation](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html).

`public/data/discovery-report.json` and the Actions artifact record source status and each published, excluded or quarantined URL. If all discovery sources fail, refresh fails and the previous deployment remains. Partial failures are reported; an honestly empty month can publish when sources work but no eligible events are found. The other pages in the 17-page registry remain candidate-only sources until a parser is implemented and tested.
The verifier deliberately favors omission over publishing unverified facts. Evidence matching does not prove there are no last-minute changes: notices on social media or unconfigured pages are outside its coverage. The interface links to official sources and asks visitors to recheck before travel. Comfort and children's-interest values are editorial judgments; unknown accessibility details are labeled for organizer confirmation. Manually curated distances are approximate address-based estimates; automatic distances are either measured straight-line distances or explicitly unknown. Maps provides the driving route.

## Monthly publishing and state

`.github/workflows/pages.yml` runs on main pushes, manual dispatch and the first day of every month at 10:17 UTC (06:17 EDT / 05:17 EST; GitHub may delay scheduled runs). Tests run before live source refresh. It validates and builds the refreshed catalog, scans the source registry, retains its candidate report, uploads the Pages artifact and deploys with `pages: write` / `id-token: write`. It then checks the public HTML, catalog and discovery-report endpoints. Pull requests run tests/build without deployment. Pages repository setting must use **GitHub Actions** as its publishing source.

After a successful deployment, a separate job with `contents: write` saves only the two generated public JSON files back to this repository, providing a monthly audit trail and regular repository activity. It skips saving if main changed during the run, and never edits application source or other repositories. The built-in `GITHUB_TOKEN` and `[skip ci]` prevent recursive builds. No personal access token is required. GitHub disables scheduled workflows in public repositories after 60 days without repository activity; these real catalog updates reduce that risk. [GitHub schedule and token rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

The published `catalogId` is the year-month in America/New_York. Only upcoming configured sessions in that month are published. localStorage stores each event's Added/Rejected state and selected occurrence under `family-events:v1`. State survives same-month updates and reloads, and resets when a successfully published catalog has a different month ID. Previously stored weekly selections migrate into the same month without loss. Crossing into a new month does not reset state until a new catalog is successfully published. The browser hides ended sessions from All without a new source fetch; Added and Rejected retain this month’s history. Storage failures leave the app usable with an explanatory message.

## Calendar and rating

Apple Calendar generates an RFC 5545 `.ics` download with CRLF, escaping, UTF-8 folding, stable occurrence UID, UTC DTSTAMP, `TZID=America/New_York`, and DAYLIGHT/STANDARD definitions. Only multi-date events show a selector. Downloading marks the event Added; **the site cannot observe or guarantee import into Apple Calendar**. The user must open the file and confirm import. Added cards are green; restoring returns the event to All. Rejection uses a confirmation dialog.

Rating uses four components: children's interest 0–30, family comfort 0–20, distance 0–15, uniqueness 0–10. The sum out of 75 is normalized to 0–100 with `Math.round(sum / 75 * 100)`. Price never contributes to the score or rating sort, including unknown or free admission. Each card exposes the four raw components. Family price remains separate information for 2 adults and 2 children aged 3+, with extras excluded and described; unknown prices stay unknown. Explicit sorting by price remains available. It is not a visitor-review score.

## Tests

Unit tests cover weighted scores, timezone/DST month rollover, persistence/reset/migration, filtering/sorting, valid calendar content/escaping/folding, source parsing, price changes/cancellations, failure quarantine, unknown end times, candidate-link host restrictions and event expiration. Playwright covers mobile overflow, expansion, filtering, date selection, actual downloaded ICS contents, green Added state, persistence, rejection confirmation/cancel/restore, month reset, network-error UI, church/market classification, and exporting the displayed occurrence when only one future date remains. Parser tests include captured source shapes, changed prices, unknown admission vs free food, cancellations, DST errors, nonlocal addresses, geocoder mismatches, redirects, stable IDs, merging and a genuinely new future-month URL. Tests are deterministic and do not depend on live website availability; the refresh command separately exercises the real sources.

## Appearance

White/light and black/dark themes use CSS color tokens, including form controls, dialogs and expanded cards. The initial theme follows the device setting; the header switch saves an explicit preference under `family-events:theme`, independently of event selections. A small pre-paint script prevents a wrong-theme flash. Added cards remain green in both themes.

## No-AI rating rules

Automatically imported cards carry a `rules-v2-price-independent` label. Children: 12 points for a general family invitation, 22 for one matched activity group, 26 for two, 30 for three or more. Comfort is conservatively 8/20 because accessibility, parking and toilets are not automatically verified. Distance: up to 5/10/15/20 straight-line miles = 15/12/9/6 points; unmeasured approved venues = 0. Uniqueness is a simple activity-count proxy: 4/6/8 points. These are transparent heuristics, not visitor reviews or AI assessments. The four raw component limits remain 30/20/15/10 and are normalized from 75 to 100. The price parser only supplies displayed facts and never affects family eligibility or rating. There is no minimum rating threshold for publishing an otherwise eligible event.

No AI credentials, translation API or paid event-search API is required. Automatic publication has been tested with live pages from all four enabled sources and with an offline new-November-event test that has no corresponding curated record. The pipeline calls no OpenAI service.

## Local farms filter

The independent «Місцеві ферми» checkbox combines with category, tab and sorting. It selects events with verified `farm` provenance, not any pumpkin-themed festival or any event in the broad farm/nature category. The current verified farm is Cagle’s Farm; its dated program is already curated. `config/discovery.json.localFarms` provides reviewed exact addresses for automatic imports to recognize the same venue. Curated metadata is retained on merge only when the verified event address still matches. A farm listing without confirmed event dates is not turned into an event.
