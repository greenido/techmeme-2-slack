// ═══════════════════════════════════════════════════════════════════════════
// 📰 TECHMEME DIGEST BOT
// ═══════════════════════════════════════════════════════════════════════════
// This script automates the daily tech news digest by:
// 1. Scraping the latest headlines from Techmeme
// 2. Using Google's Gemini AI to intelligently summarize the top stories
// 3. Posting a beautifully formatted digest to Slack and/or Telegram
// ═══════════════════════════════════════════════════════════════════════════

// Load environment variables from .env file
require('dotenv').config();

// Dependencies for HTTP requests, HTML parsing, AI, and messaging integrations
const { generateDigest, getFormattedDigestDate } = require('./digest');
const { filterUnsent, loadHistory, recentTitles, saveHistory } = require('./state');
const { fetchTechmemeContent } = require('./techmeme');
const { postToSlack, renderSlackMessage } = require('./slack');
const { postToTelegram, renderTelegramMessages } = require('./telegram');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Sent-story history, used to avoid repeating stories across days
const HISTORY_FILE = process.env.HISTORY_FILE || 'data/sent-stories.json';
// Titles from this many recent days are listed in the prompt as already covered
const RECENT_TITLE_DAYS = 3;

// Google Gemini AI configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'; // Fallback to latest Flash if not specified
// Tried once if the primary model keeps failing (e.g. 503 overloaded); set to "none" to disable
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest';

// Slack integration configuration
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_ID;

// Telegram integration configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const cliArgs = process.argv.slice(2);
const telegramOnlyMode = cliArgs.includes('--telegram-only');
// --dry-run prints the rendered Slack and Telegram messages instead of posting them
const dryRunMode = cliArgs.includes('--dry-run');

const hasSlackConfig = Boolean(SLACK_TOKEN && SLACK_CHANNEL);
const hasTelegramConfig = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
const activeSlackConfig = hasSlackConfig && !telegramOnlyMode;
const activeTelegramConfig = hasTelegramConfig;

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
// Ensure all required environment variables are present before proceeding
const configurationErrors = [];

if (!GEMINI_API_KEY) {
  configurationErrors.push('GEMINI_API_KEY is required.');
}

if ((SLACK_TOKEN && !SLACK_CHANNEL) || (!SLACK_TOKEN && SLACK_CHANNEL)) {
  configurationErrors.push('Slack delivery requires both SLACK_BOT_TOKEN and SLACK_CHANNEL_ID.');
}

if ((TELEGRAM_BOT_TOKEN && !TELEGRAM_CHAT_ID) || (!TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)) {
  configurationErrors.push('Telegram delivery requires both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
}

if (telegramOnlyMode && !hasTelegramConfig) {
  configurationErrors.push('Telegram-only mode requires both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
}

if (!dryRunMode && !activeSlackConfig && !activeTelegramConfig) {
  configurationErrors.push('Configure at least one delivery target: Slack or Telegram.');
}

if (configurationErrors.length > 0) {
  console.error('❌ Error: Invalid environment configuration!');
  console.error('   Please check your .env file and resolve the following:');
  configurationErrors.forEach((message) => console.error(`   - ${message}`));
  process.exit(1);
}

console.log('✓ Environment variables validated successfully');
console.log(`✓ Delivery targets configured: ${[
  activeSlackConfig ? 'Slack' : null,
  activeTelegramConfig ? 'Telegram' : null,
].filter(Boolean).join(', ')}`);
if (telegramOnlyMode) {
  console.log('✓ Delivery mode: Telegram only');
}
if (dryRunMode) {
  console.log('✓ Delivery mode: dry run (nothing will be posted)');
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

console.log(`✓ Gemini model: ${GEMINI_MODEL} (fallback: ${GEMINI_FALLBACK_MODEL})`);

if (activeSlackConfig) {
  console.log(`✓ Slack delivery configured (Channel: ${SLACK_CHANNEL})`);
}

if (activeTelegramConfig) {
  console.log(`✓ Telegram delivery configured (Chat: ${TELEGRAM_CHAT_ID})`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main orchestration function - coordinates the entire digest workflow
 * 
 * Workflow:
 * 1. Fetch ranked headlines from Techmeme and drop ones sent recently
 * 2. Select and summarize the top stories with Gemini (structured JSON)
 * 3. Render and post the digest to each configured delivery channel
 * 4. Record the delivered stories in the history file
 * 
 * @throws {Error} If any step in the workflow fails
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🚀 STARTING TECHMEME DIGEST BOT');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toLocaleString()}`);
  
  const workflowStartTime = Date.now();
  
  try {
    // STEP 1: Fetch content from Techmeme
    const scrapedItems = await fetchTechmemeContent();
    
    if (scrapedItems.length === 0) {
      throw new Error('No items fetched from Techmeme. Cannot proceed.');
    }

    const history = loadHistory(HISTORY_FILE);
    const items = filterUnsent(scrapedItems, history);
    console.log(`✓ ${scrapedItems.length - items.length} stories skipped as already sent (history: ${history.length} entries)`);

    if (items.length === 0) {
      throw new Error('Every Techmeme story was already sent recently. Nothing new to post.');
    }
    
    // STEP 2: Select and summarize the top stories with Gemini AI
    const stories = await generateDigest(items, {
      apiKey: GEMINI_API_KEY,
      model: GEMINI_MODEL,
      fallbackModel: GEMINI_FALLBACK_MODEL === 'none' ? null : GEMINI_FALLBACK_MODEL,
      recentlyCovered: recentTitles(history, RECENT_TITLE_DAYS),
    });
    const formattedDate = getFormattedDigestDate();

    // STEP 3: Post to each configured delivery target
    if (dryRunMode) {
      console.log('\n🧪 Dry run — Slack payload:');
      console.log(JSON.stringify(renderSlackMessage(stories, formattedDate), null, 2));
      console.log('\n🧪 Dry run — Telegram messages:');
      renderTelegramMessages(stories, formattedDate).forEach((message) => console.log(`\n${message}`));
    } else {
      // Each channel is attempted even if an earlier one failed
      const deliveries = [
        activeSlackConfig && ['Slack', () => postToSlack(stories, { token: SLACK_TOKEN, channel: SLACK_CHANNEL, formattedDate })],
        activeTelegramConfig && ['Telegram', () => postToTelegram(stories, { botToken: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID, formattedDate })],
      ].filter(Boolean);
      const failedTargets = [];

      for (const [name, deliver] of deliveries) {
        try {
          await deliver();
        } catch (error) {
          failedTargets.push(name);
        }
      }

      // Record the stories if anyone received them, so tomorrow skips them
      if (failedTargets.length < deliveries.length) {
        saveHistory(HISTORY_FILE, history, stories);
        console.log(`✓ Recorded ${stories.length} stories in ${HISTORY_FILE}`);
      }

      if (failedTargets.length > 0) {
        throw new Error(`Delivery failed for: ${failedTargets.join(', ')}`);
      }
    }
    
    // Calculate and display total execution time
    const totalDuration = ((Date.now() - workflowStartTime) / 1000).toFixed(2);
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total execution time: ${totalDuration} seconds`);
    console.log(`Completed at: ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════════════════════');
    console.error('❌ WORKFLOW FAILED');
    console.error('═══════════════════════════════════════════════════════════════════════════');
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('═══════════════════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTE THE WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════
main();
