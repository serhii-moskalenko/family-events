# Сімейні вихідні · Canton

Ukrainian family-event catalog: https://serhii-moskalenko.github.io/family-events/

The existing static app retains mobile layout, light/dark themes, expandable cards, four-component ratings, category and local-farm filters, rating/date/price sorting, Added/Rejected tabs, confirmation/restore, persistent selections and DST-aware Apple Calendar downloads.

## Monthly catalogs

Authoritative inputs: `content/monthly/YYYY-MM.json`. Schema: `content/monthly.schema.json`. Generated website output: `public/data/events.json`. October 2026 covers October 10–31; subsequent catalogs cover the full month in America/New_York. Future catalogs can be staged early. The build chooses the newest submitted month at or before the current New York month; missing new months retain the previous edition, with expired events hidden from «Усі». Same-month selections persist; a valid different-month publication resets them.

The initial October input migrates 14 previously published records, quarantining one parser-inferred all-day event until its time is verified, preserving verification times and distinguishing legacy editorial and discovery provenance. This is not a new Work research publication. Archived discovery data lives in `content/discovery/2026-10.snapshot.json`. No OpenAI API or autonomous AI research pipeline is used.

See [the exact Work handoff](docs/WORK_INTEGRATION.md) for schema, publishing, authentication, failure diagnosis and a ready prompt. **Work publication is not operationally verified:** the authenticated connector branch test returned 403. Cloud Browser publication remains a documented candidate pending a real Work sign-in/PR/deployment test.

## Development and publication

```sh
npm ci
npm run validate
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

The build validates every input, calculates `round((children + comfort + distance + uniqueness) / 75 * 100)`, and atomically writes generated JSON. Prices cannot affect scores. Unknown admission, family price and end times remain unknown. End times are omitted from ICS when unverified; timezone rules cover EDT/EST.

Main pushes and manual dispatch validate, test, build and deploy through `.github/workflows/pages.yml`. PRs run the same checks without deployment. A first-day schedule activates already submitted catalogs only; it does no research or discovery. Invalid input stops before output replacement and deployment, keeping prior live data available. The workflow verifies that the live JSON exactly matches the uploaded artifact. After successful tests/deployment, the Actions token saves only generated public/data/events.json with [skip ci], guarded against concurrent main changes. This does not trigger recursive deployments. Pages uses GitHub Actions and its existing URL.

Legacy discovery remains available as a separate research aid:

```sh
npm run scan
npm run refresh
```

These commands write to `reports/` only. Their parsers and tests remain, but they do not modify authoritative monthly input or published output. Work must independently review discoveries before submitting a catalog.

Authorized local CLI fallback (not proof of Work cloud access):

```sh
npm run publish:monthly -- content/monthly/2026-10.json --dry-run
npm run publish:monthly -- content/monthly/2026-10.json --wait
```

Supply `submittedAt` with the actual UTC preparation timestamp. The helper validates the current New York month and a preparation timestamp within 24 hours, uses the existing file SHA to prevent conflicting edits, and verifies the exact workflow and live generated hash. See [integration evidence](docs/integration-results.md).
