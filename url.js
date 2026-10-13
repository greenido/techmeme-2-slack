// ═══════════════════════════════════════════════════════════════════════════
// 🔗 URL CLEANING
// ═══════════════════════════════════════════════════════════════════════════
// Techmeme often links gift or share URLs whose query strings carry access
// tokens tied to the person who created them (e.g. Bloomberg `accessToken`
// JWTs include the creator's account ID, The Verge `view_token`, WSJ `st`).
// Every URL is cleaned as soon as it is scraped, so these never reach the
// history file, the posts, or the public Actions run pages.
//
// Query strings are dropped except for an allowlist of parameters that
// identify content on common sites; everything else (tokens, tracking, share
// metadata) is removed, along with the fragment and any user:password part.
// ═══════════════════════════════════════════════════════════════════════════

// Parameters that identify the content itself (e.g. YouTube `v`, Facebook `story_fbid`)
const CONTENT_PARAMS = new Set(['v', 'id', 'p', 'story_fbid']);

// JWTs ("eyJ…") and long opaque strings are tokens even under an allowed name
function looksLikeToken(value) {
  return /^eyJ/.test(value) || /^[A-Za-z0-9_\-.~+/=]{40,}$/.test(value);
}

/**
 * Removes tokens, tracking parameters, fragments and credentials from a URL
 *
 * @param {string} url - Absolute URL
 * @returns {string} Cleaned URL (unparseable input is returned without a query or fragment)
 */
function cleanUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return String(url).split(/[?#]/)[0];
  }

  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';

  for (const [key, value] of [...parsed.searchParams]) {
    if (!CONTENT_PARAMS.has(key) || looksLikeToken(value)) parsed.searchParams.delete(key);
  }

  return parsed.toString();
}

module.exports = { CONTENT_PARAMS, cleanUrl };
