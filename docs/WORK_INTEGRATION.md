# Monthly publishing from ChatGPT Work

## Status and authentication evidence (October 10, 2026)

The app supports validated monthly input and GitHub Pages publication. **Unattended publication from ChatGPT Work is not verified or operational.**

Real authenticated GitHub connector `create_branch` and `update_file` requests (the latter targeting the exact monthly file on the implementation branch) returned **403 Resource not accessible by integration**. Exposing write tools does not prove the GitHub installation has permission. This session's local GitHub CLI authentication is separate from Work's connector and cloud browser. Successful CLI deployment proves the website pipeline, not Work access.

The simplest candidate is GitHub's authenticated web editor in Work's Cloud Browser, with no OpenAI API subscription or new endpoint. [Official browser documentation](https://learn.chatgpt.com/docs/browser) describes separate cloud sessions and secure website sign-in on eligible plans; availability depends on plan, rollout and workspace. It excludes website sign-in in Enterprise/Edu. It does **not** prove this account can edit GitHub or that a scheduled run can commit without confirmation. That requires a real Work test. Some older documentation describes signed-out-only cloud browsing, so verify the actual account capability rather than assuming availability.

Never paste passwords, 2FA codes, PATs, private keys or cookies into chat or repository files. Use Work's secure sign-in flow for GitHub, with an account authorized to write `serhii-moskalenko/family-events`. Work does not inherit desktop GitHub sign-in. Connector access is governed by the connected GitHub installation's repository access and permissions; inspect/reconnect it if write permission becomes available, then repeat a harmless branch/file test before switching mechanisms.

Fallback: Work produces the JSON as an artifact, and the owner uploads it through GitHub's web editor. Authenticated desktop Work with an authorized local GitHub session is another candidate, but has not been tested as a recurring workflow here. No unauthenticated endpoint or API-key service is installed.

## Authoritative files and schema

Work updates **only `content/monthly/YYYY-MM.json`**. October is `content/monthly/2026-10.json`. These are authoritative. `public/data/events.json` is generated during the build; do not edit it. `content/discovery/2026-10.snapshot.json` archives the prior publication and its discovery provenance. `config/*`, the discovery scripts and `reports/*` are separate research aids. Discovery never writes monthly input or public catalog output.

The exact machine-readable JSON Schema is [`content/monthly.schema.json`](../content/monthly.schema.json). It rejects unknown properties. Additional semantic validation lives in `scripts/catalog.mjs`:

- `schemaVersion`: integer `1`; `catalogId`: `YYYY-MM`, matching the filename; `timezone`: `America/New_York`.
- `coverage`: `start` and `end` ISO dates. October 2026 must cover `2026-10-10`–`2026-10-31`; other months cover day 1 through their actual last day, including leap years.
- `provenance`: `producer` is `chatgpt-work` for Work submissions; `notes` is a nonempty string describing research and omissions. `migration` is reserved for the initial inherited catalog.
- `events`: array, including an honestly empty array if no verified events qualify.
- Each event requires `id`, `name`, Ukrainian `description`, `category`, `icon`, `venue`, full `address`, `city`, `source`, `mapsUrl`, `distanceLabel`, `admissionPrice`, `familyPrice`, `priceNote`, `additionalCosts`, `comfortNote`, `uncertaintyNotes`, `origin`, `verifiedAt`, `points`, `sessions`.
- IDs are unique lowercase letters/digits separated by hyphens. Retain the exact existing ID for the same event on edits; do not derive IDs from array order, rating, price or translated wording. Generation never rewrites IDs. Repeated occurrences use one event with multiple sessions. Cross-month IDs may remain the same; month ID resets user state.
- Categories: `farm`, `festival`, `church`, `market`, `culture`, `library`.
- `city`, `admissionPrice` (verified price/conditions as text), and `additionalCosts` may be `null`. `familyPrice` is USD numeric total or `null`; zero means verified free family admission. Explain the family composition used in `priceNote`; do not assume children's ages. Missing values require nonempty `uncertaintyNotes`.
- `source` is the official HTTPS source; `mapsUrl` is an HTTPS Google Maps URL. City is unknown (`null`) when unverified. `verifiedAt` is an ISO timestamp with an explicit offset or `Z`; preserve actual verification time, not publication time.
- `origin` is `chatgpt-work` for each Work event. Work catalogs cannot contain `automation`. `legacy-editorial` and `legacy-discovery` preserve inherited October provenance, without claiming Work researched it.
- `points` contains exactly four integers: `children` 0–30, `comfort` 0–20, `distance` 0–15, `uniqueness` 0–10. Work calculates these. Do not submit a final rating or cost component. Generation computes `round(sum / 75 * 100)` independently of all prices.
- `sessions` is nonempty. Each session has `start` (`YYYY-MM-DDTHH:mm`, New York wall time) and `end` (same format or `null`). Start must be within coverage; end must follow start and remain within coverage. Invalid dates, duplicate starts and nonexistent spring DST times are rejected. Unknown end is `null`, never an invented duration. For the repeated fall-back hour, prefer unambiguous verified times or explain ambiguity in notes.
- Optional fields: `verification`, `ratingNote`, `sourceExcerpt`, `ratingMethod`; `farm` requires `name` and official HTTPS `source` and only applies to verified farm venues. Inherited `automation` is permitted only for migration catalogs.

Example (synthetic; replace with verified facts, do not publish this example):

```json
{
  "schemaVersion": 1,
  "catalogId": "2026-11",
  "timezone": "America/New_York",
  "coverage": {"start": "2026-11-01", "end": "2026-11-30"},
  "provenance": {"producer": "chatgpt-work", "notes": "Official-source research; coverage is best effort."},
  "events": [{
    "id": "example-family-day-2026",
    "name": "Приклад сімейного дня",
    "description": "Приклад українського опису; замініть перевіреними фактами.",
    "category": "culture",
    "icon": "🎨",
    "venue": "Example venue",
    "address": "Verified full street address, Canton, GA ZIP",
    "city": "Canton",
    "source": "https://example.org/official-event",
    "mapsUrl": "https://www.google.com/maps/search/?api=1&query=verified-address",
    "distanceLabel": "Відстань не підтверджено",
    "admissionPrice": null,
    "familyPrice": null,
    "priceNote": "Вартість входу не підтверджено.",
    "additionalCosts": null,
    "comfortNote": "Умови доступності потребують уточнення.",
    "uncertaintyNotes": ["Ціна, додаткові витрати та час завершення не підтверджені."],
    "origin": "chatgpt-work",
    "verifiedAt": "2026-10-10T17:00:00Z",
    "points": {"children": 20, "comfort": 10, "distance": 0, "uniqueness": 5},
    "sessions": [{"start": "2026-11-07T10:00", "end": null}]
  }]
}
```

## Exact browser publishing procedure (candidate, pending Work test)

1. In Work, open `https://github.com/serhii-moskalenko/family-events`. Approve website access if requested. Complete GitHub sign-in using the secure sign-in form; satisfy 2FA yourself. Confirm repository write access. If Work cannot sign in or GitHub blocks it, stop and provide the JSON for owner upload.
2. Read this document, the schema and the existing target month's input from `main`. Preserve same-month event IDs and archive months. Research official sources and prepare the complete monthly JSON. Never edit generated public files or workflows.
3. Open `https://github.com/serhii-moskalenko/family-events/new/main/content/monthly` for a new month, or the existing file's Edit button for a same-month update. Set filename `YYYY-MM.json` and paste the complete JSON. Review GitHub's diff.
4. Use **Commit changes → Create a new branch and start a pull request**, with a descriptive unique branch name. Do not force-push. Wait for the **Validate, test and deploy monthly catalog / build** check. A PR tests and builds but does not deploy. If this workflow is absent on main, finish installation first.
5. If validation fails, inspect the Actions log, fix the input on the branch, and wait for the check again. Do not bypass checks or change the schema to fit bad facts. Compare against the latest main before merging so another update is not lost.
6. After green checks and any required user confirmation, merge the PR to `main` through GitHub. This triggers production validation, testing, build and deployment. Direct commits to main also trigger it, but the reviewed PR procedure is preferred. No extra dispatch is required.
7. Open Actions, find the run for the merge commit, and verify both build and deploy are green, including **Verify exact live catalog**. Then open `https://serhii-moskalenko.github.io/family-events/data/events.json` and confirm `catalogId`, `coverage`, provenance and event IDs; open the website and spot-check cards and downloads. A Git commit alone is not proof of publication.
8. Report the PR, commit, Actions run, active month and website. Only then say published. If a future month's PR is merged early, report **staged**, not active: the generator selects the newest submitted month at or before the current New York month. A first-day schedule activates staged content; if delayed, the owner can run Actions → this workflow → Run workflow on main. GitHub may disable schedules after inactivity; manual dispatch or a push also builds. Missing future catalogs keep the previous edition, whose expired events are hidden.

Build failure never deploys an artifact, so the prior live catalog and browser selections remain. Selections persist for all same-month successful updates and reset only after a valid different-month catalog loads. Deployment or post-deploy verification failure requires checking the live site: post-deploy failure can mean the artifact is live but propagation or verification failed; there is no claim of automatic rollback. The workflow writes no commits and cannot trigger recursive deployments. GitHub Pages publishing source must remain **GitHub Actions**.

## Required real Work test

Start a human-initiated Work task using the instruction below. Verify its GitHub secure sign-in, branch creation, a harmless same-month provenance-notes edit, PR check, merge, Pages run and live JSON. Record the actual PR/run and authenticated mechanism. A desktop CLI test or this Codex connector failure is not that test. Afterwards, test a recurring Work run with the same account and website permissions; approvals, session expiry or rollout may still require human intervention. No recurring agent is created by this implementation.

## Ready-to-use instruction for Work

> Research and publish the next Family Events monthly catalog for the requested month, using America/New_York. Read https://github.com/serhii-moskalenko/family-events/blob/main/docs/WORK_INTEGRATION.md and content/monthly.schema.json first. Preserve the existing application and all prior monthly files. Use official sources, Ukrainian descriptions, verified dates/start times, explicit nulls and uncertainty notes. Calculate exactly the four rating components, with no family-cost contribution. October 2026 covers October 10–31; all other months cover their full calendar month. Retain stable IDs on same-event updates. Update only content/monthly/YYYY-MM.json. Use the authenticated GitHub Cloud Browser PR procedure if available; request secure sign-in when needed and never request credentials in chat. A connector that returns 403 is not writable. Wait for green validation/tests, follow required approval, merge, verify the Actions deployment and actual live JSON. If future content is only staged, report it as staged. If authentication, browser capabilities or approval prevent publication, provide the ready JSON and exact blocker; do not claim success or modify generated public data. For the first integration test, only make a harmless same-month provenance-notes edit and record the PR/run/live verification before treating recurring publishing as operational.

## Implementation test evidence

- Local: 35 unit tests and 14 browser tests passed. November data is synthetic test input, not a researched public catalog.
- [Authenticated GitHub Actions invalid-input test](https://github.com/serhii-moskalenko/family-events/actions/runs/38071883063): a children score of 31 failed validation before build or deployment; valid input was restored afterward.
- [Authenticated GitHub Actions valid-input test](https://github.com/serhii-moskalenko/family-events/actions/runs/38071932496): schema validation, all 35 unit tests, build and all 14 browser tests passed on the implementation branch; deployment was intentionally skipped for this non-main run.
- Concurrent changes replaced main with weekly publishing during this task. The monthly implementation is isolated in [PR #1](https://github.com/serhii-moskalenko/family-events/pull/1), pending resolution of that conflicting direction. No monthly deployment or Work cloud publishing success is claimed.
