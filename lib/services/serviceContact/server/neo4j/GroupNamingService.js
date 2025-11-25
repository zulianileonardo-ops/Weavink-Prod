// lib/services/serviceContact/server/neo4j/GroupNamingService.js
// AI-powered group naming service using Gemini
// Generates creative, contextual names for suggested groups
// Includes Redis caching to minimize API calls

import { GoogleGenerativeAI } from '@google/generative-ai';
import { redisClient } from '../redisClient.js';
import crypto from 'crypto';

// Cache TTL: 1 hour (3600 seconds)
const CACHE_TTL = 3600;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * GroupNamingService - Generates creative group names using Gemini AI
 *
 * Features:
 * - Type-specific prompts for company, tag, semantic, and knows suggestions
 * - Redis caching with 1-hour TTL to minimize API costs
 * - Graceful fallback to static names on API failure
 * - Batch naming support for multiple suggestions
 */
export class GroupNamingService {
  /**
   * Generate a creative name for a single group suggestion
   * Uses Redis cache to avoid repeated API calls for the same suggestion
   *
   * @param {object} suggestion - The suggestion object with type, members, metadata
   * @returns {Promise<string>} The generated (or cached) group name
   */
  static async generateGroupName(suggestion) {
    const cacheKey = this._getCacheKey(suggestion);

    try {
      // 1. Check Redis cache first
      const cached = await redisClient.get(cacheKey, false);
      if (cached) {
        console.log(`📛 [GroupNaming] Cache hit for ${suggestion.type}: ${cached}`);
        return cached;
      }

      // 2. Generate name via Gemini
      const name = await this._callGemini(suggestion);

      // 3. Cache the result
      await redisClient.set(cacheKey, name, CACHE_TTL);
      console.log(`📛 [GroupNaming] Generated and cached: ${name}`);

      return name;

    } catch (error) {
      console.error(`❌ [GroupNaming] Error generating name:`, error.message);
      return this._getFallbackName(suggestion);
    }
  }

  /**
   * Generate names for multiple suggestions in parallel
   * More efficient than calling generateGroupName sequentially
   *
   * @param {Array} suggestions - Array of suggestion objects
   * @returns {Promise<Array>} Suggestions with AI-generated names
   */
  static async nameSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      return suggestions;
    }

    console.log(`📛 [GroupNaming] Naming ${suggestions.length} suggestions...`);

    // Process all suggestions in parallel
    const namingPromises = suggestions.map(async (suggestion) => {
      try {
        const name = await this.generateGroupName(suggestion);
        return { ...suggestion, name };
      } catch (error) {
        console.error(`❌ [GroupNaming] Failed to name suggestion:`, error.message);
        return { ...suggestion, name: this._getFallbackName(suggestion) };
      }
    });

    const namedSuggestions = await Promise.all(namingPromises);
    console.log(`✅ [GroupNaming] Named ${namedSuggestions.length} suggestions`);

    return namedSuggestions;
  }

  /**
   * Call Gemini to generate a creative group name
   * @private
   */
  static async _callGemini(suggestion) {
    const prompt = this._buildPrompt(suggestion);

    // Use gemini-2.0-flash-lite for fast, cheap naming
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract just the name (remove any extra text)
    return this._parseResponse(text);
  }

  /**
   * Build a type-specific prompt for Gemini
   * @private
   */
  static _buildPrompt(suggestion) {
    const memberNames = (suggestion.members || [])
      .slice(0, 8) // Limit to 8 members for prompt size
      .map(m => m.name || 'Unknown')
      .join(', ');

    const prompts = {
      company: `Generate a creative, professional group name for contacts who work at ${suggestion.metadata?.company || 'the same company'}.
Members: ${memberNames}
The name should be catchy but professional (e.g., "Tesla Innovators", "Google Dream Team", "Apple Visionaries").
Return ONLY the group name, nothing else. Keep it under 30 characters.`,

      tag: `Generate a creative group name for contacts tagged with "${suggestion.metadata?.tag || 'a common tag'}".
Members: ${memberNames}
The name should creatively reflect the tag theme (e.g., for "AI" tag: "AI Pioneers", for "Sales" tag: "Deal Closers", for "Marketing" tag: "Brand Builders").
Return ONLY the group name, nothing else. Keep it under 30 characters.`,

      semantic: `Generate a creative group name for these similar professionals who share common traits:
Members: ${memberNames}
Context: ${suggestion.reason || 'Similar professional profiles'}
The name should hint at their shared characteristics (e.g., "Tech Visionaries", "Marketing Mavens", "Growth Hackers").
Return ONLY the group name, nothing else. Keep it under 30 characters.`,

      knows: `Generate a creative group name for this social network cluster:
Central person: ${suggestion.metadata?.centralContact || 'Unknown'}
Connected to: ${memberNames}
The name should reflect their social connection (e.g., "Inner Circle", "Core Network", "Close Connections", "${suggestion.metadata?.centralContact?.split(' ')[0] || 'Key'}'s Network").
Return ONLY the group name, nothing else. Keep it under 30 characters.`
    };

    return prompts[suggestion.type] || prompts.semantic;
  }

  /**
   * Parse the Gemini response to extract just the name
   * @private
   */
  static _parseResponse(text) {
    // Clean up the response - remove quotes, newlines, extra spaces
    let name = text
      .trim()
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n/g, ' ')         // Remove newlines
      .replace(/\s+/g, ' ')        // Collapse multiple spaces
      .trim();

    // Limit length to 30 characters
    if (name.length > 30) {
      name = name.substring(0, 27) + '...';
    }

    return name;
  }

  /**
   * Get a fallback name when AI generation fails
   * @private
   */
  static _getFallbackName(suggestion) {
    const fallbacks = {
      company: `${suggestion.metadata?.company || 'Company'} Team`,
      tag: `${suggestion.metadata?.tag || 'Tagged'} Group`,
      semantic: 'Similar Contacts',
      knows: 'Connected Network'
    };
    return fallbacks[suggestion.type] || 'Contact Group';
  }

  /**
   * Generate a cache key for a suggestion
   * Uses MD5 hash of member IDs for stable, unique keys
   * @private
   */
  static _getCacheKey(suggestion) {
    const memberIds = (suggestion.members || [])
      .map(m => m.id)
      .sort()
      .join('-');

    const hash = crypto
      .createHash('md5')
      .update(memberIds)
      .digest('hex')
      .slice(0, 12);

    return `group_name:${suggestion.type}:${hash}`;
  }

  /**
   * Clear cached names for a specific type or all types
   * @param {string} type - Optional type to clear (company, tag, semantic, knows)
   */
  static async clearCache(type = null) {
    const pattern = type
      ? `group_name:${type}:*`
      : 'group_name:*';

    const cleared = await redisClient.clearPattern(pattern);
    console.log(`🗑️ [GroupNaming] Cleared ${cleared} cached names`);
    return cleared;
  }
}

export default GroupNamingService;
