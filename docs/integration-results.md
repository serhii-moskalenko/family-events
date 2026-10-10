# Integration test evidence

Implementation date: October 10, 2026.

## Confirmed locally

- Existing account: `serhii-moskalenko`, GitHub CLI authenticated with OS keyring credentials.
- Repository: `serhii-moskalenko/family-events`; Pages publishing source: GitHub Actions.
- GitHub connector read: repository metadata returned owner/push permissions. Connector writes: `create_branch` and `update_file` both returned HTTP 403 `Resource not accessible by integration`. No branch was created by that failed call.
- 43 unit/parser/publishing tests passed, including invalid JSON, calendar dates, DST gaps/folds, rating limits, price independence, duplicate detection, atomic preservation, stale rollback prevention, fixed target repository and live hash verification.
- 13 Playwright tests passed, including mobile layout, themes, card details, category/farm filtering, sorting/ratings, downloaded ICS, rejection confirmation, restore, storage and new weekly reset.
- Weekly input check, publisher dry run and production build passed.

## Deployment and remote publishing

- Initial implementation commit: [`6a4f29c`](https://github.com/serhii-moskalenko/family-events/commit/6a4f29ce05712e2ceca9fe74b8cc7fe02a48f0ab). [Initial deployment](https://github.com/serhii-moskalenko/family-events/actions/runs/38071583652) succeeded. Live catalog: `week-2026-10-10`, seven events for October 10–16; SHA256 `7904e911d46389c564a1e99bc9239114d3ab85a4757b1bb993ce01ba554b864c`.
- Real negative test: an incoming-only submission with children's-interest score **31/30** was deliberately sent through the Contents API, bypassing the local validator to exercise CI. [Run 38071715246](https://github.com/serhii-moskalenko/family-events/actions/runs/38071715246) failed at ingestion with `Catalog rejected: Invalid rating`. Deploy/save jobs were skipped. The published repository blob remained `895bc02e9eedbe8acd594791ce89349439e7f9f8`; live SHA256 remained exactly the initial value. The invalid draft was subsequently replaced by the valid publisher submission below.
- Actual local publisher test: `node scripts/publish-weekly.mjs reports/weekly-catalog.json --wait` created [commit `e42bfd8`](https://github.com/serhii-moskalenko/family-events/commit/e42bfd82a51e852a4e34baf8cb237115a1da6de4). [Run 38071793724](https://github.com/serhii-moskalenko/family-events/actions/runs/38071793724) passed build, deploy and save-catalog. The publisher exited 0 and returned `deploymentVerified: true`. Live SHA256: `ab4e1cbd6b5297e9e1eb9345b7e17f44fe925f8c40fa3860e884a97e56d250d9`.
- The published update retains the same seven events and original source-verification times and ratings. It adds a price-independent rating explanation to the farm card and a real new preparation timestamp; it does not invent new facts or claim new source research.
- A headless Chromium check against the **real GitHub Pages URL** confirmed the weekly heading, no overflow at 390px, theme switching, an actual ICS download, Added state after reload and zero page errors. A separate live check confirmed the updated farm note, score **84**, displayed family price **$60**, and exactly four rating components.

The initial seven-day catalog was migrated from already published records. The research, prices and source verification were not refreshed during integration preparation.

## Not confirmed

An actual run from the user's existing local Scheduled Task. The task was not changed or invoked. Its owner must add the documented publisher instructions and test Run now in that task's real environment. Local CLI success and GitHub Actions success alone do not prove that Scheduled Task can publish unattended. Machine availability, task permissions and continued GitHub authorization remain prerequisites.
