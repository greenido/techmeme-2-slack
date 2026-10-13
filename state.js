// ═══════════════════════════════════════════════════════════════════════════
// 🗂️  SENT-STORY HISTORY
// ═══════════════════════════════════════════════════════════════════════════
// Remembers which stories were delivered recently, so the next digest can skip
// exact repeats (same URL) and let Gemini avoid re-covering the same events.
// Stored as JSON: { "stories": [{ "url", "title", "sentAt": "YYYY-MM-DD" }] }
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { cleanUrl } = require('./url');

const HISTORY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function isRecent(sentAt, days, now) {
  const time = Date.parse(sentAt);
  return Number.isFinite(time) && now - time < days * DAY_MS;
}

/**
 * Loads the sent-story history; a missing or unreadable file means no history
 *
 * @param {string} filePath - Path to the JSON history file
 * @returns {Array<{url: string, title: string, sentAt: string}>}
 */
function loadHistory(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // URLs are re-cleaned so entries written before url.js existed lose their tokens
    return Array.isArray(parsed?.stories)
      ? parsed.stories
        .filter((story) => typeof story?.url === 'string')
        .map((story) => ({ ...story, url: cleanUrl(story.url) }))
      : [];
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`⚠️  Ignoring unreadable history file ${filePath}: ${error.message}`);
    }
    return [];
  }
}

/**
 * Appends today's delivered stories and drops entries older than HISTORY_DAYS
 *
 * @param {string} filePath - Path to the JSON history file
 * @param {Array<{url: string, title: string, sentAt: string}>} history - Existing history
 * @param {Array<{url: string, title: string}>} stories - Stories just delivered
 * @param {Date} [now] - Current time (for tests)
 */
function saveHistory(filePath, history, stories, now = new Date()) {
  const sentAt = now.toISOString().slice(0, 10);
  const updated = [
    ...history.filter((story) => isRecent(story.sentAt, HISTORY_DAYS, now.getTime())),
    ...stories.map(({ url, title }) => ({ url: cleanUrl(url), title, sentAt })),
  ];

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ stories: updated }, null, 2)}\n`);
}

/**
 * Splits scraped items into new ones and ones already sent recently
 *
 * @param {Array<{url: string}>} items - Scraped items
 * @param {Array<{url: string, sentAt: string}>} history - Sent-story history
 * @param {Date} [now] - Current time (for tests)
 * @returns {Array<object>} Items whose URL was not sent in the last HISTORY_DAYS
 */
function filterUnsent(items, history, now = new Date()) {
  const sentUrls = new Set(
    history.filter((story) => isRecent(story.sentAt, HISTORY_DAYS, now.getTime())).map((story) => story.url)
  );
  return items.filter((item) => !sentUrls.has(item.url));
}

/**
 * Whether a digest was already delivered today (UTC), to avoid double posts
 * when a manual run and the schedule land on the same day
 *
 * @param {Array<{sentAt: string}>} history - Sent-story history
 * @param {Date} [now] - Current time (for tests)
 * @returns {boolean}
 */
function sentToday(history, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return history.some((story) => story.sentAt === today);
}

/**
 * Titles sent in the last few days, for the prompt's "already covered" list
 *
 * @param {Array<{title: string, sentAt: string}>} history - Sent-story history
 * @param {number} days - How far back to look
 * @param {Date} [now] - Current time (for tests)
 * @returns {string[]}
 */
function recentTitles(history, days, now = new Date()) {
  return history
    .filter((story) => story.title && isRecent(story.sentAt, days, now.getTime()))
    .map((story) => story.title);
}

module.exports = {
  HISTORY_DAYS,
  filterUnsent,
  loadHistory,
  recentTitles,
  saveHistory,
  sentToday,
};
