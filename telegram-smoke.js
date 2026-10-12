require('dotenv').config();

const { getFormattedDigestDate } = require('./digest');
const { renderTelegramMessages, postToTelegram } = require('./telegram');

function buildTestStories(longMode, customMessage) {
  const intro = {
    emoji: '🧪',
    title: 'Telegram delivery test',
    summary: customMessage || `Generated at ${new Date().toLocaleString('en-US')}. This verifies bold linked titles, escaping (<, >, &), and Telegram chunking.`,
    url: 'https://techmeme.com',
  };

  if (!longMode) {
    return [intro];
  }

  const stories = Array.from({ length: 24 }, (_, index) => ({
    emoji: '🚀',
    title: `Story ${index + 1}`,
    summary: 'This is a long Telegram-only delivery test item designed to exercise multipart posting without running the full Techmeme + Gemini workflow. It should remain readable and include a working link for each item.',
    url: `https://example.com/story-${index + 1}`,
  }));

  return [intro, ...stories];
}

async function main() {
  const args = process.argv.slice(2);
  const longMode = args.includes('--long');
  const customMessage = args.filter((arg) => arg !== '--long').join(' ').trim();
  const stories = buildTestStories(longMode, customMessage);
  const formattedDate = getFormattedDigestDate();
  const previewMessages = renderTelegramMessages(stories, formattedDate);

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📨 TELEGRAM DELIVERY TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Preview parts: ${previewMessages.length}`);
  previewMessages.forEach((part, index) => {
    console.log(`   Part ${index + 1}: ${part.length} characters`);
  });

  await postToTelegram(stories, { formattedDate });

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ TELEGRAM TEST COMPLETED');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

main().catch((error) => {
  console.error('═══════════════════════════════════════════════════════════════════════════');
  console.error('❌ TELEGRAM TEST FAILED');
  console.error('═══════════════════════════════════════════════════════════════════════════');
  console.error('Error details:', error.message);
  process.exit(1);
});
