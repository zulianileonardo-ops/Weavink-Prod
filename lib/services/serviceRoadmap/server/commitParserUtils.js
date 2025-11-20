import {
  EMOJI_CATEGORY_MAP,
  SUBCATEGORY_KEYWORDS,
  CATEGORY_KEYS,
} from '../constants/roadmapConstants';

/**
 * Commit Parser Utilities
 * Shared utilities for parsing commit messages from both Git and GitHub API
 */

/**
 * Extract gitmoji from commit message
 * @param {string} message - Commit message
 * @returns {string|null} Extracted emoji or null
 */
export function extractGitmoji(message) {
  // Match emoji at the start of the message
  // This regex matches most emoji ranges
  const emojiRegex = /^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}])/u;
  const match = message.match(emojiRegex);
  return match ? match[1] : null;
}

/**
 * Infer subcategory from commit message keywords
 * @param {string} message - Commit message
 * @param {string} category - Parent category
 * @returns {string|null} Inferred subcategory or null
 */
export function inferSubcategory(message, category) {
  const lowerMessage = message.toLowerCase();

  // Check keywords
  for (const [keyword, subcategory] of Object.entries(SUBCATEGORY_KEYWORDS)) {
    if (lowerMessage.includes(keyword)) {
      return subcategory;
    }
  }

  return null;
}

/**
 * Parse commit data into standardized format
 * @param {Object} commitData - Raw commit data (from git or GitHub API)
 * @param {string} commitData.hash - Commit SHA
 * @param {string} commitData.author - Author name
 * @param {string} commitData.email - Author email
 * @param {Date|string} commitData.date - Commit date
 * @param {string} commitData.message - Full commit message
 * @returns {Object} Parsed commit object
 */
export function parseCommit(commitData) {
  const { hash, author, email, date, message } = commitData;

  const emoji = extractGitmoji(message);
  const category = EMOJI_CATEGORY_MAP[emoji] || CATEGORY_KEYS.OTHER;
  const cleanMessage = message.replace(emoji, '').trim();
  const subcategory = inferSubcategory(cleanMessage, category);

  return {
    hash,
    author,
    email,
    date: date instanceof Date ? date : new Date(date),
    message: cleanMessage,
    emoji,
    category,
    subcategory,
    type: 'commit',
  };
}
