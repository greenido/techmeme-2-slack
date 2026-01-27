# Techmeme Digest Bot

This script fetches the top news from Techmeme, uses Google's Gemini to summarize the top 10 stories, and posts them to a specified Slack channel.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed.
2.  **API Keys**: You will need the keys listed below.

## Setup

1.  **Install Dependencies:**
    Navigate to this folder and run:
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a file named `.env` in this directory.
    Copy the contents of `.env.example` into it and fill in your real keys.

    ```bash
    cp .env.example .env
    # Now edit .env with your favorite editor
    nano .env
    ```

## Running Manually

To test if it works:
```bash
node index.js
```

## Setting up a Cron Job (macOS)

To run this script automatically (e.g., every morning at 8:00 AM):

1.  Open your crontab config:
    ```bash
    crontab -e
    ```

2.  Add the following line (adjust paths to match your system):
    
    *Note: You must use the absolute path to `node` and the absolute path to `index.js`.*
    
    To find your node path, run `which node` (e.g., `/usr/local/bin/node`).

    ```cron
    0 8 * * * cd /Applications/MAMP/htdocs/techmeme-cron && /usr/local/bin/node index.js >> /Applications/MAMP/htdocs/techmeme-cron/cron.log 2>&1
    ```

    *   `0 8 * * *`: Runs at 8:00 AM every day.
    *   `cd ...`: Changes to the directory so `.env` is found.
    *   `>> ...`: Logs output to a file for debugging.

3.  Save and exit (`:wq` in vim).

## Troubleshooting

*   **"Missing environment variables"**: Ensure `.env` exists and has values.
*   **"command not found" in cron**: Use absolute paths for `node`.
