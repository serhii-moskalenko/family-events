# Integration test evidence

Implementation date: October 10, 2026.

## Confirmed locally

- Existing account: `serhii-moskalenko`, GitHub CLI authenticated with OS keyring credentials.
- Repository: `serhii-moskalenko/family-events`; Pages publishing source: GitHub Actions.
- GitHub connector read: repository metadata returned owner/push permissions. Connector write: `create_branch` returned HTTP 403 `Resource not accessible by integration`. No branch was created by that failed call.
- 40 unit/parser/publishing tests passed, including invalid JSON, calendar dates, DST gaps/folds, rating limits, price independence, duplicate detection, atomic preservation, stale rollback prevention, fixed target repository and live hash verification.
- 13 Playwright tests passed, including mobile layout, themes, card details, category/farm filtering, sorting/ratings, downloaded ICS, rejection confirmation, restore, storage and new weekly reset.
- Weekly input check, publisher dry run and production build passed.

## Deployment and remote publishing

Remote deployment and live publishing receipts will be recorded here after the real runs. The initial seven-day catalog uses seven already published records for October 10–16; source verification times and scores were preserved. This is a migration, not newly fabricated or freshly researched data.

## Not confirmed

An actual run from the user's existing local Scheduled Task. The task was not changed or invoked. Its owner must add the documented publisher instructions and test Run now in that task's real environment. Local CLI success and GitHub Actions success alone do not prove that Scheduled Task can publish unattended. Machine availability, task permissions and continued GitHub authorization remain prerequisites.
