// lib/services/serviceContact/server/QueryTaggingService.js
// Query tagging service using Gemini 2.5 Flash via Firebase AI Logic
// Tags search queries with same vocabulary as contacts for better embedding alignment

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { redisClient, generateCacheKey } from './redisClient';
import { CostTrackingService } from './costTrackingService';
import { CONTACT_INTELLIGENCE_AI_CONFIG } from '@/lib/services/constants/aiCosts';
import { COMMON_CONTACT_TAGS } from './data/commonContactTags';
import crypto from 'crypto';

/**
 * QueryTaggingService
 *
 * Architecture:
 * - 3-tier caching: Static → Redis → Gemini AI (same as AutoTaggingService)
 * - Uses same vocabulary as contact auto-tagging for alignment
 * - Token-based cost calculation
 * - Session tracking support for multi-step operations
 *
 * Flow:
 * 1. Check static cache (COMMON_CONTACT_TAGS)
 * 2. Check Redis cache (24h TTL)
 * 3. Call Gemini 2.5 Flash for tag generation
 * 4. Store in Redis for future use
 * 5. Return tags for query enhancement
 */
export class QueryTaggingService {
  // Configuration (uses centralized config from aiCosts.js)
  static CONFIG = {
    MODEL_NAME: CONTACT_INTELLIGENCE_AI_CONFIG.MODEL_NAME,
    FEATURE_NAME: CONTACT_INTELLIGENCE_AI_CONFIG.QUERY_TAGGING.FEATURE_NAME,
    PROVIDER_NAME: CONTACT_INTELLIGENCE_AI_CONFIG.PROVIDER_NAME,
    STEP_LABEL: CONTACT_INTELLIGENCE_AI_CONFIG.QUERY_TAGGING.STEP_LABEL,
    CACHE_TTL: CONTACT_INTELLIGENCE_AI_CONFIG.QUERY_TAGGING.CACHE_TTL,
    CACHE_PREFIX: CONTACT_INTELLIGENCE_AI_CONFIG.QUERY_TAGGING.CACHE_PREFIX,
    PRICING: CONTACT_INTELLIGENCE_AI_CONFIG.PRICING
  };

  /**
   * Tag a search query with semantic tags
   *
   * @param {string} query - Search query to tag
   * @param {object} options - Options for tagging
   * @param {string} options.sessionId - Session ID for tracking
   * @param {string} options.userId - User ID for cost tracking
   * @param {boolean} options.trackSteps - Enable step tracking
   * @returns {Promise<object>} Tags and metadata
   */
  static async tagQuery(query, options = {}) {
    const {
      sessionId = null,
      userId = null,
      trackSteps = false,
      budgetCheck = null
    } = options;

    const tagId = `qtag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const startTime = Date.now();

    console.log(`🏷️ [QueryTagging] [${tagId}] Starting query tagging:`, {
      query: query.substring(0, 50),
      sessionId: sessionId || 'standalone'
    });

    try {
      // Step 1: Validate query
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        console.log(`⏭️ [QueryTagging] [${tagId}] Query too short, skipping`);
        return {
          tags: [],
          metadata: {
            tagSource: 'skipped',
            taggingSkipped: true,
            taggingSkippedReason: 'query_too_short'
          }
        };
      }

      const normalizedQuery = query.trim().toLowerCase();

      // Step 2: Check static cache (FREE - no cost)
      console.log(`📦 [QueryTagging] [${tagId}] Step 1: Checking static cache...`);
      const staticResult = this._checkStaticCache(normalizedQuery);

      if (staticResult) {
        const duration = Date.now() - startTime;
        console.log(`✅ [QueryTagging] [${tagId}] ⚡ Static cache HIT (${duration}ms):`, {
          tags: staticResult.tags,
          cacheType: 'static'
        });

        // Track static cache hit
        if (userId && sessionId && trackSteps) {
          await CostTrackingService.recordUsage({
            userId,
            usageType: 'AIUsage',
            feature: this.CONFIG.FEATURE_NAME,
            cost: 0,
            isBillableRun: false,
            provider: 'static_cache',
            budgetCheck,
            metadata: {
              cacheType: 'static',
              tagsGenerated: staticResult.tags.length,
              tagId,
              query: query.substring(0, 50),
              tagsParsed: staticResult.tags
            },
            sessionId,
            stepLabel: `${this.CONFIG.STEP_LABEL} (Static Cache)`
          });
        }

        return {
          tags: staticResult.tags,
          metadata: {
            tagSource: 'static_cache',
            duration,
            tagId
          }
        };
      }
      console.log(`   ⏭️ Static cache miss, checking Redis...`);

      // Step 3: Check Redis cache
      console.log(`📦 [QueryTagging] [${tagId}] Step 2: Checking Redis cache...`);
      const cacheKey = this.getQueryCacheKey(normalizedQuery);
      const redisResult = await this._checkRedisCache(cacheKey, tagId);

      if (redisResult) {
        const duration = Date.now() - startTime;
        console.log(`✅ [QueryTagging] [${tagId}] ⚡ Redis cache HIT (${duration}ms):`, {
          tags: redisResult.tags,
          cacheType: 'redis',
          ttl: redisResult.ttl
        });

        // Track Redis cache hit
        if (userId && sessionId && trackSteps) {
          await CostTrackingService.recordUsage({
            userId,
            usageType: 'AIUsage',
            feature: this.CONFIG.FEATURE_NAME,
            cost: 0,
            isBillableRun: false,
            provider: 'redis_cache',
            budgetCheck,
            metadata: {
              cacheType: 'redis',
              tagsGenerated: redisResult.tags.length,
              tagId,
              query: query.substring(0, 50),
              ttl: redisResult.ttl,
              tagsParsed: redisResult.tags
            },
            sessionId,
            stepLabel: `${this.CONFIG.STEP_LABEL} (Redis Cache)`
          });
        }

        return {
          tags: redisResult.tags,
          metadata: {
            tagSource: 'redis_cache',
            duration,
            tagId,
            ttl: redisResult.ttl
          }
        };
      }
      console.log(`   ⏭️ Redis cache miss, calling AI...`);

      // Step 4: Generate with AI
      console.log(`📦 [QueryTagging] [${tagId}] Step 3: Calling Gemini AI...`);
      const aiResult = await this._generateTagsWithAI(query, userId, sessionId, tagId, trackSteps, budgetCheck);

      // Step 5: Cache result in Redis
      await this._cacheInRedis(cacheKey, aiResult, tagId);

      const totalDuration = Date.now() - startTime;
      console.log(`✅ [QueryTagging] [${tagId}] Tagging complete (${totalDuration}ms):`, {
        tags: aiResult.tags,
        cost: aiResult.cost,
        cacheType: 'ai'
      });

      return {
        tags: aiResult.tags,
        metadata: {
          tagSource: 'gemini_ai',
          duration: totalDuration,
          tagId,
          cost: aiResult.cost,
          tokensUsed: aiResult.tokensUsed
        }
      };

    } catch (error) {
      console.error(`❌ [QueryTagging] [${tagId}] Error:`, error.message);

      // Return empty tags on error (graceful degradation)
      return {
        tags: [],
        metadata: {
          tagSource: 'error',
          taggingSkipped: true,
          taggingSkippedReason: 'error',
          error: error.message
        }
      };
    }
  }

  /**
   * Generate cache key for query tags
   */
  static getQueryCacheKey(query) {
    const normalized = query.trim().toLowerCase();
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    return generateCacheKey(this.CONFIG.CACHE_PREFIX, hash);
  }

  /**
   * Check static cache for common search terms
   * @private
   */
  static _checkStaticCache(query) {
    // Check for exact matches in COMMON_CONTACT_TAGS
    for (const [key, value] of Object.entries(COMMON_CONTACT_TAGS)) {
      if (query === key.toLowerCase()) {
        console.log(`   📌 Static cache exact match: "${key}"`);
        return { tags: value.tags };
      }
    }

    // Check for word matches (e.g., "tesla" in "who works at tesla")
    const words = query.split(/\s+/);

    // Tech companies mapping (same as AutoTaggingService for consistency)
    const techCompanies = {
      'google': ['tech-industry', 'google-employee', 'big-tech', 'silicon-valley'],
      'apple': ['tech-industry', 'apple-employee', 'big-tech', 'silicon-valley'],
      'microsoft': ['tech-industry', 'microsoft-employee', 'big-tech', 'enterprise'],
      'amazon': ['tech-industry', 'amazon-employee', 'big-tech', 'ecommerce'],
      'meta': ['tech-industry', 'meta-employee', 'big-tech', 'social-media'],
      'facebook': ['tech-industry', 'meta-employee', 'big-tech', 'social-media'],
      'tesla': ['automotive-industry', 'tesla-employee', 'electric-vehicles', 'technology'],
      'spacex': ['aerospace-industry', 'spacex-employee', 'space-tech', 'engineering']
    };

    // Check if query contains company name
    for (const [companyKey, tags] of Object.entries(techCompanies)) {
      if (query.includes(companyKey)) {
        console.log(`   📌 Static cache company match: "${companyKey}"`);
        return { tags };
      }
    }

    // Check for role-based matches
    for (const word of words) {
      if (word.length < 2) continue;

      for (const [key, value] of Object.entries(COMMON_CONTACT_TAGS)) {
        if (word === key.toLowerCase() || key.toLowerCase() === word) {
          console.log(`   📌 Static cache word match: "${key}" from "${word}"`);
          return { tags: value.tags };
        }
      }
    }

    return null;
  }

  /**
   * Check Redis cache
   * @private
   */
  static async _checkRedisCache(cacheKey, tagId) {
    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        const ttl = await redisClient.ttl(cacheKey);
        return {
          tags: cached.tags,
          ttl
        };
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ [QueryTagging] [${tagId}] Redis cache check failed:`, error.message);
      return null;
    }
  }

  /**
   * Generate tags with Gemini AI
   * @private
   */
  static async _generateTagsWithAI(query, userId, sessionId, tagId, trackSteps, budgetCheck = null) {
    const aiStartTime = Date.now();

    try {
      // Initialize Firebase AI
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_apiKey,
        authDomain: process.env.NEXT_PUBLIC_authDomain,
        projectId: process.env.NEXT_PUBLIC_projectId,
        storageBucket: process.env.NEXT_PUBLIC_storageBucket,
        messagingSenderId: process.env.NEXT_PUBLIC_messagingSenderId,
        appId: process.env.NEXT_PUBLIC_appId
      };

      const { initializeApp: initClientApp, getApps: getClientApps } = await import('firebase/app');
      const apps = getClientApps();
      const firebaseApp = apps.length > 0 ? apps[0] : initClientApp(firebaseConfig);

      const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, { model: this.CONFIG.MODEL_NAME });

      // Build prompt
      const prompt = this._buildQueryTaggingPrompt(query);

      console.log(`   📝 Sending prompt to Gemini (${prompt.length} chars)`);

      // Call Gemini
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.tags || !Array.isArray(parsed.tags)) {
        throw new Error('Missing or invalid tags in Gemini response');
      }

      // Calculate cost
      const actualInputTokens = Math.ceil(prompt.length / 4);
      const actualOutputTokens = Math.ceil(text.length / 4);
      const actualCost = (actualInputTokens / 1000000) * this.CONFIG.PRICING.INPUT_PER_MILLION +
                         (actualOutputTokens / 1000000) * this.CONFIG.PRICING.OUTPUT_PER_MILLION;

      const aiDuration = Date.now() - aiStartTime;

      console.log(`   ✅ Gemini response received (${aiDuration}ms):`, {
        inputTokens: actualInputTokens,
        outputTokens: actualOutputTokens,
        cost: actualCost.toFixed(8),
        tagsCount: parsed.tags.length
      });

      // Track cost
      if (userId && trackSteps) {
        await CostTrackingService.recordUsage({
          userId,
          usageType: 'AIUsage',
          feature: this.CONFIG.FEATURE_NAME,
          cost: actualCost,
          isBillableRun: true,
          provider: this.CONFIG.PROVIDER_NAME,
          budgetCheck,
          metadata: {
            inputTokens: actualInputTokens,
            outputTokens: actualOutputTokens,
            tagsGenerated: parsed.tags.length,
            tagId,
            query: query.substring(0, 50),
            // Full AI input/output for debugging (matching AutoTaggingService pattern)
            promptSent: prompt,
            responseReceived: text,
            tagsParsed: parsed.tags
          },
          sessionId,
          stepLabel: `${this.CONFIG.STEP_LABEL} (AI Generation)`
        });

        console.log(`   💰 Cost tracked: $${actualCost.toFixed(8)} for user ${userId}`);
      }

      return {
        tags: parsed.tags,
        cost: actualCost,
        tokensUsed: {
          inputTokens: actualInputTokens,
          outputTokens: actualOutputTokens
        },
        duration: aiDuration
      };

    } catch (error) {
      console.error(`❌ [QueryTagging] [${tagId}] Gemini call failed:`, error.message);
      throw error;
    }
  }

  /**
   * Build query tagging prompt for Gemini
   * @private
   */
  static _buildQueryTaggingPrompt(query) {
    return `You are a query categorization AI for a contact search system.

Your task: Generate semantic tags that would MATCH contacts relevant to this search query.
These tags should use the SAME vocabulary as contact auto-tagging.

SEARCH QUERY: "${query}"

INSTRUCTIONS:
1. Identify what the user is searching for (company, role, industry, etc.)
2. Generate 2-5 tags that contacts matching this query would have
3. Use lowercase, hyphenated format (e.g., "tesla-employee", "tech-industry")
4. Focus on MATCHING contact tags, not just expanding the query
5. Think: "What tags would contacts have that match this query?"

EXAMPLES:

Query: "Who works at Tesla?"
Tags: ["tesla-employee", "automotive-industry"]

Query: "Find me CEOs"
Tags: ["ceo", "executive", "c-level", "leadership"]

Query: "AI engineers in startups"
Tags: ["ai", "engineer", "startup", "machine-learning"]

Query: "marketing people"
Tags: ["marketing", "digital-marketing", "growth-marketing"]

Query: "founders"
Tags: ["founder", "entrepreneur", "startup", "leadership"]

RESPOND ONLY WITH JSON: {"tags": [...]}`;
  }

  /**
   * Cache result in Redis
   * @private
   */
  static async _cacheInRedis(cacheKey, result, tagId) {
    try {
      const cacheData = {
        tags: result.tags,
        cachedAt: new Date().toISOString()
      };

      const ttl = this.CONFIG.CACHE_TTL;
      const success = await redisClient.set(cacheKey, cacheData, ttl);

      if (success) {
        console.log(`   💾 Cached in Redis (TTL: ${ttl}s)`);
      } else {
        console.warn(`   ⚠️ Redis caching failed (non-critical)`);
      }
    } catch (error) {
      console.warn(`⚠️ [QueryTagging] [${tagId}] Redis caching error:`, error.message);
      // Non-critical error, continue
    }
  }

  /**
   * Estimate tagging cost for a query
   */
  static estimateTaggingCost(query) {
    const promptBase = 500; // Base prompt structure
    const queryLength = query.length;
    const totalInputChars = promptBase + queryLength;
    const estimatedInputTokens = Math.ceil(totalInputChars / 4);
    const estimatedOutputTokens = 30; // Typical: 3-5 tags, ~100 chars

    const cost = (estimatedInputTokens / 1000000) * this.CONFIG.PRICING.INPUT_PER_MILLION +
                 (estimatedOutputTokens / 1000000) * this.CONFIG.PRICING.OUTPUT_PER_MILLION;

    return cost;
  }
}
