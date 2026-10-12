const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DIGEST_SIZE, buildPrompt, findUnsupportedNumbers, groupByCategory, parseDigest } = require('../digest');

const items = [
  { text: 'Acme raises $1B', url: 'https://a.example.com/1', coverage: 12 },
  { text: 'Globex launches a phone', url: 'https://b.example.com/2', coverage: 0 },
  { text: 'Initech is acquired', url: 'https://c.example.com/3' },
];

const NAMES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
const story = (source, extra = {}) => ({ source, category: 'AI', emoji: '📰', title: `Title ${NAMES[Math.floor(source)]}`, summary: `Summary ${NAMES[Math.floor(source)]}`, ...extra });

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

  assert.deepEqual(stories, [{ category: 'AI', emoji: '📰', title: 'Title three', summary: 'Summary three', url: 'https://c.example.com/3' }]);
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

test('parseDigest drops stories with numbers that are not in their headline', () => {
  const stories = parseDigest(JSON.stringify({ stories: [
    story(1, { title: 'Acme raises $1B', summary: 'A big round.' }),
    story(2, { title: 'Globex sells 5M phones', summary: 'Not in the headline.' }),
  ] }), items);

  assert.deepEqual(stories.map((s) => s.title), ['Acme raises $1B']);
});

test('findUnsupportedNumbers normalizes thousands separators and decimals', () => {
  const source = 'Volta raised $1.3B from 1,300 investors in Q3; Fable 5.1 shipped';

  assert.deepEqual(findUnsupportedNumbers('$1.3B from 1300 investors, Q3, version 5.1', source), []);
  assert.deepEqual(findUnsupportedNumbers('$1.5B in 2026', source), ['1.5', '2026']);
});

test('parseDigest maps unknown categories to Other', () => {
  const [result] = parseDigest(JSON.stringify({ stories: [story(1, { title: 'Acme raises $1B', category: 'Sports' })] }), items);

  assert.equal(result.category, 'Other');
});

test('groupByCategory orders groups by their top story and keeps rank within groups', () => {
  const groups = groupByCategory([
    { category: 'AI', title: 'a1' },
    { category: 'Security', title: 's1' },
    { category: 'AI', title: 'a2' },
    { title: 'none' },
  ]);

  assert.deepEqual(groups.map((g) => [g.category, g.stories.map((s) => s.title)]), [
    ['AI', ['a1', 'a2']],
    ['Security', ['s1']],
    ['Other', ['none']],
  ]);
});
