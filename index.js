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
const axios = require('axios');
const cheerio = require('cheerio');
const { generateDigest, getFormattedDigestDate } = require('./digest');
const { postToSlack, renderSlackMessage } = require('./slack');
const { postToTelegram, renderTelegramMessages } = require('./telegram');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Techmeme source URL
const TECHMEME_URL = 'https://techmeme.com/';

// Google Gemini AI configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'; // Fallback to latest Flash if not specified

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

console.log(`✓ Gemini model: ${GEMINI_MODEL}`);

if (activeSlackConfig) {
  console.log(`✓ Slack delivery configured (Channel: ${SLACK_CHANNEL})`);
}

if (activeTelegramConfig) {
  console.log(`✓ Telegram delivery configured (Chat: ${TELEGRAM_CHAT_ID})`);
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches and parses the latest headlines from Techmeme
 * 
 * Uses Cheerio to parse the HTML and extract headline text and URLs.
 * Attempts to find items using the main '.ii' class selector, with a
 * fallback strategy if the page structure has changed.
 * 
 * @returns {Promise<Array<{text: string, url: string}>>} Array of news items
 * @throws {Error} If the HTTP request fails
 */
async function fetchTechmemeContent() {
  console.log('\n📡 Fetching content from Techmeme...');
  
  try {
    // Make HTTP request to Techmeme homepage
    const { data } = await axios.get(TECHMEME_URL);
    console.log('✓ Successfully retrieved HTML content');
    
    // Load HTML into Cheerio for jQuery-like parsing
    const $ = cheerio.load(data);
    
    // Array to store extracted headline items
    let items = [];
    
    // Select the main column headlines (usually inside .ii class)
    $('.ii').each((i, el) => {
        if (items.length >= 15) return;
        const $el = $(el);
        const $link = $el.find('a').first();
        const text = $el.text().trim();
        let url = $link.attr('href');
        
        if (text && url) {
            // Make URL absolute if it's relative
            if (url.startsWith('/')) {
                url = 'https://techmeme.com' + url;
            }
            items.push({ text, url });
        }
    });

    if (items.length === 0) {
        console.log('⚠️  No items found with .ii selector, trying fallback method...');
        
        // FALLBACK EXTRACTION STRATEGY
        // If the page structure has changed, try extracting from <strong> tags
        // This is a more general approach that should catch headlines
        $('strong').each((i, el) => {
            if (items.length >= 15) return;
            const $el = $(el);
            const text = $el.text().trim();
            const $link = $el.find('a').first().length ? $el.find('a').first() : $el.closest('a');
            let url = $link.attr('href');
            
            if (text.length > 20 && url) {
                if (url.startsWith('/')) {
                    url = 'https://techmeme.com' + url;
                }
                items.push({ text, url });
            }
        });
    }
    
    console.log(`✓ Successfully extracted ${items.length} headlines`);
    
    // Log a preview of the first few items for debugging
    if (items.length > 0) {
      console.log('   Preview of first item:');
      console.log(`   - Title: ${items[0].text.substring(0, 60)}...`);
      console.log(`   - URL: ${items[0].url}`);
    } else {
      console.warn('⚠️  Warning: No items were extracted!');
    }
    
    return items;
  } catch (error) {
    console.error('❌ Error fetching Techmeme:', error.message);
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * Main orchestration function - coordinates the entire digest workflow
 * 
 * Workflow:
 * 1. Fetch headlines from Techmeme
 * 2. Select and summarize the top stories with Gemini (structured JSON)
 * 3. Render and post the digest to each configured delivery channel
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
    const items = await fetchTechmemeContent();
    
    if (items.length === 0) {
      throw new Error('No items fetched from Techmeme. Cannot proceed.');
    }
    
    // STEP 2: Select and summarize the top stories with Gemini AI
    const stories = await generateDigest(items, { apiKey: GEMINI_API_KEY, model: GEMINI_MODEL });
    const formattedDate = getFormattedDigestDate();

    // STEP 3: Post to each configured delivery target
    if (dryRunMode) {
      console.log('\n🧪 Dry run — Slack payload:');
      console.log(JSON.stringify(renderSlackMessage(stories, formattedDate), null, 2));
      console.log('\n🧪 Dry run — Telegram messages:');
      renderTelegramMessages(stories, formattedDate).forEach((message) => console.log(`\n${message}`));
    } else {
      if (activeSlackConfig) {
        await postToSlack(stories, { token: SLACK_TOKEN, channel: SLACK_CHANNEL, formattedDate });
      }

      if (activeTelegramConfig) {
        await postToTelegram(stories, { botToken: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID, formattedDate });
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
