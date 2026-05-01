require('dotenv').config();

const { buildTelegramMessages, postToTelegram } = require('./telegram');

function buildDefaultTestMessage(longMode) {
  const intro = [
    '🧪 *Telegram delivery test*',
    `Generated at ${new Date().toLocaleString('en-US')}.`,
    'This verifies Slack-style bold, links, and Telegram chunking.',
    '<https://techmeme.com|Open Techmeme>'
  ].join('\n');

  if (!longMode) {
    return intro;
  }

  const stories = Array.from({ length: 24 }, (_, index) => {
    const storyNumber = index + 1;
    return [
      `• 🚀 *Story ${storyNumber}* This is a long Telegram-only delivery test item designed to exercise multipart posting without running the full Techmeme + Gemini workflow. It should remain readable after Slack-to-Telegram conversion and include a working link for each item.`,
      `<https://example.com/story-${storyNumber}|read more>`
    ].join('\n');
  }).join('\n\n');

  return `${intro}\n\n${stories}`;
}

async function main() {
  const args = process.argv.slice(2);
  const longMode = args.includes('--long');
  const customMessage = args.filter((arg) => arg !== '--long').join(' ').trim();
  const message = customMessage || buildDefaultTestMessage(longMode);
  const previewMessages = buildTelegramMessages(message);

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📨 TELEGRAM DELIVERY TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Preview parts: ${previewMessages.length}`);
  previewMessages.forEach((part, index) => {
    console.log(`   Part ${index + 1}: ${part.length} characters`);
  });

  await postToTelegram(message);

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