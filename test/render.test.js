const assert = require('node:assert/strict');
const { test } = require('node:test');
const { renderMarkdownSummary } = require('../markdown');
const { renderSlackMessage } = require('../slack');
const { TELEGRAM_MAX_MESSAGE_LENGTH, renderTelegramMessages } = require('../telegram');

const DATE = 'Monday, October 12, 2026';
const tricky = {
  category: 'Deals & Funding',
  emoji: '💰',
  title: 'Acme & Co <raise>',
  summary: 'Big deal | 5 > 3',
  url: 'https://a.example.com/1?x=1&y=$&|z<>',
};

test('Slack: header, category heading, and one escaped section per story', () => {
  const { text, blocks } = renderSlackMessage([tricky], DATE);

  assert.equal(blocks[0].type, 'header');
  assert.equal(blocks[0].text.text, `📰 Techmeme Top 1 Digest - ${DATE}`);
  assert.equal(blocks[1].text.text, '*Deals &amp; Funding*');
  assert.equal(
    blocks[2].text.text,
    '💰 *<https://a.example.com/1?x=1&y=$&%7Cz%3C%3E|Acme &amp; Co &lt;raise&gt;>*\nBig deal | 5 &gt; 3'
  );
  assert.match(text, /Acme &amp; Co &lt;raise&gt;/);
});

test('Slack: section text stays under the 3000-character block limit', () => {
  const { blocks } = renderSlackMessage([{ ...tricky, summary: 'x'.repeat(5000) }], DATE);

  assert.ok(blocks[2].text.text.length <= 3000);
});

test('Telegram: escapes HTML in titles, summaries and link URLs', () => {
  const [message] = renderTelegramMessages([tricky], DATE);

  assert.ok(message.startsWith(`<b>Techmeme Top 1 Digest - ${DATE}</b> 📰\n\n<b><u>Deals &amp; Funding</u></b>\n`));
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

const grouped = [
  { category: 'AI', emoji: '🤖', title: 'A one', summary: 'S', url: 'https://e.example/a1' },
  { category: 'Security', emoji: '🔐', title: 'S one', summary: 'S', url: 'https://e.example/s1' },
  { category: 'AI', emoji: '🤖', title: 'A two', summary: 'S', url: 'https://e.example/a2' },
];

test('Slack: groups stories under category headings with dividers between groups', () => {
  const { blocks } = renderSlackMessage(grouped, DATE);

  assert.deepEqual(blocks.slice(1).map((b) => b.type === 'divider' ? '---' : b.text.text.split('|').pop()), [
    '*AI*', 'A one>*\nS', 'A two>*\nS', '---', '*Security*', 'S one>*\nS',
  ]);
});

test('Telegram: repeats the category heading when a group continues in a new part', () => {
  const stories = Array.from({ length: 12 }, (_, i) => ({
    category: 'AI', emoji: '🤖', title: `Story ${i}`, summary: 'x'.repeat(700), url: `https://e.example/${i}`,
  }));
  const parts = renderTelegramMessages(stories, DATE);

  assert.ok(parts.length > 1);
  parts.forEach((part) => assert.match(part, /📰\n\n<b><u>AI<\/u><\/b>\n/));
});

test('Markdown summary: grouped, escaped, with safe link URLs', () => {
  const markdown = renderMarkdownSummary([tricky, ...grouped], DATE);

  assert.ok(markdown.startsWith(`## 📰 Techmeme Top 4 Digest - ${DATE}\n\n### Deals & Funding\n\n`));
  assert.ok(markdown.includes('- 💰 **[Acme & Co &lt;raise&gt;](https://a.example.com/1?x=1&y=$&|z%3C%3E)** — Big deal \\| 5 &gt; 3'));
  assert.match(markdown, /### AI\n\n- 🤖 \*\*\[A one\]\(https:\/\/e\.example\/a1\)\*\* — S\n- 🤖 \*\*\[A two\]/);
});
