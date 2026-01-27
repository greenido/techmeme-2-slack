// ═══════════════════════════════════════════════════════════════════════════
// 📰 TECHMEME DIGEST BOT
// ═══════════════════════════════════════════════════════════════════════════
// This script automates the daily tech news digest by:
// 1. Scraping the latest headlines from Techmeme
// 2. Using Google's Gemini AI to intelligently summarize the top stories
// 3. Posting a beautifully formatted digest to your Slack channel
// ═══════════════════════════════════════════════════════════════════════════

// Load environment variables from .env file
require('dotenv').config();

// Dependencies for HTTP requests, HTML parsing, AI, and Slack integration
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { WebClient } = require('@slack/web-api');

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

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
// Ensure all required environment variables are present before proceeding
if (!GEMINI_API_KEY || !SLACK_TOKEN || !SLACK_CHANNEL) {
  console.error('❌ Error: Missing required environment variables!');
  console.error('   Please check your .env file and ensure the following are set:');
  console.error('   - GEMINI_API_KEY');
  console.error('   - SLACK_BOT_TOKEN');
  console.error('   - SLACK_CHANNEL_ID');
  process.exit(1);
}

console.log('✓ Environment variables validated successfully');

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE API CLIENTS
// ═══════════════════════════════════════════════════════════════════════════

// Initialize Google Gemini AI client for content generation
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
console.log(`✓ Gemini AI client initialized (Model: ${GEMINI_MODEL})`);

// Initialize Slack Web API client for posting messages
const slackClient = new WebClient(SLACK_TOKEN);
console.log(`✓ Slack client initialized (Channel: ${SLACK_CHANNEL})`);

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

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
 * - Format for Slack with emojis and proper markdown
 * - Keep summaries concise and actionable
 * 
 * @param {string} content - Formatted string of news items with URLs
 * @returns {Promise<string>} Formatted summary text ready for Slack
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
      You are a tech news aggregator. 
      Read the following raw text items extracted from Techmeme.
      Identify and summarize the top 10 most important news stories.
      
      Format the output as a clean, bulleted list suitable for a Slack message.
      IMPORTANT: Use single asterisks for bold text (e.g., *Title* not **Title**).
      Keep summaries concise (1-2 sentences).
      Add an emoji relevant to the news item at the start of each bullet.
      Use bullet points (• or -) for each item.
      Add a link to the original article after each summary.

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
    
    // POST-PROCESSING: Clean up the AI output for optimal Slack formatting
    
    // POST-PROCESSING: Clean up the AI output for optimal Slack formatting
    console.log('   Applying Slack formatting...');
    
    // Convert double asterisks to single asterisks (Slack uses single * for bold)
    text = text.replace(/\*\*/g, '*');
    
    // Remove any triple asterisks that might accidentally appear
    text = text.replace(/\*\*\*/g, '*');
    
    // Replace raw URLs with Slack's "read more" link format
    // Slack format: <URL|display text> makes URLs more readable
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    text = text.replace(/https?:\/\/[^\s\)\]]+/g, (url) => {
      return `<${url}|read more>`;
    });
    
    console.log(`✓ Formatted ${urlCount} URLs as Slack links`);
    
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
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
 * 4. Post the digest to Slack
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
    
    // STEP 4: Post to Slack
    await postToSlack(summary);
    
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
