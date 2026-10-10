# Monthly integration evidence — October 10, 2026

The existing monthly implementation on main was retained and hardened. Authoritative input remains schemaVersion 1 (`coverage`, `provenance`, text admissionPrice, stable IDs); generated public output remains schemaVersion 2. No recurring Work task was created, changed or invoked.

## Local verification

**51 Node tests and 17 mobile Playwright tests passed**, along with the production build and publisher dry run. Coverage includes October 10–31, November 1–30, December/January, leap February, full JSON Schema, price-independent ratings, stable identity guards, duplicate prevention, impossible dates, DST gaps/folds, timestamp order, unknown registration, reproducible hashes, atomic failure preservation, older-month/correction rejection, SHA-leased writes/new month creation, same-month state/migration, new-month reset, mobile themes/cards/filters/sorting/rejection/restore/ICS.

The October migration retains 14 previously published records and their real original source-verification times. One parser-inferred `00:00–23:59` event is quarantined until official hours are verified; the archived original remains in content/discovery/2026-10.snapshot.json. This update does not claim fresh event research.

## Actual connector test

A fresh authenticated `fetch_file` of main's `content/monthly/2026-10.json` succeeded. A sequential `update_file` targeting the same file, its actual blob SHA and identical contents returned **HTTP 403 Resource not accessible by integration** (`FORBIDDEN`). No commit was created. This confirms the connected integration still cannot write this repository in this session; it does not imply every Work account has that limitation.

## Deployment and local publishing

The current live deployment and a real local publisher run will be recorded here after completion. Prior confirmed monthly deployment is recorded in WORK_INTEGRATION.md. Local CLI success must not be described as Work-originated publication.

## Remaining Work acceptance test

The authenticated Cloud Browser GitHub editor is a documented candidate. This local task cannot access the user's separate cloud browser session. In the actual Work task, verify secure GitHub sign-in/write access, make a harmless same-month update, commit/merge, wait for that exact Actions run and compare the live JSON. Record the actual mechanism, commit/run/hash before calling automated Work publication operational. Eligible connected-computer access is an optional separately tested fallback. See [WORK_INTEGRATION.md](WORK_INTEGRATION.md) for complete format, secure setup, procedure and ready-to-use instruction.
