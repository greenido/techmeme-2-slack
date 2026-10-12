const { groupByCategory } = require('./digest');

/**
 * Escapes text for GitHub-flavored Markdown (links, emphasis, inline HTML)
 *
 * @param {string} value - Plain text
 * @returns {string} Markdown-safe text
 */
function escapeMarkdown(value) {
  return String(value)
    .replace(/[\\`*_[\]|~]/g, '\\$&')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeMarkdownUrl(url) {
  return String(url).replace(/[()\s<>]/g, (char) => encodeURIComponent(char));
}

/**
 * Renders the digest as Markdown for the GitHub Actions job summary
 *
 * @param {Array<{category?: string, emoji: string, title: string, summary: string, url: string}>} stories
 * @param {string} formattedDate - Date shown in the heading
 * @returns {string} Markdown document
 */
function renderMarkdownSummary(stories, formattedDate) {
  const sections = groupByCategory(stories).map((group) => [
    `### ${escapeMarkdown(group.category)}`,
    '',
    ...group.stories.map((story) =>
      `- ${story.emoji} **[${escapeMarkdown(story.title)}](${escapeMarkdownUrl(story.url)})** — ${escapeMarkdown(story.summary)}`
    ),
  ].join('\n'));

  return [`## 📰 Techmeme Top ${stories.length} Digest - ${escapeMarkdown(formattedDate)}`, ...sections].join('\n\n') + '\n';
}

module.exports = {
  escapeMarkdown,
  renderMarkdownSummary,
};
