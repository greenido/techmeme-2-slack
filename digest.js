// ═══════════════════════════════════════════════════════════════════════════
// 🤖 DIGEST GENERATION
// ═══════════════════════════════════════════════════════════════════════════
// Asks Gemini to pick and summarize the top stories as structured JSON.
// The model references stories by their number in the scraped list, and the
// URL is always taken from the scraped item — never from model output — so
// every link in the digest points at an article Techmeme actually featured.
// ═══════════════════════════════════════════════════════════════════════════

const { GoogleGenAI } = require('@google/genai');

const DIGEST_SIZE = 10;

// JSON Schema for the model response (Gemini `responseJsonSchema`)
const DIGEST_SCHEMA = {
  type: 'object',
  properties: {
    stories: {
      type: 'array',
      minItems: 1,
      maxItems: DIGEST_SIZE,
      items: {
        type: 'object',
        properties: {
          source: {
            type: 'integer',
            description: 'The number of the headline (from the numbered list) this story is based on.',
          },
          emoji: {
            type: 'string',
            description: 'A single emoji that fits the story.',
          },
          title: {
            type: 'string',
            description: 'A short, plain-text headline (under 90 characters).',
          },
          summary: {
            type: 'string',
            description: 'One or two plain-text sentences: what happened and why it matters.',
          },
        },
        required: ['source', 'emoji', 'title', 'summary'],
      },
    },
  },
  required: ['stories'],
};

/**
 * Builds the Gemini prompt from the scraped Techmeme items
 *
 * @param {Array<{text: string, url: string}>} items - Scraped headlines
 * @returns {string} Prompt text
 */
function buildPrompt(items) {
  const headlines = items
    .map((item, index) => `${index + 1}. ${item.text}`)
    .join('\n\n');

  return `You are a high-signal tech and business news editor.
Pick the ${DIGEST_SIZE} most important stories from today's Techmeme headlines below.

Use only the information in the headlines. Do not add facts, numbers, or claims that are not stated there.

Selection criteria:
- At least half of the picks should be about business, startups, AI, or core technology trends.
- Prioritize strategic business impact, market or industry implications, notable funding, acquisitions, IPOs or shutdowns, and breakthroughs or setbacks in AI, infrastructure, or platforms.
- De-prioritize shallow product launches or incremental updates unless they have outsized impact.
- Every pick must be a different event. If several headlines cover the same company announcement, product, or event, pick only the single best one, even if that means returning fewer than ${DIGEST_SIZE} stories.
- Rank by real-world significance, most important first.

For each pick, return the headline number in "source", a fitting emoji, a short title, and a one- or two-sentence summary that says why it matters.
Write plain text only: no markdown, no links, no URLs.

Today's Techmeme headlines:

${headlines}`;
}

/**
 * Validates the model's JSON response and attaches the scraped URLs
 *
 * Drops stories that reference an unknown headline number, repeat a headline,
 * or are missing text, so a bad model response can never inject a link.
 *
 * @param {string} responseText - Raw JSON text returned by Gemini
 * @param {Array<{text: string, url: string}>} items - Scraped headlines
 * @returns {Array<{emoji: string, title: string, summary: string, url: string}>}
 * @throws {Error} If the response is not valid JSON or contains no usable stories
 */
function parseDigest(responseText, items) {
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Gemini returned invalid JSON: ${error.message}`);
  }

  const rawStories = Array.isArray(parsed?.stories) ? parsed.stories : [];
  const usedSources = new Set();
  const stories = [];

  for (const story of rawStories) {
    const source = Number(story?.source);
    const title = String(story?.title ?? '').trim();
    const summary = String(story?.summary ?? '').trim();
    const emoji = String(story?.emoji ?? '').trim() || '📰';

    if (!Number.isInteger(source) || source < 1 || source > items.length) continue;
    if (usedSources.has(source) || !title || !summary) continue;

    usedSources.add(source);
    stories.push({ emoji, title, summary, url: items[source - 1].url });

    if (stories.length === DIGEST_SIZE) break;
  }

  if (rawStories.length !== stories.length) {
    console.warn(`⚠️  Dropped ${rawStories.length - stories.length} invalid or duplicate stories from Gemini output`);
  }

  if (stories.length === 0) {
    throw new Error('Gemini returned no usable stories.');
  }

  return stories;
}

/**
 * Uses Gemini to select and summarize the top stories
 *
 * @param {Array<{text: string, url: string}>} items - Scraped headlines
 * @param {{apiKey: string, model: string}} options - Gemini configuration
 * @returns {Promise<Array<{emoji: string, title: string, summary: string, url: string}>>}
 */
async function generateDigest(items, { apiKey, model }) {
  console.log('\n🤖 Generating digest with Gemini AI...');
  console.log(`   Using model: ${model}`);

  const ai = new GoogleGenAI({ apiKey });
  const startTime = Date.now();

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(items),
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: DIGEST_SCHEMA,
    },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✓ Received response from Gemini (${duration}s)`);

  const stories = parseDigest(response.text ?? '', items);
  console.log(`✓ Parsed ${stories.length} stories`);

  return stories;
}

/**
 * Builds a consistent digest date for delivery headers
 *
 * @returns {string} Locale-formatted date string
 */
function getFormattedDigestDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

module.exports = {
  DIGEST_SCHEMA,
  DIGEST_SIZE,
  buildPrompt,
  generateDigest,
  getFormattedDigestDate,
  parseDigest,
};
