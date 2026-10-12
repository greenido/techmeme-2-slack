const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, test } = require('node:test');
const { fetchWithRetry } = require('../http');

const hits = {};
let server;
let base;
const fast = { baseDelayMs: 10, timeoutMs: 200 };

before(async () => {
  server = http.createServer((req, res) => {
    hits[req.url] = (hits[req.url] || 0) + 1;
    const attempt = hits[req.url];

    switch (req.url) {
      case '/flaky':
        return attempt < 3 ? res.writeHead(503).end() : res.end('ok');
      case '/rate-limited':
        return attempt < 2
          ? res.writeHead(429, { 'content-type': 'application/json' }).end('{"ok":false,"parameters":{"retry_after":1}}')
          : res.end('ok');
      case '/hangs-once':
        return attempt < 2 ? undefined : res.end('ok');
      case '/not-found':
        return res.writeHead(404).end('nope');
      default:
        return res.writeHead(502).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test('retries transient 5xx responses until success', async () => {
  const response = await fetchWithRetry(`${base}/flaky`, {}, fast);

  assert.equal(await response.text(), 'ok');
  assert.equal(hits['/flaky'], 3);
});

test("honors Telegram's retry_after on 429", async () => {
  const start = Date.now();
  const response = await fetchWithRetry(`${base}/rate-limited`, {}, fast);

  assert.equal(await response.text(), 'ok');
  assert.ok(Date.now() - start >= 1000);
});

test('retries after a per-attempt timeout', async () => {
  const response = await fetchWithRetry(`${base}/hangs-once`, {}, fast);

  assert.equal(await response.text(), 'ok');
  assert.equal(hits['/hangs-once'], 2);
});

test('does not retry non-retryable statuses', async () => {
  const response = await fetchWithRetry(`${base}/not-found`, {}, fast);

  assert.equal(response.status, 404);
  assert.equal(hits['/not-found'], 1);
});

test('returns the last response after exhausting attempts', async () => {
  const response = await fetchWithRetry(`${base}/always-502`, {}, fast);

  assert.equal(response.status, 502);
  assert.equal(hits['/always-502'], 3);
});

test('throws after exhausting attempts on network errors', async () => {
  await assert.rejects(fetchWithRetry('http://127.0.0.1:1/', {}, fast));
});
