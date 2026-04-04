<div align="center">

# 📰 Techmeme Daily Digest Bot - v1.0.0

<img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
<img src="https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white" alt="Slack" />
<img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />

**Your automated daily tech news digest, delivered fresh to Slack every morning** ☕

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

### 💬 **Slack Integration**
- Beautiful markdown formatting with emojis
- Clickable links to original articles
- Daily header with formatted date
- Clean, scannable bullet-point layout

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
| **Slack Bot Token** | Create a bot at [api.slack.com](https://api.slack.com/apps) |
| **Slack Channel ID** | The channel where digests will be posted |

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

# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C1234567890          # Your channel ID
```

<details>
<summary>📝 <b>How to get your Slack Channel ID</b></summary>

1. Right-click on your Slack channel
2. Select "Copy link"
3. The channel ID is the last part: `https://yourworkspace.slack.com/archives/C1234567890`
4. In this example: `C1234567890` is your channel ID

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

You should see detailed console output:

```
═══════════════════════════════════════════════════════════════════════════
🚀 STARTING TECHMEME DIGEST BOT
═══════════════════════════════════════════════════════════════════════════
✓ Environment variables validated successfully
✓ Gemini AI client initialized (Model: gemini-2.0-flash-exp)
✓ Slack client initialized (Channel: C1234567890)

📡 Fetching content from Techmeme...
✓ Successfully extracted 15 headlines
🤖 Generating summary with Gemini AI...
✓ Received response from Gemini (2.34s)
📤 Posting to Slack...
✅ Successfully posted to Slack!
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
   | `SLACK_BOT_TOKEN` | Your Slack bot token |
   | `SLACK_CHANNEL_ID` | Your Slack channel ID |

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
2. Verify all required variables are present:
   ```bash
   cat .env
   ```
3. Check for typos in variable names
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
    │  Slack with     │
    │  Markdown       │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │  📤 Post to     │
    │  Slack Channel  │
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
- **Messaging:** Slack Web API
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
