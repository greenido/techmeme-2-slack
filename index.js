require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { WebClient } = require('@slack/web-api');

// Configuration
const TECHMEME_URL = 'https://techmeme.com/';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro-latest';
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_ID;

if (!GEMINI_API_KEY || !SLACK_TOKEN || !SLACK_CHANNEL) {
  console.error('Error: Missing environment variables. Please check your .env file.');
  process.exit(1);
}

// Initialize Clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const slackClient = new WebClient(SLACK_TOKEN);

async function fetchTechmemeContent() {
  try {
    const { data } = await axios.get(TECHMEME_URL);
    const $ = cheerio.load(data);
    
    // Extract main headlines with their links
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
        // Fallback if structure is different
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
    
    console.log(`Found ${items.length} items`);
    return items;
  } catch (error) {
    console.error('Error fetching Techmeme:', error.message);
    throw error;
  }
}

async function summarizeWithGemini(content) {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up formatting for Slack
    // Convert double asterisks to single asterisks (Slack bold format)
    text = text.replace(/\*\*/g, '*');
    // Remove any triple asterisks that might appear
    text = text.replace(/\*\*\*/g, '*');
    
    // Replace all URLs with "read more" links
    // This regex matches URLs in various formats (http://, https://, www., etc.)
    text = text.replace(/https?:\/\/[^\s\)\]]+/g, (url) => {
      return `<${url}|read more>`;
    });
    
    return text;
  } catch (error) {
    console.error('Error summarizing with Gemini:', error.message);
    throw error;
  }
}

async function postToSlack(text) {
  try {
    const header = `*Techmeme Top 10 Digest - ${new Date().toLocaleDateString()}* :newspaper:\n\n`;
    await slackClient.chat.postMessage({
      channel: SLACK_CHANNEL,
      text: header + text,
      mrkdwn: true
    });
    console.log('Successfully posted to Slack!');
  } catch (error) {
    console.error('Error posting to Slack:', error.message);
    throw error;
  }
}

async function main() {
  console.log('Starting Techmeme Digest...');
  try {
    const items = await fetchTechmemeContent();
    console.log('Fetched content from Techmeme.');
    
    // Format items as readable text for the AI
    const content = items.map((item, index) => 
      `${index + 1}. ${item.text}\n   URL: ${item.url}`
    ).join('\n\n');
    
    const summary = await summarizeWithGemini(content);
    console.log('Generated summary with Gemini.');
    
    await postToSlack(summary);
    console.log('Done.');
  } catch (error) {
    console.error('Workflow failed:', error);
    process.exit(1);
  }
}

main();
