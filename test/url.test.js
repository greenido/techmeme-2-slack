const assert = require('node:assert/strict');
const { test } = require('node:test');
const { cleanUrl } = require('../url');

test('strips gift and share tokens', () => {
  assert.equal(
    cleanUrl('https://news.example.com/a/b?view_token=eyJhbGciOiJIUzI1NiJ9.e30.c2ln&utm_medium=gift-link'),
    'https://news.example.com/a/b'
  );
  assert.equal(cleanUrl('https://paper.example.com/story?accessToken=eyJhbGciOi.e30.c2ln'), 'https://paper.example.com/story');
  assert.equal(cleanUrl('https://journal.example.com/deal-1a2b?st=AbC123&reflink=desktopwebshare_permalink'), 'https://journal.example.com/deal-1a2b');
});

test('strips tracking parameters, fragments and credentials', () => {
  assert.equal(cleanUrl('https://user:pass@site.example.com/x?utm_source=a&smid=b&fbclid=c#comments'), 'https://site.example.com/x');
  assert.equal(cleanUrl('https://social.example.com/u/status/123?s=46&t=AbCdEf'), 'https://social.example.com/u/status/123');
});

test('keeps parameters that identify content, unless they hold a token', () => {
  assert.equal(cleanUrl('https://www.youtube.com/watch?v=abc123XYZ_0&t=42s&si=share'), 'https://www.youtube.com/watch?v=abc123XYZ_0');
  assert.equal(cleanUrl('https://forum.example.com/item?id=4242'), 'https://forum.example.com/item?id=4242');
  assert.equal(cleanUrl('https://site.example.com/a?id=eyJhbGciOi.e30.c2ln'), 'https://site.example.com/a');
  assert.equal(cleanUrl(`https://site.example.com/a?p=${'x'.repeat(48)}`), 'https://site.example.com/a');
});

test('leaves clean URLs unchanged and handles unparseable input', () => {
  assert.equal(cleanUrl('https://example.com/path/'), 'https://example.com/path/');
  assert.equal(cleanUrl('not a url?token=x#y'), 'not a url');
});
