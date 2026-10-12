const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { filterUnsent, loadHistory, recentTitles, saveHistory } = require('../state');

const NOW = new Date('2026-10-12T15:00:00Z');
const history = [
  { url: 'https://a.example/old', title: 'Old', sentAt: '2026-09-20' },
  { url: 'https://a.example/week', title: 'Last week', sentAt: '2026-10-05' },
  { url: 'https://a.example/yesterday', title: 'Yesterday', sentAt: '2026-10-11' },
];

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'digest-state-')), 'nested/sent-stories.json');
}

test('loadHistory returns [] for missing or malformed files', () => {
  assert.deepEqual(loadHistory(tempFile()), []);

  const file = tempFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{not json');
  assert.deepEqual(loadHistory(file), []);
});

test('saveHistory appends today and prunes entries older than 14 days', () => {
  const file = tempFile();
  saveHistory(file, history, [{ url: 'https://a.example/today', title: 'Today', summary: 'ignored' }], NOW);

  assert.deepEqual(loadHistory(file), [
    { url: 'https://a.example/week', title: 'Last week', sentAt: '2026-10-05' },
    { url: 'https://a.example/yesterday', title: 'Yesterday', sentAt: '2026-10-11' },
    { url: 'https://a.example/today', title: 'Today', sentAt: '2026-10-12' },
  ]);
});

test('filterUnsent drops items sent within the history window', () => {
  const items = ['old', 'week', 'yesterday', 'new'].map((slug) => ({ url: `https://a.example/${slug}` }));

  assert.deepEqual(filterUnsent(items, history, NOW).map((item) => item.url), [
    'https://a.example/old',
    'https://a.example/new',
  ]);
});

test('recentTitles only returns titles from the last N days', () => {
  assert.deepEqual(recentTitles(history, 3, NOW), ['Yesterday']);
});
