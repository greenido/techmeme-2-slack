<div align="center">

# 📰 Techmeme Daily Digest Bot - v1.0.0

<img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
<img src="https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white" alt="Slack" />
<img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
<img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />

**Your automated daily tech news digest, delivered fresh to Slack and/or Telegram every morning** ☕

[Features](#-features) • [Setup](#-setup) • [Usage](#-usage) • [Deployment](#-deployment-options) • [Configuration](#-configuration)

---

</div>

## 🌟 Features

<table>
<tr>
<td width="50%">

### 🤖 **AI-Powered Intelligence**
- Uses Google's Gemini AI for intelligent story selection
- Cross-references multiple sources (X/Twitter, Reddit, major outlets)
- Prioritizes business impact, AI breakthroughs, and market trends
- Filters out noise and focuses on high-signal content

</td>
<td width="50%">

### 📊 **Smart Aggregation**
- Scrapes latest headlines from Techmeme
- Extracts top 15 stories with fallback strategies
- Merges duplicate stories from multiple sources
- Ranks by real-world significance

</td>
</tr>
<tr>
<td>

### 💬 **Messaging Integrations**
- Slack delivery with rich markdown formatting
- Telegram delivery with channel-friendly HTML formatting
- Clickable links to original articles
- Daily header with formatted date

</td>
<td>

### ⚙️ **Flexible Deployment**
- ☁️ GitHub Actions (recommended)
- 🖥️ Local cron jobs (macOS/Linux)
- 🔧 Manual execution for testing
- Environment-based configuration

</td>
</tr>
</table>

---

## 📋 Prerequisites

Before you begin, ensure you have:

| Requirement | Description |
|------------|-------------|
| **Node.js** | Version 20.x or higher ([Download](https://nodejs.org/)) |
| **Gemini API Key** | Get it from [Google AI Studio](https://makersuite.google.com/app/apikey) |
| **Delivery Target** | Configure at least one destination: Slack or Telegram |
| **Slack Bot Token** | Optional. Create a bot at [api.slack.com](https://api.slack.com/apps) |
| **Slack Channel ID** | Optional. The Slack channel where digests will be posted |
| **Telegram Bot Token** | Optional. Create a bot via [@BotFather](https://t.me/BotFather) |
| **Telegram Chat ID** | Optional. The Telegram channel username or numeric chat ID |

---

## 🚀 Setup

### 1️⃣ Clone and Install

```bash
git clone <your-repo-url>
cd techmeme-cron
npm install
```

### 2️⃣ Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from example template
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp    # Or gemini-pro-latest

# Configure at least one delivery target.

# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C1234567890          # Your channel ID

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:your-telegram-bot-token
TELEGRAM_CHAT_ID=@your_channel_username  # Or -1001234567890 for a private channel
```

<details>
<summary>📝 <b>How to get your Slack Channel ID</b></summary>

1. Right-click on your Slack channel
2. Select "Copy link"
3. The channel ID is the last part: `https://yourworkspace.slack.com/archives/C1234567890`
4. In this example: `C1234567890` is your channel ID

</details>

<details>
<summary>📣 <b>How to create a Telegram channel and connect the bot</b></summary>

### 1. Create a Telegram bot with BotFather

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Run `/newbot`.
3. Enter a display name for the bot.
4. Enter a unique username that ends with `bot`.
5. Copy the bot token that BotFather returns.
6. Save that token as `TELEGRAM_BOT_TOKEN`.

Example token format:

```text
1234567890:AAExampleTelegramBotTokenHere
```

### 2. Create the Telegram channel that will receive the digest

1. In Telegram, click the new message icon.
2. Choose **New Channel**.
3. Enter the channel name and optional description.
4. Choose whether the channel should be **Public** or **Private**.
5. Finish channel creation.

### 2.5. Understand the two Telegram values you must configure

These two environment variables are easy to confuse:

- `TELEGRAM_BOT_TOKEN` is the secret token returned by BotFather for your bot
- `TELEGRAM_CHAT_ID` is the destination where the digest will be posted

`TELEGRAM_CHAT_ID` is **not** your bot username.

For example, if your bot username is `@Technology_top_news_bot`, that value belongs to the bot itself and should **not** be used as `TELEGRAM_CHAT_ID` unless you somehow created a channel with that exact public username and want to post there.

In practice, `TELEGRAM_CHAT_ID` should be one of these:

- a public channel username such as `@techmeme_digest`
- a numeric channel ID such as `-1001234567890`

### 3. Add the bot to the channel as an administrator

1. Open the new channel.
2. Click the channel name at the top.
3. Go to **Administrators**.
4. Choose **Add Admin**.
5. Search for your bot by username.
6. Grant permission to **Post Messages**.

For this project, the bot only needs to post messages. You do not need to grant broader moderation permissions.

### 4. Decide what to use for `TELEGRAM_CHAT_ID`

You have two working options:

#### Option A: Public channel username

If your channel is public and has a username like `@techmeme_digest`, you can use that directly:

```env
TELEGRAM_CHAT_ID=@techmeme_digest
```

This is the simplest setup.

How to set the public channel username:

1. Open the channel in Telegram.
2. Go to the channel profile or edit screen.
3. Set a public link or username for the channel.
4. Copy that channel username, including the leading `@`.
5. Save that value as `TELEGRAM_CHAT_ID`.

Use the **channel username**, not the bot username.

#### Option B: Numeric chat ID for a private channel

If the channel is private, use the numeric chat ID.

1. Make sure the bot is already an admin in the channel.
2. Post at least one message in the channel after adding the bot.
3. Open this URL in your browser, replacing the token:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

You can also use `curl`:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
```

1. Find the `channel_post` object in the JSON response.
2. Inside it, find `chat.id`.
3. Copy the value, which typically looks like `-1001234567890`.
4. Save it as `TELEGRAM_CHAT_ID`.

Example snippet:

```json
{
   "channel_post": {
      "chat": {
         "id": -1001234567890,
         "title": "Daily Tech Digest",
         "type": "channel"
      }
   }
}
```

In that case, use:

```env
TELEGRAM_CHAT_ID=-1001234567890
```

If `getUpdates` returns an empty list, send another fresh message in the channel and try again. The bot only receives channel updates after it has access to the channel.

If you see updates for private chats with the bot but not for your channel, double-check these points:

1. The bot was added to the channel as an admin.
2. A new message was posted in the channel after the bot was added.
3. You are copying `channel_post.chat.id`, not `message.chat.id` from a private conversation.
4. The value starts with `-100`, which is typical for Telegram channels.

### 5. Verify the bot can post before running the digest

Use a direct Telegram API call to test delivery:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
   -H "Content-Type: application/json" \
   -d '{
      "chat_id": "'"$TELEGRAM_CHAT_ID"'",
      "text": "Techmeme digest bot test message"
   }'
```

If that succeeds, the project can post daily digests to the same channel.

If it fails with `chat not found` or `forbidden`, the most common causes are:

1. `TELEGRAM_CHAT_ID` points to the bot username instead of the channel username or numeric channel ID.
2. The bot is not an admin in the target channel.
3. The numeric channel ID was copied from the wrong object in `getUpdates`.

### 6. Final `.env` example for Telegram-only delivery

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
TELEGRAM_BOT_TOKEN=1234567890:AAExampleTelegramBotTokenHere
TELEGRAM_CHAT_ID=@techmeme_digest
```

### 7. Optional: use Slack and Telegram at the same time

If you keep both Slack and Telegram variables in `.env`, the script will post the same digest to both destinations in a single run.

</details>

---

## 🎯 Usage

### Testing Locally

Run the script manually to verify everything works:

```bash
npm start
# or
node index.js
```

If both Slack and Telegram are configured but you want to send only to Telegram for a run:

```bash
npm run start:telegram
# or
node index.js --telegram-only
```

You should see detailed console output:

```text
═══════════════════════════════════════════════════════════════════════════
🚀 STARTING TECHMEME DIGEST BOT
═══════════════════════════════════════════════════════════════════════════
✓ Environment variables validated successfully
✓ Delivery targets configured: Slack, Telegram
✓ Gemini AI client initialized (Model: gemini-2.0-flash-exp)
✓ Slack client initialized (Channel: C1234567890)
✓ Telegram delivery configured (Chat: @techmeme_digest)

📡 Fetching content from Techmeme...
✓ Successfully extracted 15 headlines
🤖 Generating summary with Gemini AI...
✓ Received response from Gemini (2.34s)
📤 Posting to Slack...
✅ Successfully posted to Slack!
📤 Posting to Telegram...
✅ Successfully posted to Telegram!
```

---

## 🔄 Deployment Options

### ☁️ Option 1: GitHub Actions (Recommended)

**Automated, serverless, zero maintenance** – runs on GitHub's infrastructure for free!

#### Setup Steps:

1. **Push your code to GitHub** (if not already done)

2. **Add Repository Secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret" and add:

   | Secret Name | Description |
   |------------|-------------|
   | `GEMINI_API_KEY` | Your Google Gemini API key |
   | `GEMINI_MODEL` | Model name (e.g., `gemini-2.0-flash-exp`) |
   | `SLACK_BOT_TOKEN` | Optional. Your Slack bot token |
   | `SLACK_CHANNEL_ID` | Optional. Your Slack channel ID |
   | `TELEGRAM_BOT_TOKEN` | Optional. Your Telegram bot token |
   | `TELEGRAM_CHAT_ID` | Optional. Telegram channel username or numeric chat ID |

   Add the secrets for at least one delivery target.

3. **The workflow is already configured!**
   - Located at [.github/workflows/daily-digest.yml](.github/workflows/daily-digest.yml)
   - Runs automatically at **8:00 AM PST (4:00 PM UTC)** every day
   - Can also be triggered manually from the Actions tab

4. **Monitor execution:**
   - Go to the "Actions" tab in your GitHub repository
   - View logs and status of each run

#### Schedule Configuration

The workflow uses cron syntax to schedule runs:

```yaml
schedule:
  # 8:00 AM PST = 4:00 PM UTC (PST is UTC-8)
  - cron: '0 16 * * *'
```

To change the schedule, modify the cron expression in [daily-digest.yml](.github/workflows/daily-digest.yml).

<details>
<summary>🕐 <b>Cron Syntax Quick Reference</b></summary>

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

Examples:
- `0 16 * * *` → Every day at 4:00 PM UTC
- `0 8 * * 1-5` → Weekdays at 8:00 AM UTC
- `0 */6 * * *` → Every 6 hours

</details>

---

### 🖥️ Option 2: Local Cron Job (macOS/Linux)

For running on your local machine or server:

#### macOS Setup:

1. **Find your Node.js path:**
   ```bash
   which node
   # Example output: /usr/local/bin/node
   ```

2. **Open crontab editor:**
   ```bash
   crontab -e
   ```

3. **Add the following line** (adjust paths to your system):
   ```cron
   0 8 * * * cd /Applications/MAMP/htdocs/techmeme-cron && /usr/local/bin/node index.js >> /Applications/MAMP/htdocs/techmeme-cron/cron.log 2>&1
   ```

   This will:
   - Run at 8:00 AM daily (`0 8 * * *`)
   - Navigate to the project directory
   - Execute the script with the absolute Node path
   - Log output to `cron.log` for debugging

4. **Save and exit** (in vim: `:wq`)

5. **Verify cron job is active:**
   ```bash
   crontab -l
   ```

#### Linux Setup:

Similar to macOS, but cron is typically managed via `/etc/crontab` or user crontabs.

---

## 🎨 Configuration

### Gemini Model Selection

The bot supports various Gemini models. Choose based on your needs:

| Model | Best For | Speed | Quality |
|-------|----------|-------|---------|
| `gemini-2.0-flash-exp` | Fast daily digests | ⚡️⚡️⚡️ | ⭐️⭐️⭐️ |
| `gemini-pro-latest` | Balanced performance | ⚡️⚡️ | ⭐️⭐️⭐️⭐️ |
| `gemini-1.5-pro` | Highest quality | ⚡️ | ⭐️⭐️⭐️⭐️⭐️ |

Set in your `.env` file:
```env
GEMINI_MODEL=gemini-2.0-flash-exp
```

### AI Prompt Customization

The AI prompt can be customized in [index.js](index.js) (lines 170-198) to adjust:
- Story selection criteria
- Formatting preferences  
- Source prioritization
- Summary length and style

---

## 🐛 Troubleshooting

<details>
<summary><b>"Missing required environment variables"</b></summary>

**Cause:** Your `.env` file is missing or incomplete.

**Solution:**
1. Ensure `.env` exists in the project root
2. Verify `GEMINI_API_KEY` is present and that at least one delivery target is fully configured:
   ```bash
   cat .env
   ```
3. If using Slack, make sure both `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are set
4. If using Telegram, make sure both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set
5. Check for typos in variable names
</details>

<details>
<summary><b>Telegram returns "chat not found" or "forbidden"</b></summary>

**Cause:** The bot is not an admin in the channel, or `TELEGRAM_CHAT_ID` is wrong.

**Solution:**
1. Re-check that the bot was added as a channel administrator
2. Verify the chat ID or channel username
3. Test manually with `sendMessage` using the curl command shown above
4. For private channels, re-run `getUpdates` after posting a fresh message in the channel
</details>

<details>
<summary><b>"command not found" in cron</b></summary>

**Cause:** Cron doesn't inherit your shell's PATH.

**Solution:**
- Always use absolute paths in cron commands
- Find Node path: `which node`
- Use that full path in your cron entry
</details>

<details>
<summary><b>"No items fetched from Techmeme"</b></summary>

**Cause:** Techmeme's HTML structure may have changed.

**Solution:**
- The script has built-in fallback selectors
- Check `cron.log` for detailed error messages
- Verify Techmeme is accessible: `curl -I https://techmeme.com`
</details>

<details>
<summary><b>GitHub Actions not running</b></summary>

**Cause:** Repository secrets not configured or workflow disabled.

**Solution:**
1. Verify all secrets are added (Settings → Secrets → Actions)
2. Check that the workflow is enabled (Actions tab)
3. Manually trigger via "Run workflow" button to test
</details>

---

## 📊 Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    📰 Techmeme Digest Bot                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
           ┌──────────────────────────────────────┐
           │   🕐 Trigger (Cron/Manual/Action)    │
           └──────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  📡 Scrape      │            │  ☁️  GitHub     │
    │  Techmeme.com   │            │   Actions       │
    │  (15 stories)   │            │  Scheduler      │
    └─────────────────┘            └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │  🤖 Gemini AI   │
    │  Analyze &      │
    │  Summarize      │
    │  (Top 10)       │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
   │  💬 Format for  │
   │  Slack /        │
   │  Telegram       │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
   │  📤 Post to     │
   │  configured     │
   │  destinations   │
    └─────────────────┘
              │
              ▼
         ✅ Success!
```

---

## 🛠️ Tech Stack

- **Runtime:** Node.js 20.x
- **AI/ML:** Google Gemini 2.0 Flash / Pro
- **Web Scraping:** Axios + Cheerio
- **Messaging:** Slack Web API + Telegram Bot API
- **Automation:** GitHub Actions / Cron
- **Configuration:** dotenv

---

## 📝 License

MIT License - feel free to use and modify for your needs!

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Improve documentation

---

<div align="center">

**Made with ☕ and 🤖 by the power of automation**

⭐ Star this repo if you find it useful!

</div>
