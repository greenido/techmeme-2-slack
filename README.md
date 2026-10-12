<div align="center">

# 📰 Techmeme Daily Digest Bot

<img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
<img src="https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white" alt="Slack" />
<img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
<img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />

**The 10 most important tech stories of the day, picked and summarized by Gemini, delivered to Slack and/or Telegram every morning** ☕

</div>

## How it works

1. **Scrape** Techmeme's ranked homepage: one item per story cluster, with an excerpt and how many related articles cover it.
2. **Skip** stories sent in the last 14 days (`data/sent-stories.json`), and post at most one digest per day.
3. **Pick and summarize** with Gemini, which returns JSON: the headline number, a category, an emoji, a title and a summary.
4. **Validate**: every link is taken from the scraped page (never from the model), and stories with numbers that don't appear in their headline are dropped.
5. **Post**, grouped by category, as a Slack Block Kit message and Telegram HTML (split into parts if needed), then record the stories in the history file.

## Setup

Requires Node.js 22+, a [Gemini API key](https://aistudio.google.com/app/apikey), and at least one delivery target.

```bash
git clone <your-repo-url>
cd techmeme-cron
npm install
cp .env.example .env   # then fill in your values
```

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-latest                # optional
GEMINI_FALLBACK_MODEL=gemini-flash-lite-latest  # optional; "none" disables

# Configure at least one delivery target
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C1234567890
TELEGRAM_BOT_TOKEN=1234567890:your-telegram-bot-token
TELEGRAM_CHAT_ID=@your_channel_username         # or -1001234567890 for a private channel
```

<details>
<summary><b>Slack: bot token and channel ID</b></summary>

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps), add the `chat:write` bot scope, install it, and copy the **Bot User OAuth Token** (`xoxb-…`).
2. Invite the bot to the channel (`/invite @your-bot`).
3. Right-click the channel → **Copy link**. The ID is the last part: `https://yourworkspace.slack.com/archives/C1234567890`.

</details>

<details>
<summary><b>Telegram: bot, channel and chat ID</b></summary>

1. In [@BotFather](https://t.me/BotFather), run `/newbot` and copy the token into `TELEGRAM_BOT_TOKEN`.
2. Create a channel, then add the bot under **Administrators** with permission to **Post Messages**.
3. Set `TELEGRAM_CHAT_ID` to the **channel**, not the bot:
   - **Public channel:** its username, e.g. `@techmeme_digest`.
   - **Private channel:** post a message in the channel, then run `curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"` and copy `channel_post.chat.id` (it starts with `-100`).
4. Check that the bot can post:

   ```bash
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
     -H "Content-Type: application/json" \
     -d '{"chat_id": "'"$TELEGRAM_CHAT_ID"'", "text": "Techmeme digest bot test message"}'
   ```

If both Slack and Telegram are configured, each run posts to both.

</details>

## Usage

```bash
npm run start:dry-run   # full run, prints the Slack and Telegram messages instead of posting
npm start               # post the digest (skipped if one was already sent today)
npm start -- --force    # post even if a digest was already sent today
npm run start:telegram  # post to Telegram only
npm test                # unit tests (no network, no credentials)
npm run test:telegram   # send a real test message to TELEGRAM_CHAT_ID
node list-models.js     # list the Gemini models your key can use
```

## Deploying with GitHub Actions

[daily-digest.yml](.github/workflows/daily-digest.yml) runs daily at **10:00 UTC**. GitHub often starts scheduled runs hours late, so the early time aims for delivery during the US morning. To run it manually, use **Actions → Daily Tech Digest → Run workflow**; tick **force** to post again on a day that already has a digest.

Add these under **Settings → Secrets and variables → Actions**:

| Secret | |
|---|---|
| `GEMINI_API_KEY` | Required |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` | For Slack delivery |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | For Telegram delivery |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Optional model overrides |
| `ALERT_TELEGRAM_CHAT_ID` | Optional. A separate chat that is messaged when a run fails |

Each run:
- runs the tests, then posts the digest
- shows the digest on the run's summary page
- commits the updated `data/sent-stories.json` (one small bot commit per day). The daily commit also keeps the repository active, so GitHub doesn't disable the schedule after 60 days without commits.

[ci.yml](.github/workflows/ci.yml) runs a syntax check, the tests and `npm audit` on Node 22 and 24 for every pull request and push to `main`. Dependabot opens monthly update PRs for npm packages and GitHub Actions.

<details>
<summary><b>Running from a local cron job instead</b></summary>

```cron
0 8 * * * cd /path/to/techmeme-cron && /path/to/node index.js >> cron.log 2>&1
```

Cron doesn't inherit your shell's `PATH`, so use the absolute path from `which node`. `cron.log` is ignored by git. If GitHub Actions is also posting, run only one of them, or set `HISTORY_FILE` to a path outside the repo for local runs.

</details>

## Configuration

### Models

| Model | |
|---|---|
| `gemini-flash-lite-latest` | Cheapest; the default fallback |
| `gemini-flash-latest` | Default: fast and balanced |
| `gemini-pro-latest` | Highest quality, slower |

The model must support structured JSON output. If the primary model fails after retries, or returns output that can't be used, `GEMINI_FALLBACK_MODEL` is tried once.

### Story history

- `data/sent-stories.json` (path set by `HISTORY_FILE`) keeps 14 days of delivered stories.
- Repeat URLs are dropped before Gemini sees them.
- The last 3 days of titles are listed in the prompt as already covered.
- A run that finds a digest already sent today exits without posting, unless `--force` is passed.
- Dry runs skip the same-day guard and never write the file.

### Reliability

- **Techmeme and Telegram:** requests time out after 15s and are retried up to 3 times on network errors, 429s and 5xx responses. Telegram's `retry_after` is honored.
- **Gemini:** each attempt times out after 90s, with up to 3 attempts per model.
- **Slack:** uses the SDK's five-retries-in-five-minutes policy.
- **Delivery:** each target is attempted even if another fails, and the run exits non-zero if any target failed.

### Prompt and formatting

- **Prompt:** `buildPrompt()` in [digest.js](digest.js) sets the selection criteria.
- **Response shape:** `DIGEST_SCHEMA` in the same file.
- **Categories:** `CATEGORIES` in the same file.
- **Formatting:** [slack.js](slack.js), [telegram.js](telegram.js) and [markdown.js](markdown.js), so the prompt never needs to know about markup.

## Troubleshooting

- **"Invalid environment configuration":** `GEMINI_API_KEY` is missing, or a delivery target is only half configured. Each target needs both of its variables.
- **Telegram "chat not found" / "forbidden":** the bot isn't an admin of the channel, or `TELEGRAM_CHAT_ID` is the bot's username rather than the channel's.
- **"No items fetched from Techmeme":** the page markup may have changed. The scraper falls back to plain `.ii` items. Run `npm test` and compare [the fixture](test/fixtures/techmeme-home.html) with the live page.
- **"Dropped … numbers not in the headline":** Gemini restated a figure (e.g. "1,300M" for "$1.3B"). The story is skipped, so that day's digest has fewer than 10 stories.
- **Nothing posted, "already delivered today":** the same-day guard. Use `--force`, or **force** on a manual workflow run.
- **Scheduled runs stopped:** check that the workflow is enabled in the Actions tab and that the secrets are set.

## License

MIT
