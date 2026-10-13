// Guards the files the bot commits (data/*.json) against tokens and personal
// data. Runs in CI and in the daily workflow right before the history commit.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { cleanUrl } = require('../url');

const DATA_DIR = path.join(__dirname, '..', 'data');
const dataFiles = fs.readdirSync(DATA_DIR)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, text: fs.readFileSync(path.join(DATA_DIR, name), 'utf8') }));

const FORBIDDEN_PATTERNS = [
  ['JWT', /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ['email address', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/],
  ['Slack token', /xox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Telegram bot token', /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/],
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/],
  ['token-like query parameter', /[?&](?:[a-z_]*token|access_?token|st|code|key|sig|signature|auth|session)=/i],
];

test('data files contain no tokens or personal data', () => {
  for (const { name, text } of dataFiles) {
    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(text, pattern, `${name} contains a ${label}`);
    }
  }
});

test('every URL in the history file is already cleaned', () => {
  const history = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sent-stories.json'), 'utf8'));

  for (const { url } of history.stories) {
    assert.equal(url, cleanUrl(url), 'history URL still has a query string, fragment or credentials');
  }
});
