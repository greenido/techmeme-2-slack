const axios = require('axios');

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

function escapeTelegramHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTelegramHeader(formattedDate, storyCount, partNumber, totalParts) {
  const partSuffix = totalParts > 1 ? ` (Part ${partNumber}/${totalParts})` : '';
  return `<b>Techmeme Top ${storyCount} Digest - ${escapeTelegramHtml(formattedDate + partSuffix)}</b> 📰\n\n`;
}

/**
 * Renders one story as Telegram HTML, shortening the summary if needed
 *
 * @param {{emoji: string, title: string, summary: string, url: string}} story
 * @param {number} maxLength - Maximum length of the rendered HTML
 * @returns {string} Telegram HTML for the story
 */
function renderTelegramStory(story, maxLength) {
  const heading = `${escapeTelegramHtml(story.emoji)} <b><a href="${escapeTelegramHtml(story.url)}">${escapeTelegramHtml(story.title)}</a></b>`;
  let summary = story.summary;
  let html = `${heading}\n${escapeTelegramHtml(summary)}`;

  // Trim the plain-text summary (not the HTML) so entities and tags stay intact
  while (html.length > maxLength && summary.length > 0) {
    summary = summary.slice(0, Math.max(0, summary.length - (html.length - maxLength) - 1));
    html = `${heading}\n${escapeTelegramHtml(summary)}…`;
  }

  return html;
}

/**
 * Renders digest stories as one or more Telegram HTML messages
 *
 * Stories are never split across messages; a new part starts when the next
 * story would push the message over Telegram's 4096-character limit.
 *
 * @param {Array<{emoji: string, title: string, summary: string, url: string}>} stories
 * @param {string} formattedDate - Date shown in the header
 * @returns {string[]} Messages ready for sendMessage with parse_mode HTML
 */
function renderTelegramMessages(stories, formattedDate) {
  const headerReserve = getTelegramHeader(formattedDate, stories.length, 99, 99).length;
  const maxBodyLength = TELEGRAM_MAX_MESSAGE_LENGTH - headerReserve;
  const bodies = [];
  let currentBody = '';

  for (const story of stories) {
    const storyHtml = renderTelegramStory(story, maxBodyLength);
    const candidate = currentBody ? `${currentBody}\n\n${storyHtml}` : storyHtml;

    if (candidate.length <= maxBodyLength) {
      currentBody = candidate;
      continue;
    }

    bodies.push(currentBody);
    currentBody = storyHtml;
  }

  if (currentBody) {
    bodies.push(currentBody);
  }

  return bodies.map((body, index) =>
    `${getTelegramHeader(formattedDate, stories.length, index + 1, bodies.length)}${body}`
  );
}

/**
 * Posts the digest to a Telegram chat, splitting it into parts if needed
 *
 * @param {Array<{emoji: string, title: string, summary: string, url: string}>} stories
 * @param {{botToken?: string, chatId?: string, formattedDate: string}} options
 * @returns {Promise<Array<object>>} Telegram message objects
 */
async function postToTelegram(stories, options) {
  const botToken = options.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('Telegram delivery requires both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
  }

  console.log('\n📤 Posting to Telegram...');

  try {
    const messages = renderTelegramMessages(stories, options.formattedDate);

    console.log(`   Target chat: ${chatId}`);
    console.log(`   Sending ${messages.length} message part${messages.length === 1 ? '' : 's'}`);

    const results = [];

    for (const [index, message] of messages.entries()) {
      console.log(`   Part ${index + 1}/${messages.length}: ${message.length} characters`);

      const { data } = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          link_preview_options: {
            is_disabled: true,
          },
        }
      );

      results.push(data.result);
    }

    console.log('✅ Successfully posted to Telegram!');
    console.log(`   Last message ID: ${results[results.length - 1].message_id}`);
    console.log(`   Chat ID: ${results[results.length - 1].chat.id}`);

    return results;
  } catch (error) {
    console.error('❌ Error posting to Telegram:', error.message);
    if (error.response?.data) {
      console.error('   Response data:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  TELEGRAM_MAX_MESSAGE_LENGTH,
  escapeTelegramHtml,
  postToTelegram,
  renderTelegramMessages,
};
