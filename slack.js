const { WebClient, retryPolicies } = require('@slack/web-api');

const SLACK_TIMEOUT_MS = 30_000;

// Slack rejects section blocks whose text exceeds 3000 characters
const SLACK_SECTION_MAX_LENGTH = 3000;

/**
 * Escapes the three control characters Slack mrkdwn requires escaping
 *
 * @param {string} value - Plain text
 * @returns {string} Slack-safe text
 */
function escapeSlackText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Makes a URL safe to place inside Slack's <url|text> link syntax
 *
 * @param {string} url - Absolute URL
 * @returns {string} URL with link delimiters percent-encoded
 */
function escapeSlackUrl(url) {
  return String(url)
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\|/g, '%7C');
}

function truncate(text, maxLength) {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

/**
 * Renders digest stories as a Slack Block Kit message
 *
 * @param {Array<{emoji: string, title: string, summary: string, url: string}>} stories
 * @param {string} formattedDate - Date shown in the header
 * @returns {{text: string, blocks: Array<object>}} chat.postMessage payload
 */
function renderSlackMessage(stories, formattedDate) {
  const headerText = `📰 Techmeme Top ${stories.length} Digest - ${formattedDate}`;

  const storyBlocks = stories.map((story) => {
    const link = `<${escapeSlackUrl(story.url)}|${escapeSlackText(story.title)}>`;
    const text = `${story.emoji} *${link}*\n${escapeSlackText(story.summary)}`;

    return {
      type: 'section',
      text: { type: 'mrkdwn', text: truncate(text, SLACK_SECTION_MAX_LENGTH) },
    };
  });

  // Plain-text fallback used for notifications and clients without Block Kit
  const fallbackText = [
    headerText,
    ...stories.map((story) => `${story.emoji} ${story.title}`),
  ].join('\n');

  return {
    text: escapeSlackText(fallbackText),
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: truncate(headerText, 150), emoji: true } },
      ...storyBlocks,
    ],
  };
}

/**
 * Posts the digest to a Slack channel
 *
 * @param {Array<{emoji: string, title: string, summary: string, url: string}>} stories
 * @param {{token: string, channel: string, formattedDate: string}} options
 * @throws {Error} If the Slack API call fails
 */
async function postToSlack(stories, { token, channel, formattedDate }) {
  console.log('\n📤 Posting to Slack...');

  try {
    const message = renderSlackMessage(stories, formattedDate);
    console.log(`   Target channel: ${channel}`);
    console.log(`   Blocks: ${message.blocks.length}`);

    // The default policy retries for ~30 minutes; keep a daily job bounded
    const client = new WebClient(token, {
      timeout: SLACK_TIMEOUT_MS,
      retryConfig: retryPolicies.fiveRetriesInFiveMinutes,
    });
    const result = await client.chat.postMessage({
      channel,
      ...message,
      unfurl_links: false,
      unfurl_media: false,
    });

    console.log('✅ Successfully posted to Slack!');
    console.log(`   Message timestamp: ${result.ts}`);
  } catch (error) {
    console.error('❌ Error posting to Slack:', error.message);
    if (error.data) {
      console.error(`   Error code: ${error.data.error}`);
      console.error('   Details:', error.data);
    }
    throw error;
  }
}

module.exports = {
  escapeSlackText,
  escapeSlackUrl,
  postToSlack,
  renderSlackMessage,
};
