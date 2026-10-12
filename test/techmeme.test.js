const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { parseTechmemeHtml } = require('../techmeme');

const html = fs.readFileSync(path.join(__dirname, 'fixtures/techmeme-home.html'), 'utf8');

test('returns one item per cluster lead, in page order', () => {
  const items = parseTechmemeHtml(html);

  assert.deepEqual(items.map((item) => item.url), [
    'https://news.example.com/acme-model',
    'https://techmeme.com/261012/p4',
  ]);
});

test('combines headline and excerpt, with whitespace collapsed', () => {
  const [first, second] = parseTechmemeHtml(html);

  assert.equal(first.text, 'Acme launches Rocket-2, a frontier AI model — Acme said the model beats rivals on agentic benchmarks.');
  assert.equal(second.text, 'Globex agrees to acquire Initech for $2B');
});

test('counts related items and "More:" links as coverage', () => {
  const [first, second] = parseTechmemeHtml(html);

  assert.equal(first.coverage, 4);
  assert.equal(second.coverage, 0);
});

test('respects the limit', () => {
  assert.equal(parseTechmemeHtml(html, 1).length, 1);
});

test('falls back to deduped .ii items when there are no clusters', () => {
  const items = parseTechmemeHtml('<div class="ii"><a href="/x">One</a></div><div class="ii"><a href="/x">Dup</a></div>');

  assert.deepEqual(items, [{ text: 'One', url: 'https://techmeme.com/x', coverage: 0 }]);
});
