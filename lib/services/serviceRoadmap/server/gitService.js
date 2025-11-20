import { exec } from 'child_process';
import { promisify } from 'util';
import {
  EMOJI_CATEGORY_MAP,
  ROADMAP_LIMITS,
  ROADMAP_ERRORS,
  SUBCATEGORY_KEYWORDS,
  CATEGORY_KEYS,
} from '../constants/roadmapConstants';

const execPromise = promisify(exec);

/**
 * Git Service - Parse git commit history
 * Server-side only service for parsing git log output
 */
export class GitService {
  /**
   * Get commit history from git log
   * @param {Object} options - Query options
   * @param {number} options.limit - Max commits to fetch (default: 500)
   * @param {string} options.since - Date to fetch commits since (optional)
   * @param {string} options.category - Filter by category (optional)
   * @returns {Promise<Array>} Array of parsed commits
   */
  static async getCommitHistory(options = {}) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`📊 [GitService:${requestId}] Fetching commit history`, options);

    try {
      // Validate we're in a git repository
      await this.validateGitRepository();

      // Build git log command
      const limit = Math.min(options.limit || 500, ROADMAP_LIMITS.MAX_COMMITS);
      const format = '%H|%an|%ae|%ad|%s';

      let command = `git log --pretty=format:"${format}" --date=iso -n ${limit}`;

      if (options.since) {
        // Sanitize date input
        const sinceDate = new Date(options.since);
        if (!isNaN(sinceDate.getTime())) {
          command += ` --since="${sinceDate.toISOString()}"`;
        }
      }

      console.log(`🔍 [GitService:${requestId}] Executing:`, command);

      // Execute with timeout
      const { stdout, stderr } = await execPromise(command, {
        timeout: ROADMAP_LIMITS.GIT_TIMEOUT_MS,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr) {
        console.warn(`⚠️ [GitService:${requestId}] Git stderr:`, stderr);
      }

      // Parse output
      const lines = stdout.trim().split('\n').filter(line => line);
      console.log(`✅ [GitService:${requestId}] Found ${lines.length} commits`);

      const commits = lines
        .map(line => {
          try {
            return this.parseCommitLine(line);
          } catch (error) {
            console.warn(`⚠️ [GitService:${requestId}] Failed to parse commit:`, line, error.message);
            return null;
          }
        })
        .filter(commit => commit !== null);

      // Filter by category if specified
      if (options.category) {
        return commits.filter(c => c.category === options.category);
      }

      return commits;

    } catch (error) {
      console.error(`💥 [GitService:${requestId}] Error:`, error);

      if (error.killed) {
        throw new Error(`${ROADMAP_ERRORS.GIT_TIMEOUT}: Timeout after ${ROADMAP_LIMITS.GIT_TIMEOUT_MS}ms`);
      }

      if (error.message.includes('Not a git repository')) {
        throw new Error(ROADMAP_ERRORS.GIT_NOT_REPOSITORY);
      }

      throw new Error(`${ROADMAP_ERRORS.GIT_COMMAND_FAILED}: ${error.message}`);
    }
  }

  /**
   * Parse a single git log line
   * @param {string} line - Git log line in format: hash|author|email|date|message
   * @returns {Object} Parsed commit object
   */
  static parseCommitLine(line) {
    const parts = line.split('|');
    if (parts.length < 5) {
      throw new Error(`${ROADMAP_ERRORS.GIT_PARSE_ERROR}: Invalid line format`);
    }

    const [hash, author, email, dateStr, ...messageParts] = parts;
    const message = messageParts.join('|'); // Re-join in case message contains |

    const emoji = this.extractGitmoji(message);
    const category = EMOJI_CATEGORY_MAP[emoji] || CATEGORY_KEYS.OTHER;
    const cleanMessage = message.replace(emoji, '').trim();
    const subcategory = this.inferSubcategory(cleanMessage, category);

    return {
      hash,
      author,
      email,
      date: new Date(dateStr),
      message: cleanMessage,
      emoji,
      category,
      subcategory,
      type: 'commit',
    };
  }

  /**
   * Extract gitmoji from commit message
   * @param {string} message - Commit message
   * @returns {string|null} Extracted emoji or null
   */
  static extractGitmoji(message) {
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
  static inferSubcategory(message, category) {
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
   * Validate that we're in a git repository
   * @throws {Error} If not in a git repository
   */
  static async validateGitRepository() {
    try {
      await execPromise('git rev-parse --is-inside-work-tree', {
        timeout: 5000,
      });
    } catch (error) {
      throw new Error(ROADMAP_ERRORS.GIT_NOT_REPOSITORY);
    }
  }
}
