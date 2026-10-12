const assert = require('node:assert/strict');
const { test } = require('node:test');
const { renderSlackMessage } = require('../slack');
const { TELEGRAM_MAX_MESSAGE_LENGTH, renderTelegramMessages } = require('../telegram');

const DATE = 'Monday, October 12, 2026';
const tricky = {
  emoji: '💰',
  title: 'Acme & Co <raise>',
  summary: 'Big deal | 5 > 3',
  url: 'https://a.example.com/1?x=1&y=$&|z<>',
};

test('Slack: header plus one escaped section per story', () => {
  const { text, blocks } = renderSlackMessage([tricky], DATE);

  assert.equal(blocks[0].type, 'header');
  assert.equal(blocks[0].text.text, `📰 Techmeme Top 1 Digest - ${DATE}`);
  assert.equal(
    blocks[1].text.text,
    '💰 *<https://a.example.com/1?x=1&y=$&%7Cz%3C%3E|Acme &amp; Co &lt;raise&gt;>*\nBig deal | 5 &gt; 3'
  );
  assert.match(text, /Acme &amp; Co &lt;raise&gt;/);
});

test('Slack: section text stays under the 3000-character block limit', () => {
  const { blocks } = renderSlackMessage([{ ...tricky, summary: 'x'.repeat(5000) }], DATE);

  assert.ok(blocks[1].text.text.length <= 3000);
});

test('Telegram: escapes HTML in titles, summaries and link URLs', () => {
  const [message] = renderTelegramMessages([tricky], DATE);

  assert.ok(message.startsWith(`<b>Techmeme Top 1 Digest - ${DATE}</b> 📰\n\n`));
  assert.ok(message.includes(
    '💰 <b><a href="https://a.example.com/1?x=1&amp;y=$&amp;|z&lt;&gt;">Acme &amp; Co &lt;raise&gt;</a></b>\nBig deal | 5 &gt; 3'
  ));
});

test('Telegram: splits between stories and keeps every part under the limit', () => {
  const stories = Array.from({ length: 30 }, (_, i) => ({
    emoji: '🚀',
    title: `Story ${i}`,
    summary: 'x & y '.repeat(60),
    url: `https://e.example/${i}`,
  }));
  stories.push({ emoji: '🐘', title: 'Huge', summary: '<&>'.repeat(3000), url: 'https://e.example/huge' });

  const parts = renderTelegramMessages(stories, DATE);

  assert.ok(parts.length > 1);
  parts.forEach((part, i) => {
    assert.ok(part.length <= TELEGRAM_MAX_MESSAGE_LENGTH, `part ${i + 1} is ${part.length} chars`);
    assert.ok(part.includes(`(Part ${i + 1}/${parts.length})`));
  });
  assert.equal(parts.join('').match(/<a href/g).length, stories.length);
  // The oversized summary is cut on plain text, never mid-entity
  assert.doesNotMatch(parts.at(-1), /&[a-z]*…/);
});
