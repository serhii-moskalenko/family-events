# Publishing weekly catalogs from the existing local ChatGPT task

Repository: `serhii-moskalenko/family-events` only. Website: https://serhii-moskalenko.github.io/family-events/.

## Integration status and scope

The owner confirmed that the existing Scheduled Task runs locally in the app. The supported publishing path is a local Node.js script invoking the already authorized GitHub CLI, not an HTTP request from a browser and not the failing GitHub connector.

Verified during implementation:

- The connected GitHub account has owner/push permissions and the connector can read repository metadata. Creating a branch through that connector returned `403 Resource not accessible by integration`. Account permissions do not establish the integration token's write permissions.
- GitHub CLI is authenticated as `serhii-moskalenko` using the operating system keyring. GitHub Pages already uses GitHub Actions as its source; no branch rulesets were present at inspection.
- The local script, validation, workflow, UI regression tests and live deployment can be tested independently. See [test results](integration-results.md) for actual run receipts and remaining limitations.

Not verified: a run originating from the user's existing Scheduled Task. That task has not been edited, rescheduled or invoked by this implementation. It must be given the publishing instructions below by the owner, then tested with **Run now** in its actual environment. A successful manual local run or Actions run is not sufficient evidence of unattended execution.

Official OpenAI documentation says local scheduled tasks can use a project folder or worktree, require the machine and app to remain running, and use the task's configured permissions. Web tasks have different access and cannot directly operate in this Mac's folder. Current documentation also permits connected tools in eligible web tasks, subject to app availability, action controls and account scopes; it does not prove that this account's failing GitHub connection can write.

- [Scheduled tasks and local execution](https://learn.chatgpt.com/docs/automations)
- [Connected-account and write-action permissions](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-cloud-security)
- [Custom MCP servers support read/write tools](https://developers.openai.com/api/docs/guides/custom-mcp-server)

No webhook or custom MCP server is deployed or claimed accessible. A remote MCP connection is a possible future cloud publishing route only after hosting, authorization and a real scheduled write test. It is unnecessary for the confirmed local task.

## Exact publishing mechanism

1. The existing task researches official sources and produces a full replacement catalog for the upcoming seven days in New York local dates. A Monday run normally uses Monday through Sunday.
2. It saves the JSON to an ignored local report file, not directly to `public/data/events.json`.
3. It runs the local publisher with `--wait`:

```sh
cd /Users/serhiimoskalenko/Documents/Codex/2026-10-09/codex-build-and-deploy-a-family/work/family-events
mkdir -p reports
# Write the actual researched JSON to reports/weekly-catalog.json first.
node scripts/publish-weekly.mjs reports/weekly-catalog.json --dry-run
node scripts/publish-weekly.mjs reports/weekly-catalog.json --wait
```

The publisher can also run with absolute script and input paths from any directory. It does not stage, commit, push, reset or include other local work. Its repository, branch and destination are fixed in code: **only** `incoming/weekly-catalog.json` on `main` in this repository.

The script validates the submission and rejects old periods, stale publication timestamps, invalid ratings and duplicate occurrences. It reads the latest published catalog and incoming file through `gh api`, then sends one GitHub Contents API request with the current blob SHA. A conflict fails safely; do not blindly retry an older submission. Review the newer catalog first.

GitHub starts `pages.yml` on the resulting push. It validates and stages the incoming JSON, runs unit/parser/publishing tests and browser tests, builds the site, and uploads Pages only after these steps succeed. A newer main commit prevents an older build from deploying. After deployment, the workflow compares the **exact SHA256** of the public JSON with the tested artifact and checks the site HTML. Only then does it save the valid catalog to `public/data/events.json` in a bot commit with `[skip ci]`.

With `--wait`, the publisher waits up to 15 minutes for the workflow associated with its exact submission commit and verifies the public JSON itself. `submitted: true` means only that GitHub accepted the incoming file. `deploymentVerified: true` means the matching workflow and live catalog checks succeeded. Neither means the source facts have been independently re-researched by scripts or that an unattended Scheduled Task run has been tested.

The website remains at the same URL. No separate website server, research workflow or paid AI API is introduced.

## Account permissions and settings

On this Mac no new token is required: existing `gh` authorization has repository write access. Keep credentials in the OS keyring; do not paste them into task prompts, JSON, frontend files or repository secrets unless a future server integration specifically requires it.

If moving the task to another machine:

1. Install Node.js 22+ and GitHub CLI; make this repository and the publisher available locally.
2. Run `gh auth login --hostname github.com --web` as the account allowed to update this repository. Verify with `gh auth status` and a real publisher test.
3. For a fine-grained token alternative, select **only `serhii-moskalenko/family-events`**, grant **Contents: read/write**, and **Actions: read** for the `--wait` status check. Metadata read access is implicit. Future catalog publishing does not edit workflows and does not require Workflows write permission. Store authorization through GitHub CLI's credential mechanism.
4. Keep repository Settings → Pages → Source set to **GitHub Actions**. The workflow's own token uses Contents read in build, Pages write/ID-token write in deploy, and Contents write only in the successful catalog-save job.
5. The local Scheduled Task needs file read/write access to its report and script, command execution and network access to GitHub and research sources. Keep the Mac awake, online and the app running. A task running in a worktree can call the publisher from that worktree or by the absolute path above.

For the GitHub connector, inspect ChatGPT's GitHub app connection/action controls and GitHub Settings → Applications → Installed GitHub Apps → the corresponding OpenAI app. Ensure repository selection includes this repository; if updated write permissions are offered, review and authorize them and reconnect. **Repository selection or reconnecting alone cannot grant an integration a permission its app has not requested.** A write-capable connection needs Contents write, a write action exposed to that task, and task action policies that allow unattended execution. This implementation does not claim that those account-level changes have been made or that the connector write has been fixed.

[GitHub Contents API permissions and blob SHA requirements](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).

## JSON contract

See [complete JSON example with existing real event records](weekly-catalog.example.json). Its historical dates are an example, not data to republish in future weeks.

Required top-level fields:

| Field | Value |
|---|---|
| `schemaVersion` | `2` |
| `cadence` | `"weekly"` |
| `catalogId` | `"week-" + rangeStart`, for example `"week-2026-10-12"` |
| `rangeStart` | First included local date, `YYYY-MM-DD` |
| `rangeEnd` | Inclusive seventh local date: first date + 6 days |
| `publishedAt` | Actual UTC ISO timestamp of preparation, e.g. `2026-10-12T12:00:00.000Z` |
| `timezone` | `"America/New_York"` |
| `events` | Array of 0–250 events |
| `issues` | Array, usually `[]`; optional issue `id` and required `reason` |
| `emptyReason` | Required only for an empty catalog; explain actual reviewed coverage |

Each event uses the existing structure:

- `id`: stable lowercase letters/numbers/hyphens, up to 120 characters. Reuse the ID for the same real event when correcting it.
- `name`, `venue`, `address`, `distanceLabel`, `description`, `priceNote`, `comfortNote`: nonempty strings. Use Ukrainian descriptions; explicitly label unknown facts. Distance must be measured/verified or explicitly unknown.
- `category`: `festival`, `farm`, `church`, `market`, `culture` or `library`. `farm` remains the broad farms/nature category.
- `icon`: one of `🎃 🌽 ⛪ ✳ 🌾 🎭 📚 🎨 🎪 🛍️ 🌳 🎵 🧺`.
- `source`: official HTTPS source URL without embedded credentials. Maps links are generated from the address by the existing frontend.
- `sessions`: 1–14 `{ "start": "YYYY-MM-DDTHH:mm", "end": "YYYY-MM-DDTHH:mm" }` objects in **America/New_York** local wall time. `end` may be `null` if not published. Every start date must be within the seven-day window. Use exact verified occurrences; do not convert a season into invented daily sessions. Nonexistent spring DST times and ambiguous fall DST times are rejected.
- `familyPrice`: a nonnegative USD number for the existing family definition (two adults and two children aged 3+), `0` only when free is confirmed, or `null` when unknown. Explain assumptions and excluded extras in `priceNote`.
- `points`: **exactly** `{ "children": 0–30, "comfort": 0–20, "distance": 0–15, "uniqueness": 0–10 }`. No cost component.
- `verifiedAt`: actual UTC ISO timestamp when the author checked the official source, no later than `publishedAt`. Never replace it merely because a file is uploaded again.
- `verification`: brief description of what the author actually verified. The ingestion script validates structure, not the truth of this assertion.
- Optional `ratingNote`: explain the author's assessment and uncertainty. Optional `ratingMethod`, `sourceExcerpt` and verified `farm: { "name": "…", "source": "https://…" }` provenance are preserved.
- Optional `rating`: if provided, it must exactly equal `Math.round((children + comfort + distance + uniqueness) / 75 * 100)`. Publication computes this from the four points regardless of price.

The pipeline rejects repeated IDs, repeated official-source/start pairs (ignoring common tracking parameters), and repeated normalized name/address/start pairs. Duplicate data does not silently replace a valid record. It cannot recognize every semantic duplicate with different titles and sources; ChatGPT must also deduplicate its research.

Only display fields are published; arbitrary extra metadata is dropped. Do not put secrets or private user data anywhere in the submission: incoming JSON itself is committed to this **public** repository.

## Failure and recovery

- Local invalid JSON or validation failure makes **no GitHub write**.
- Invalid incoming data committed by another route causes CI to fail before Pages upload. The previous public catalog and published catalog file stay intact. The incoming draft can remain invalid on main; replace it with a valid submission or restore the previous valid incoming file before further deployments.
- Source outages are a research failure, not evidence of an empty catalog. Keep the previous catalog rather than fabricate facts or submit an empty array without an explained successful review.
- A submission with an older seven-day start or an older timestamp for the same window is rejected. To restore records in the same week, submit a corrected catalog with a real new preparation timestamp, preserving actual source verification times.
- A CI failure after a valid submission is not success. Review the run log, fix the cause, then rerun the workflow or submit the corrected catalog. Identical data with `--wait` verifies the live bytes and reports failure if it was never deployed.
- Selection reset depends on the successfully displayed `catalogId`, not the computer clock. Same-week corrections keep Added/Rejected choices; the next weekly catalog resets them. Light/dark preference is preserved.

## Instructions to add to the existing task yourself

Keep the task's own research instructions. Add the local path, JSON contract and the two publisher commands above. Require it to report the commit/workflow URL and `deploymentVerified`, and to report failure rather than claim publication after only writing a JSON file. Do not edit application source, workflows, other repositories or task schedules.

Then run that existing task manually once from its Scheduled page. Confirm its tool trace includes the real publisher command, GitHub submission commit, successful workflow and live hash verification. Only that run can establish the actual Scheduled Task → local command → GitHub → Pages integration for your account and task permissions.
