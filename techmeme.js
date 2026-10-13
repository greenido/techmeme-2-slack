// ═══════════════════════════════════════════════════════════════════════════
// 📡 TECHMEME SCRAPER
// ═══════════════════════════════════════════════════════════════════════════
// Techmeme's homepage is ranked by importance, and each story is a cluster:
// a lead article plus related articles (".relitems") and a "More:" list of
// other coverage. We take one item per cluster — the lead — so the model
// never sees five headlines about the same announcement. (The RSS feed is not
// used: it lists the 15 newest posts in time order, not the ranked page.)
// ═══════════════════════════════════════════════════════════════════════════

const cheerio = require('cheerio');
const { fetchWithRetry } = require('./http');
const { cleanUrl } = require('./url');

const TECHMEME_URL = 'https://techmeme.com/';
const MAX_HEADLINES = 40;
const MAX_EXCERPT_LENGTH = 300;

// Absolute URL with tokens and tracking parameters removed (see url.js)
function toAbsoluteUrl(url) {
  return cleanUrl(url.startsWith('/') ? `https://techmeme.com${url}` : url);
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts ranked story clusters from Techmeme homepage HTML
 *
 * @param {string} html - Techmeme homepage HTML
 * @param {number} [limit] - Maximum number of items to return
 * @returns {Array<{text: string, url: string, coverage: number}>} One item per
 *   cluster, in page order; `coverage` counts related and "More:" articles
 */
function parseTechmemeHtml(html, limit = MAX_HEADLINES) {
  const $ = cheerio.load(html);
  const items = [];
  const seenUrls = new Set();

  $('.clus').each((_, cluster) => {
    if (items.length >= limit) return false;

    const $cluster = $(cluster);
    const $lead = $cluster.children('.itc1').find('.ii').first();
    const $headline = $lead.find('a.ourh').first();
    const headline = cleanText($headline.text());
    const href = $headline.attr('href');

    if (!headline || !href) return;

    const url = toAbsoluteUrl(href);
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    // The text after the bold headline is the article's opening excerpt
    const $excerpt = $lead.clone();
    $excerpt.find('strong, img').remove();
    const excerpt = cleanText($excerpt.text()).replace(/^[—–-]\s*/, '').slice(0, MAX_EXCERPT_LENGTH);

    const coverage = $cluster.find('.relitems .ii').length + $cluster.find('.bls a').length;

    items.push({ text: excerpt ? `${headline} — ${excerpt}` : headline, url, coverage });
  });

  if (items.length > 0) return items;

  // Fallback if the cluster markup changes: every headline-like item, deduped by URL
  console.log('⚠️  No story clusters found, falling back to .ii items...');
  $('.ii').each((_, el) => {
    if (items.length >= limit) return false;

    const $el = $(el);
    const href = $el.find('a').first().attr('href');
    const text = cleanText($el.text());
    if (!text || !href) return;

    const url = toAbsoluteUrl(href);
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    items.push({ text, url, coverage: 0 });
  });

  return items;
}

/**
 * Fetches and parses the ranked headlines from the Techmeme homepage
 *
 * @returns {Promise<Array<{text: string, url: string, coverage: number}>>}
 * @throws {Error} If the request fails or returns a non-2xx status
 */
async function fetchTechmemeContent() {
  console.log('\n📡 Fetching content from Techmeme...');

  try {
    const response = await fetchWithRetry(TECHMEME_URL, {}, { label: 'Techmeme fetch' });
    if (!response.ok) {
      throw new Error(`Techmeme returned HTTP ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    console.log('✓ Successfully retrieved HTML content');

    const items = parseTechmemeHtml(html);
    console.log(`✓ Successfully extracted ${items.length} stories`);

    if (items.length > 0) {
      console.log('   Preview of first item:');
      console.log(`   - Title: ${items[0].text.substring(0, 60)}...`);
      console.log(`   - URL: ${items[0].url}`);
    } else {
      console.warn('⚠️  Warning: No items were extracted!');
    }

    return items;
  } catch (error) {
    console.error('❌ Error fetching Techmeme:', error.message);
    throw error;
  }
}

module.exports = {
  TECHMEME_URL,
  fetchTechmemeContent,
  parseTechmemeHtml,
};
