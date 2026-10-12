// Shared HTTP helper: native fetch with a per-attempt timeout and retries
// on network errors and transient HTTP statuses.

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRY_DELAY_MS = 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads how long the server asked us to wait, from the Retry-After header
 * or Telegram's `parameters.retry_after` body field
 *
 * @param {Response} response - A 429/5xx response
 * @returns {Promise<number|null>} Delay in milliseconds, or null if not specified
 */
async function getRetryAfterMs(response) {
  const header = Number(response.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return header * 1000;

  const body = await response.clone().json().catch(() => null);
  const retryAfter = Number(body?.parameters?.retry_after);
  return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null;
}

/**
 * fetch() with a timeout per attempt and exponential-backoff retries
 *
 * Returns the last response even if it is not ok, so callers can read the
 * error body; throws only when every attempt failed without a response.
 *
 * @param {string} url - Request URL
 * @param {RequestInit} [options] - fetch options
 * @param {{attempts?: number, timeoutMs?: number, baseDelayMs?: number, label?: string}} [retry]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, { attempts = 3, timeoutMs = 15_000, baseDelayMs = 1_000, label = 'Request' } = {}) {
  for (let attempt = 1; ; attempt++) {
    let response;
    let error;

    try {
      response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    } catch (fetchError) {
      error = fetchError;
    }

    if (response && (response.ok || !RETRYABLE_STATUS_CODES.has(response.status))) {
      return response;
    }

    if (attempt >= attempts) {
      if (response) return response;
      throw error;
    }

    const retryAfterMs = response ? await getRetryAfterMs(response) : null;
    const delayMs = Math.min(retryAfterMs ?? baseDelayMs * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
    const reason = response ? `HTTP ${response.status}` : error.message;
    console.warn(`   ⚠️  ${label} failed (${reason}); retrying in ${(delayMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${attempts})`);
    await sleep(delayMs);
  }
}

module.exports = { fetchWithRetry };
