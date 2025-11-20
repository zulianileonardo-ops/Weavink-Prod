import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ROADMAP_LIMITS,
  ROADMAP_ERRORS,
} from '../constants/roadmapConstants';
import { parseCommit } from './commitParserUtils';

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
      // In production (deployed environments), git is not available - return empty array
      const isGitAvailable = await this.validateGitRepository();
      if (!isGitAvailable) {
        console.warn(`⚠️ [GitService:${requestId}] Git not available (production environment), returning empty commits`);
        return [];
      }

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
            const parts = line.split('|');
            if (parts.length < 5) {
              throw new Error(`Invalid line format`);
            }

            const [hash, author, email, dateStr, ...messageParts] = parts;
            const message = messageParts.join('|'); // Re-join in case message contains |

            return parseCommit({
              hash,
              author,
              email,
              date: new Date(dateStr),
              message,
            });
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
   * Validate that we're in a git repository
   * @returns {Promise<boolean>} True if in a git repository, false otherwise
   */
  static async validateGitRepository() {
    try {
      await execPromise('git rev-parse --is-inside-work-tree', {
        timeout: 5000,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
