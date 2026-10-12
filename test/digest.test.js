const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DIGEST_SIZE, buildPrompt, parseDigest } = require('../digest');

const items = [
  { text: 'Acme raises $1B', url: 'https://a.example.com/1', coverage: 12 },
  { text: 'Globex launches a phone', url: 'https://b.example.com/2', coverage: 0 },
  { text: 'Initech is acquired', url: 'https://c.example.com/3' },
];

const story = (source, extra = {}) => ({ source, emoji: '📰', title: `Title ${source}`, summary: `Summary ${source}`, ...extra });

test('buildPrompt numbers headlines, shows coverage, and never includes URLs', () => {
  const prompt = buildPrompt(items);

  assert.match(prompt, /1\. Acme raises \$1B \[12 related articles\]/);
  assert.match(prompt, /2\. Globex launches a phone\n/);
  assert.doesNotMatch(prompt, /https?:\/\//);
  assert.doesNotMatch(prompt, /Already covered/);
});

test('buildPrompt lists recently covered titles', () => {
  const prompt = buildPrompt(items, { recentlyCovered: ['Old story'] });

  assert.match(prompt, /Already covered in recent digests[^\n]*\n- Old story/);
});

test('parseDigest takes URLs from scraped items, not the model', () => {
  const stories = parseDigest(JSON.stringify({ stories: [story(3, { url: 'https://evil.example' })] }), items);

  assert.deepEqual(stories, [{ emoji: '📰', title: 'Title 3', summary: 'Summary 3', url: 'https://c.example.com/3' }]);
});

test('parseDigest drops out-of-range, duplicate and empty stories', () => {
  const stories = parseDigest(JSON.stringify({ stories: [
    story(1),
    story(1),
    story(0),
    story(4),
    story(1.5),
    story(2, { title: '   ' }),
    story(3, { emoji: '' }),
  ] }), items);

  assert.deepEqual(stories.map((s) => s.url), ['https://a.example.com/1', 'https://c.example.com/3']);
  assert.equal(stories[1].emoji, '📰');
});

test('parseDigest caps the digest size', () => {
  const many = Array.from({ length: 15 }, (_, i) => ({ text: `H${i}`, url: `https://e.example/${i}` }));
  const stories = parseDigest(JSON.stringify({ stories: many.map((_, i) => story(i + 1)) }), many);

  assert.equal(stories.length, DIGEST_SIZE);
});

test('parseDigest rejects invalid or empty responses', () => {
  assert.throws(() => parseDigest('not json', items), /invalid JSON/);
  assert.throws(() => parseDigest('{"stories":[]}', items), /no usable stories/);
  assert.throws(() => parseDigest('{}', items), /no usable stories/);
});
