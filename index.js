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
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { WebClient } = require('@slack/web-api');
const { postToTelegram } = require('./telegram');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Techmeme source URL
const TECHMEME_URL = 'https://techmeme.com/';

// Google Gemini AI configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro-latest'; // Fallback to latest if not specified

// Slack integration configuration
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_ID;

// Telegram integration configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const cliArgs = process.argv.slice(2);
const telegramOnlyMode = cliArgs.includes('--telegram-only');

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

if (!activeSlackConfig && !activeTelegramConfig) {
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

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE API CLIENTS
// ═══════════════════════════════════════════════════════════════════════════

// Initialize Google Gemini AI client for content generation
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
console.log(`✓ Gemini AI client initialized (Model: ${GEMINI_MODEL})`);

// Initialize Slack Web API client for posting messages when configured
const slackClient = activeSlackConfig ? new WebClient(SLACK_TOKEN) : null;
if (activeSlackConfig) {
  console.log(`✓ Slack client initialized (Channel: ${SLACK_CHANNEL})`);
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
 * Uses Google's Gemini AI to generate an intelligent summary of news items
 * 
 * Sends the raw headline data to Gemini with specific instructions to:
 * - Identify the top 10 most important stories
 * - Format for Slack-style delivery with emojis and proper markdown
 * - Keep summaries concise and actionable
 * 
 * @param {string} content - Formatted string of news items with URLs
 * @returns {Promise<string>} Formatted summary text ready for delivery
 * @throws {Error} If the AI generation fails
 */
async function summarizeWithGemini(content) {
  console.log('\n🤖 Generating summary with Gemini AI...');
  
  try {
    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    console.log(`   Using model: ${GEMINI_MODEL}`);
    
    // Craft the prompt with specific instructions for the AI
    const prompt = `
     You are a high-signal tech and business news aggregator.
Your goal is to identify the top 10 most important new stories by synthesizing information from multiple reliable sources, not just the provided text.

Primary source:
Techmeme (provided below)
Secondary sources to cross-check and enrich context:
X (formerly Twitter): verified accounts, founders, VCs, researchers, reputable journalists
Reddit: relevant high-quality subreddits (e.g. r/startups, r/technology, r/MachineLearning, r/artificial)
Major tech/business outlets (e.g. Bloomberg, The Information, WSJ, FT, The Verge, Wired)

Selection criteria:
At least 50% of the selected items must be focused on business, startups, AI, or core technology trends

Prioritize stories with:
Strategic business impact
Market or industry implications
Notable funding, acquisitions, IPOs, or shutdowns
Breakthroughs or setbacks in AI, infrastructure, or platforms
De-prioritize shallow product launches or incremental updates unless they have outsized impact

Instructions:
Read the raw Techmeme content below
Cross-check and validate importance using the secondary sources
Merge duplicates into a single, stronger story when appropriate
Rank by real-world significance, not volume of coverage

Output format (for Slack):
Use a clean bulleted list (• or -)
Start each bullet with a relevant emoji
Use single asterisks for bold titles (e.g. Title)
Keep summaries concise (1–2 sentences max)
Clearly state why the story matters
Add a link to the most authoritative original article for each item
Raw Content:
      ${content}
    `;

    console.log('   Sending prompt to Gemini...');
    const startTime = Date.now();
    
    // Send the request to Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Received response from Gemini (${duration}s)`);
    console.log(`   Generated text length: ${text.length} characters`);
    console.log(`   Preview: ${text.substring(0, 100)}...`);
    
    // POST-PROCESSING: Clean up the AI output for downstream delivery formatting
    console.log('   Applying delivery formatting...');
    
    // Convert double asterisks to single asterisks (Slack uses single * for bold)
    text = text.replace(/\*\*/g, '*');
    
    // Remove any triple asterisks that might accidentally appear
    text = text.replace(/\*\*\*/g, '*');
    
    // Remove markdown-style links [text](url) and convert to Slack format <url|text>
    // This prevents duplicate "read more" issues
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (match, linkText, url) => {
      return `<${url}|${linkText}>`;
    });
    
    // Replace any remaining bare URLs with Slack's link format
    // Only match URLs that are NOT already inside < > brackets (Slack format)
    text = text.replace(/(?<!<)(https?:\/\/[^\s<>\)\]]+)(?![^<]*>)/g, (url) => {
      return `<${url}|read more>`;
    });
    
    const urlCount = (text.match(/</g) || []).length;
    console.log('✓ Formatted URLs for downstream delivery');
    
    return text;
  } catch (error) {
    console.error('❌ Error during Gemini summarization:', error.message);
    if (error.response) {
      console.error(`   Response data:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Builds a consistent digest date for downstream delivery headers
 *
 * @returns {string} Locale-formatted date string
 */
function getFormattedDigestDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Posts the formatted digest to the specified Slack channel
 * 
 * Prepends a header with the current date and newspaper emoji,
 * then sends the message using Slack's Web API with markdown enabled.
 * 
 * @param {string} text - The formatted summary text to post
 * @throws {Error} If the Slack API call fails
 */
async function postToSlack(text) {
  console.log('\n📤 Posting to Slack...');
  
  try {
    // Create a beautiful header with today's date
    const formattedDate = getFormattedDigestDate();
    const header = `*Techmeme Top 10 Digest - ${formattedDate}* :newspaper:\n\n`;
    
    console.log(`   Target channel: ${SLACK_CHANNEL}`);
    console.log(`   Message length: ${(header + text).length} characters`);
    
    // Send the message to Slack
    const result = await slackClient.chat.postMessage({
      channel: SLACK_CHANNEL,
      text: header + text,
      mrkdwn: true  // Enable Slack markdown formatting
    });
    
    console.log('✅ Successfully posted to Slack!');
    console.log(`   Message timestamp: ${result.ts}`);
    console.log(`   Channel: ${result.channel}`);
  } catch (error) {
    console.error('❌ Error posting to Slack:', error.message);
    if (error.data) {
      console.error(`   Error code: ${error.data.error}`);
      console.error(`   Details:`, error.data);
    }
    throw error;
  }
}

/**
 * Main orchestration function - coordinates the entire digest workflow
 * 
 * Workflow:
 * 1. Fetch headlines from Techmeme
 * 2. Format the data for AI processing
 * 3. Generate intelligent summary with Gemini
 * 4. Post the digest to each configured delivery channel
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
    
    // STEP 2: Format items as readable text for the AI
    console.log('\n📝 Formatting content for AI processing...');
    const content = items.map((item, index) => 
      `${index + 1}. ${item.text}\n   URL: ${item.url}`
    ).join('\n\n');
    console.log(`✓ Formatted ${items.length} items for AI`);
    
    // STEP 3: Generate summary with Gemini AI
    const summary = await summarizeWithGemini(content);
    
    // STEP 4: Post to each configured delivery target
    if (activeSlackConfig) {
      await postToSlack(summary);
    }

    if (activeTelegramConfig) {
      await postToTelegram(summary);
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
