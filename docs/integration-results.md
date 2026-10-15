# Monthly integration evidence — October 10, 2026

The existing monthly implementation on main was retained and hardened. Authoritative input remains schemaVersion 1 (`coverage`, `provenance`, text admissionPrice, stable IDs); generated public output remains schemaVersion 2. No recurring Work task was created, changed or invoked.

## Local verification

**51 Node tests and 17 mobile Playwright tests passed**, along with the production build and publisher dry run. Coverage includes October 10–31, November 1–30, December/January, leap February, full JSON Schema, price-independent ratings, stable identity guards, duplicate prevention, impossible dates, DST gaps/folds, timestamp order, unknown registration, reproducible hashes, atomic failure preservation, older-month/correction rejection, SHA-leased writes/new month creation, same-month state/migration, new-month reset, mobile themes/cards/filters/sorting/rejection/restore/ICS.

The October migration retains 14 previously published records and their real original source-verification times. One parser-inferred `00:00–23:59` event is quarantined until official hours are verified; the archived original remains in content/discovery/2026-10.snapshot.json. This update does not claim fresh event research.

## Actual connector test

A fresh authenticated `fetch_file` of main's `content/monthly/2026-10.json` succeeded. A sequential `update_file` targeting the same file, its actual blob SHA and identical contents returned **HTTP 403 Resource not accessible by integration** (`FORBIDDEN`). No commit was created. This confirms the connected integration still cannot write this repository in this session; it does not imply every Work account has that limitation.

## Deployment and local publishing

- Initial hardened monthly deployment: commit [471ea56](https://github.com/serhii-moskalenko/family-events/commit/471ea562506736ea97233b9150a633633afa913f), [run 38080158186](https://github.com/serhii-moskalenko/family-events/actions/runs/38080158186), successful build/deploy/save. Live SHA256: `bac71357b4d53dad3b2b1c87c87b7d9e6108f3ee5fccceb101eab00301e26c01`.
- Real negative **main-branch** test: a Contents API submission deliberately set children to 31/30, bypassing the local validator to test CI. [Run 38080276929](https://github.com/serhii-moskalenko/family-events/actions/runs/38080276929), commit c95ac0c, failed at `npm run validate` with `children must be <= 30`; deploy/save were skipped. Public blob stayed `157f97fa4b298f557040dbe59a02fbcce2aff5d4`, and live SHA256 stayed exactly the initial value. The invalid submission was subsequently replaced by the valid helper submission below.
- Real authenticated **local** publisher test: `node scripts/publish-monthly.mjs reports/monthly-submit.json --wait` created [commit 7eb8f8b](https://github.com/serhii-moskalenko/family-events/commit/7eb8f8b7cd7c69768a3dc43e9db7390b5570af38). [Run 38080331498](https://github.com/serhii-moskalenko/family-events/actions/runs/38080331498) passed build, **51 Node tests**, **17 browser tests**, deploy and save-catalog. The helper exited 0 with `deploymentVerified: true`. The save job created e75c8a9 with skip-ci, and triggered no recursive run.
- Final catalog SHA256: `9aea4fbfe3e35050fcd28b23d7f5ad160884e29ab37d69f13a87d0fee7ada622`; exact live bytes verified. Month `2026-10`, coverage October 10–31, 14 total records. The test updates preparation time/provenance notes only, retaining original source facts and verifiedAt timestamps.
- Headless Chromium against the **real Pages URL** verified the October 10–31 header, 390px layout without overflow, theme switching/persistence, weekly-to-monthly state migration, Added state, rejection confirmation/restore and a real America/New_York ICS download with standard/daylight rules. No page errors. There were 13 available cards at test time: the first festival's verified ending time had passed, while its record remained in the full catalog.

These results confirm the repository/Pages pipeline and authorized local publishing. They do not prove Work Cloud Browser sign-in or a recurring Work run.

## Remaining Work acceptance test

The authenticated Cloud Browser GitHub editor is a documented candidate. This local task cannot access the user's separate cloud browser session. In the actual Work task, verify secure GitHub sign-in/write access, make a harmless same-month update, commit/merge, wait for that exact Actions run and compare the live JSON. Record the actual mechanism, commit/run/hash before calling automated Work publication operational. Eligible connected-computer access is an optional separately tested fallback. See [WORK_INTEGRATION.md](WORK_INTEGRATION.md) for complete format, secure setup, procedure and ready-to-use instruction.


## Changed files and mechanism

| Files | Result |
| --- | --- |
| content/monthly/2026-10.json; content/monthly.schema.json | Preserved existing monthly schema; added submission timestamp, quarantined issues, explicit empty reason and nullable registration; removed the unverified time record from active data. |
| scripts/catalog.mjs | Full schema and semantic validation, bounded data, duplicate/identity/time guards, reproducible generation, unique temporary-file atomic replacement and rollback checks. |
| scripts/publish-monthly.mjs; scripts/verify-live.mjs; package.json | Optional fixed-repository authenticated CLI publication with SHA lease, current-month/freshness checks and exact workflow/live hash verification. |
| .github/workflows/pages.yml | Tests before deployment, main-head freshness guard, exact live comparison, save only successful generated output with no recursion; existing first-day activation schedule preserved and performs no research. |
| public/data/events.json | Successful generated frontend output. |
| src/app.js; index.html | Existing layout preserved, precise coverage header, registration details, cache version to load updated monthly logic. |
| tests/monthly.test.js; tests/publishing.test.js; tests/ui.spec.js; tests/fixtures/monthly-input.json | Monthly/identity/price/DST/failure/auth helpers and existing UI regression coverage; real-data UI test accepts future months and honestly empty catalogs. |
| README.md; docs/WORK_INTEGRATION.md; docs/integration-results.md | Exact schema, mechanisms A/B/C, secure authentication, ready Work instruction, tested evidence and remaining setup. |

## Exact remaining setup

1. In the existing Work task, read WORK_INTEGRATION.md and authorize github.com. Use the secure **cloud-browser** GitHub sign-in/takeover flow and 2FA with a repository writer account, if available for that plan/workspace.
2. Verify an actual Work-originated same-month edit/commit or PR merge, the matching green Actions build/deploy/save and matching live catalog. A connector route is usable only after its actual Contents write succeeds; the current connected integration still returns 403.
3. Only after the real Work test succeeds, give the ready prompt to the existing monthly recurring Work task and test its run. The monthly schedule here only activates already supplied input; missing input retains the prior edition. Sessions/approvals may still need user interaction. If cloud sign-in is unavailable, use owner upload or a separately authorized/tested connected local executor, and label publication accordingly.

Live website: https://serhii-moskalenko.github.io/family-events/


## Farm expansion verified — October 15, 2026

[PR #3](https://github.com/serhii-moskalenko/family-events/pull/3) added five farm programs: Berry Patch Farms, Big Springs Farms, Yahoo Farm, Scottsdale Farms and Pettit Creek Farms. The catalog now contains 19 event records and six distinct verified farm venues including Cagle’s Farm. New farm dates begin October 15 or the next scheduled opening and remain within October coverage. Berry Patch ends October 25; Pettit Creek closes at 16:00 on October 31. Existing unrelated records and stable IDs were preserved.

US Census address geocoding and the configured Canton center give straight-line distances of 9.3, 8.3, 10.9, 10.4 and 18.9 miles for the five additions respectively. Cagle’s Farm was also rechecked: its measured distance is 5.3 miles; the official ticket page discloses $1.55 per-ticket online fees, so four $15 tickets total $66.20 online before optional extras. Its base family price and rating remain unchanged. Prices do not affect ratings.

Primary organizer pages supplied hours/prices and conditions. Where a current page omits the year, dated 2026 reporting or the organizer’s October 2026 article/feed supplied corroboration; this is disclosed in the cards. Big Springs’ HTTP-only official site was read directly, and its card links to the working official Georgia tourism HTTPS listing. The registry and verified farm-address list were expanded without enabling untested adapters. A real source scan fetched 19 of 21 configured pages and found 155 candidate links; two bot-access failures were reported, rather than treated as no events.

[Production run 38754195169](https://github.com/serhii-moskalenko/family-events/actions/runs/38754195169) for merge commit 4cb75c7 passed schema validation, **52 Node tests**, build, **17 browser tests**, deployment and save-catalog. Exact live catalog SHA256: `8f5bdec2d2437834d88adee18faa81bd5699ddb8ef4182bcb11d80def67f5f58`. The generated output was saved by the workflow in 6277177.

A separate Chromium check against the live Pages URL confirmed all six farm cards under the category and local-farms filter, official-source links, separate price/extra-cost text, four-component ratings, no 390px horizontal overflow, and a real Pettit Creek Halloween ICS with 16:00 America/New_York ending time. Added state survived reload. No browser page errors occurred. This was local Codex editorial research and authenticated GitHub publication; no new claim about unattended Work cloud execution is made.
