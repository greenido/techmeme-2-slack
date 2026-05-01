const axios = require('axios');

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

function getFormattedDigestDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function escapeTelegramHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function convertSlackTextToTelegramHtml(text) {
  const linkPlaceholders = [];

  let converted = text.replace(/<([^|>]+)\|([^>]+)>/g, (match, url, linkText) => {
    const placeholder = `__TELEGRAM_LINK_${linkPlaceholders.length}__`;
    linkPlaceholders.push({ placeholder, url, linkText });
    return placeholder;
  });

  converted = escapeTelegramHtml(converted);
  converted = converted.replace(/\*([^*\n][^*\n]*?)\*/g, '<b>$1</b>');

  for (const { placeholder, url, linkText } of linkPlaceholders) {
    const safeLink = `<a href="${escapeTelegramHtml(url)}">${escapeTelegramHtml(linkText)}</a>`;
    converted = converted.replace(placeholder, safeLink);
  }

  return converted;
}

function getTelegramHeader(formattedDate, partNumber, totalParts) {
  const partSuffix = totalParts > 1 ? ` (Part ${partNumber}/${totalParts})` : '';
  return `<b>Techmeme Top 10 Digest - ${escapeTelegramHtml(formattedDate + partSuffix)}</b> 📰\n\n`;
}

function getTelegramBodyLength(text) {
  return convertSlackTextToTelegramHtml(text).length;
}

function takeLargestFittingPrefix(text, maxBodyLength) {
  let low = 1;
  let high = text.length;
  let best = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);

    if (getTelegramBodyLength(candidate) <= maxBodyLength) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function hardSplitSlackSegment(segment, maxBodyLength) {
  const parts = [];
  let remaining = segment;

  while (remaining.length > 0) {
    const prefixLength = takeLargestFittingPrefix(remaining, maxBodyLength);
    parts.push(remaining.slice(0, prefixLength).trim());
    remaining = remaining.slice(prefixLength).trim();
  }

  return parts.filter(Boolean);
}

function splitSlackSegment(segment, maxBodyLength) {
  if (getTelegramBodyLength(segment) <= maxBodyLength) {
    return [segment];
  }

  const lines = segment.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    const parts = [];
    let current = '';

    for (const line of lines) {
      const candidate = current ? `${current}\n${line}` : line;

      if (getTelegramBodyLength(candidate) <= maxBodyLength) {
        current = candidate;
        continue;
      }

      if (current) {
        parts.push(current);
      }

      if (getTelegramBodyLength(line) <= maxBodyLength) {
        current = line;
      } else {
        parts.push(...splitSlackSegment(line, maxBodyLength));
        current = '';
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  const words = segment.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const parts = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;

      if (getTelegramBodyLength(candidate) <= maxBodyLength) {
        current = candidate;
        continue;
      }

      if (current) {
        parts.push(current);
      }

      if (getTelegramBodyLength(word) <= maxBodyLength) {
        current = word;
      } else {
        parts.push(...hardSplitSlackSegment(word, maxBodyLength));
        current = '';
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  return hardSplitSlackSegment(segment, maxBodyLength);
}

function buildTelegramMessages(text) {
  const formattedDate = getFormattedDigestDate();
  const headerReserve = getTelegramHeader(formattedDate, 999, 999).length;
  const maxBodyLength = TELEGRAM_MAX_MESSAGE_LENGTH - headerReserve;
  const normalizedText = String(text || '').trim();

  if (!normalizedText) {
    return [getTelegramHeader(formattedDate, 1, 1).trimEnd()];
  }

  const paragraphs = normalizedText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const segments = paragraphs.flatMap((paragraph) => splitSlackSegment(paragraph, maxBodyLength));
  const bodies = [];
  let currentBody = '';

  for (const segment of segments) {
    const candidate = currentBody ? `${currentBody}\n\n${segment}` : segment;

    if (getTelegramBodyLength(candidate) <= maxBodyLength) {
      currentBody = candidate;
      continue;
    }

    if (currentBody) {
      bodies.push(currentBody);
    }

    currentBody = segment;
  }

  if (currentBody) {
    bodies.push(currentBody);
  }

  const totalParts = bodies.length;

  return bodies.map((body, index) => {
    const message = `${getTelegramHeader(formattedDate, index + 1, totalParts)}${convertSlackTextToTelegramHtml(body)}`;

    if (message.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
      throw new Error(`Telegram message part ${index + 1} exceeds ${TELEGRAM_MAX_MESSAGE_LENGTH} characters.`);
    }

    return message;
  });
}

async function postToTelegram(text, options = {}) {
  const botToken = options.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('Telegram delivery requires both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
  }

  console.log('\n📤 Posting to Telegram...');

  try {
    const messages = buildTelegramMessages(text);

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
  buildTelegramMessages,
  convertSlackTextToTelegramHtml,
  escapeTelegramHtml,
  postToTelegram,
};