// lib/services/serviceContact/server/AutoTaggingService.js
// Auto-tagging service using Gemini 2.5 Flash via Firebase AI Logic
// Handles contact tag generation, intelligent caching, and cost tracking

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { redisClient, generateCacheKey } from './redisClient';
import { CostTrackingService } from './costTrackingService';
import { CONTACT_INTELLIGENCE_AI_CONFIG } from '@/lib/services/constants/aiCosts';
import { COMMON_CONTACT_TAGS } from './data/commonContactTags';
import crypto from 'crypto';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

/**
 * AutoTaggingService
 *
 * Architecture:
 * - 3-tier caching: Static → Redis → Gemini AI
 * - Budget independence (AI budget separate from API budget)
 * - Token-based cost calculation
 * - Session tracking support for multi-step operations
 *
 * Flow:
 * 1. Check if contact has taggable data
 * 2. Check static cache (COMMON_CONTACT_TAGS)
 * 3. Check Redis cache (24h TTL)
 * 4. Call Gemini 2.5 Flash for tag generation
 * 5. Store in Redis for future use
 */
export class AutoTaggingService {

  /**
   * Tag a contact with AI-powered categorization
   *
   * @param {object} contact - Contact to tag
   * @param {string} userId - User ID for cost tracking
   * @param {object} userData - User data for feature flags
   * @param {string|null} sessionId - Session ID for tracking (null = standalone)
   * @param {object|null} budgetCheck - Affordability check result from canAffordGeneric
   * @returns {Promise<object>} Contact with tags added
   */
  static async tagContact(contact, userId, userData, sessionId = null, budgetCheck = null) {
    const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    console.log(`🏷️ [AutoTagging] [${tagId}] Starting auto-tagging:`, {
      contactName: contact.name?.substring(0, 30) || 'unknown',
      sessionId: sessionId || 'standalone',
      hasJobTitle: !!contact.jobTitle,
      hasCompany: !!contact.company,
      hasNotes: !!contact.notes
    });

    const startTime = Date.now();

    try {
      // Step 1: Validate contact has taggable data
      if (!this.hasTaggableData(contact)) {
        console.log(`⏭️ [AutoTagging] [${tagId}] No taggable data, skipping`);
        return contact; // Return unchanged
      }

      // Step 2: Check if auto-tagging is enabled
      if (!this.isAutoTaggingEnabled(userData)) {
        console.log(`⏭️ [AutoTagging] [${tagId}] Auto-tagging disabled for user`);
        return contact;
      }

      // Step 3: Check static cache (FREE - no budget check needed)
      console.log(`📦 [AutoTagging] [${tagId}] Step 1: Checking static cache...`);
      const staticResult = this._checkStaticCache(contact);

      if (staticResult) {
        const duration = Date.now() - startTime;
        console.log(`✅ [AutoTagging] [${tagId}] ⚡ Static cache HIT (${duration}ms):`, {
          tags: staticResult.tags,
          cacheType: 'static'
        });

        // Track static cache hit as cost-free operation in session
        if (userId && sessionId) {
          await CostTrackingService.recordUsage({
            userId,
            usageType: 'AIUsage',
            feature: CONTACT_INTELLIGENCE_AI_CONFIG.AUTO_TAGGING.FEATURE_NAME,
            cost: 0, // Static cache is free
            isBillableRun: false, // No billable run for cache hit
            provider: 'static_cache',
            budgetCheck,  // Top-level parameter for session tracking
            metadata: {
              cacheType: 'static',
              tagsGenerated: staticResult.tags.length,
              tagId,
              contactName: contact.name
            },
            sessionId,
            stepLabel: 'Step 3: Auto-Tagging (Static Cache)'
          });
        }

        const taggedContact = {
          ...contact,
          tags: staticResult.tags,
          metadata: {
            ...contact.metadata,
            tagSource: 'static_cache',
            taggedAt: new Date().toISOString(),
            tagDuration: duration
          }
        };

        return taggedContact;
      }
      console.log(`   ⏭️ Static cache miss, checking Redis...`);

      // Step 5: Check Redis cache
      console.log(`📦 [AutoTagging] [${tagId}] Step 2: Checking Redis cache...`);
      const cacheKey = this.getTagCacheKey(contact);
      const redisResult = await this._checkRedisCache(cacheKey, tagId);

      if (redisResult) {
        const duration = Date.now() - startTime;
        console.log(`✅ [AutoTagging] [${tagId}] ⚡ Redis cache HIT (${duration}ms):`, {
          tags: redisResult.tags,
          cacheType: 'redis',
          ttl: `${redisResult.ttl}s remaining`
        });

        // Track Redis cache hit as cost-free operation in session
        if (userId && sessionId) {
          await CostTrackingService.recordUsage({
            userId,
            usageType: 'AIUsage',
            feature: CONTACT_INTELLIGENCE_AI_CONFIG.AUTO_TAGGING.FEATURE_NAME,
            cost: 0, // Redis cache is free
            isBillableRun: false, // No billable run for cache hit
            provider: 'redis_cache',
            budgetCheck,  // Top-level parameter for session tracking
            metadata: {
              cacheType: 'redis',
              tagsGenerated: redisResult.tags.length,
              cacheTTL: redisResult.ttl,
              tagId,
              contactName: contact.name
            },
            sessionId,
            stepLabel: 'Step 3: Auto-Tagging (Redis Cache)'
          });
        }

        const taggedContact = {
          ...contact,
          tags: redisResult.tags,
          metadata: {
            ...contact.metadata,
            tagSource: 'redis_cache',
            taggedAt: new Date().toISOString(),
            tagDuration: duration,
            cacheTTL: redisResult.ttl
          }
        };

        return taggedContact;
      }
      console.log(`   ⏭️ Redis cache miss, need AI generation...`);

      // Step 6: Check budget before AI call (caches are free, AI costs money)
      console.log(`💰 [AutoTagging] [${tagId}] Step 3: Checking AI budget...`);
      const estimatedCost = this.estimateTaggingCost(contact);
      const affordabilityCheck = await CostTrackingService.canAffordGeneric(
        userId,
        'AIUsage',
        estimatedCost,
        true // Requires billable run
      );

      if (!affordabilityCheck.canAfford) {
        console.log(`❌ [AutoTagging] [${tagId}] AI budget exceeded, skipping AI generation:`, {
          reason: affordabilityCheck.reason,
          estimatedCost
        });
        console.log(`   ℹ️ Free caches (static + Redis) were already checked - no tags available`);
        return contact; // Return unchanged (but we tried free caches first!)
      }

      console.log(`✅ [AutoTagging] [${tagId}] Budget OK, calling Gemini AI...`);

      // Step 7: Generate tags with Gemini AI
      console.log(`🤖 [AutoTagging] [${tagId}] Step 4: Calling Gemini 2.5 Flash...`);
      const aiResult = await this.generateTagsWithAI(contact, userId, sessionId, tagId, affordabilityCheck);

      // Step 8: Cache the result in Redis
      console.log(`💾 [AutoTagging] [${tagId}] Step 5: Caching result in Redis...`);
      await this._cacheInRedis(cacheKey, aiResult, tagId);

      const totalDuration = Date.now() - startTime;
      console.log(`✅ [AutoTagging] [${tagId}] Tagging complete (${totalDuration}ms):`, {
        tags: aiResult.tags,
        cost: aiResult.cost,
        cacheType: 'ai'
      });

      const taggedContact = {
        ...contact,
        tags: aiResult.tags,
        metadata: {
          ...contact.metadata,
          tagSource: 'gemini_ai',
          taggedAt: new Date().toISOString(),
          tagDuration: totalDuration,
          tagCost: aiResult.cost,
          tokensUsed: aiResult.tokensUsed
        }
      };

      return taggedContact;

    } catch (error) {
      console.error(`❌ [AutoTagging] [${tagId}] Tagging failed:`, {
        message: error.message,
        contactName: contact.name
      });

      // Fallback: return original contact without tags (graceful degradation)
      console.log(`🔄 [AutoTagging] [${tagId}] Using fallback (no tags added)`);
      return contact;
    }
  }

  /**
   * Check if auto-tagging is enabled for user
   * @param {object} userData - User data
   * @returns {boolean}
   */
  static isAutoTaggingEnabled(userData) {
    // Check if user has auto-tagging enabled in settings
    // Auto-tagging is grouped with location enrichment features
    return userData?.settings?.locationFeatures?.autoTagging === true;
  }

  /**
   * Check if contact has sufficient data for tagging
   * @param {object} contact - Contact to check
   * @returns {boolean}
   */
  static hasTaggableData(contact) {
    // Contact needs at least one of: name, company, jobTitle, or substantial notes
    const hasName = !!contact.name && contact.name.length > 1;
    const hasCompany = !!contact.company && contact.company.length > 1;
    const hasJobTitle = !!contact.jobTitle && contact.jobTitle.length > 1;
    const hasNotes = !!contact.notes && contact.notes.length > 10;

    return hasName || hasCompany || hasJobTitle || hasNotes;
  }

  /**
   * Estimate tagging cost based on contact data
   * @param {object} contact - Contact to estimate
   * @returns {number} Estimated cost in USD
   */
  static estimateTaggingCost(contact) {
    // Build approximate prompt length
    const promptBase = 400; // Base prompt structure
    const nameLength = contact.name?.length || 0;
    const companyLength = contact.company?.length || 0;
    const jobTitleLength = contact.jobTitle?.length || 0;
    const notesLength = Math.min(contact.notes?.length || 0, 200); // Cap notes at 200 chars

    const totalInputChars = promptBase + nameLength + companyLength + jobTitleLength + notesLength;
    const estimatedInputTokens = Math.ceil(totalInputChars / 4);

    // Estimate output (typical: 5-10 tags, ~100 chars)
    const estimatedOutputTokens = 30;

    const cost = (estimatedInputTokens / 1000000) * CONTACT_INTELLIGENCE_AI_CONFIG.PRICING.INPUT_PER_MILLION +
                 (estimatedOutputTokens / 1000000) * CONTACT_INTELLIGENCE_AI_CONFIG.PRICING.OUTPUT_PER_MILLION;

    return cost;
  }

  /**
   * Generate cache key for contact tags
   * @param {object} contact - Contact object
   * @returns {string} Cache key
   */
  static getTagCacheKey(contact) {
    // Create hash of contact's core identity fields
    const content = this._hashContactContent(contact);
    return generateCacheKey('contact_tags', content);
  }

  /**
   * Hash contact content for cache key
   * @private
   */
  static _hashContactContent(contact) {
    const parts = [
      contact.name?.trim().toLowerCase() || '',
      contact.company?.trim().toLowerCase() || '',
      contact.jobTitle?.trim().toLowerCase() || '',
      contact.notes?.substring(0, 100).trim().toLowerCase() || ''
    ];

    const content = parts.filter(p => p).join('|');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check static cache for common job titles/companies
   * @private
   */
  static _checkStaticCache(contact) {
    const jobTitle = contact.jobTitle?.trim().toLowerCase() || '';
    const company = contact.company?.trim().toLowerCase() || '';

    // Priority 1: Check company match (HIGHEST PRIORITY)
    // Company-specific tags are more valuable and specific than generic role tags
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

    for (const [companyKey, tags] of Object.entries(techCompanies)) {
      if (company.includes(companyKey)) {
        console.log(`   📌 Static cache match (company): "${companyKey}"`);
        return { tags };
      }
    }

    // Priority 2: Check job title exact match
    for (const [key, value] of Object.entries(COMMON_CONTACT_TAGS)) {
      if (jobTitle === key.toLowerCase()) {
        console.log(`   📌 Static cache match (jobTitle): "${key}"`);
        return { tags: value.tags };
      }
    }

    // Priority 3: Check job title partial match (lowest priority)
    // Only matches if company didn't match above
    for (const [key, value] of Object.entries(COMMON_CONTACT_TAGS)) {
      if (jobTitle.includes(key.toLowerCase()) && key.length >= 3) {
        console.log(`   📌 Static cache partial match (jobTitle): "${key}" in "${contact.jobTitle}"`);
        return { tags: value.tags };
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
      console.warn(`⚠️ [AutoTagging] [${tagId}] Redis cache check failed:`, error.message);
      return null;
    }
  }

  /**
   * Generate tags with Gemini AI
   */
  static async generateTagsWithAI(contact, userId, sessionId, tagId, budgetCheck = null) {
    const aiStartTime = Date.now();

    try {
      // Initialize Firebase AI with Developer API backend
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_apiKey,
        authDomain: process.env.NEXT_PUBLIC_authDomain,
        projectId: process.env.NEXT_PUBLIC_projectId,
        storageBucket: process.env.NEXT_PUBLIC_storageBucket,
        messagingSenderId: process.env.NEXT_PUBLIC_messagingSenderId,
        appId: process.env.NEXT_PUBLIC_appId
      };

      // Initialize Firebase App (client SDK)
      const { initializeApp: initClientApp, getApps: getClientApps } = await import('firebase/app');
      const apps = getClientApps();
      const firebaseApp = apps.length > 0 ? apps[0] : initClientApp(firebaseConfig);

      // Initialize AI with Gemini Developer API backend
      const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

      // Create model
      const model = getGenerativeModel(ai, { model: CONTACT_INTELLIGENCE_AI_CONFIG.MODEL_NAME });

      // Build prompt
      const prompt = this._buildTaggingPrompt(contact);

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

      // Calculate actual cost based on real token usage
      const actualInputTokens = Math.ceil(prompt.length / 4);
      const actualOutputTokens = Math.ceil(text.length / 4);

      const actualCost = (actualInputTokens / 1000000) * CONTACT_INTELLIGENCE_AI_CONFIG.PRICING.INPUT_PER_MILLION +
                         (actualOutputTokens / 1000000) * CONTACT_INTELLIGENCE_AI_CONFIG.PRICING.OUTPUT_PER_MILLION;

      const aiDuration = Date.now() - aiStartTime;

      console.log(`   ✅ Gemini response received (${aiDuration}ms):`, {
        inputTokens: actualInputTokens,
        outputTokens: actualOutputTokens,
        cost: actualCost.toFixed(8),
        tagsCount: parsed.tags.length
      });

      // Track cost (record actual cost, not estimate)
      if (userId) {
        await CostTrackingService.recordUsage({
          userId,
          usageType: 'AIUsage',
          feature: CONTACT_INTELLIGENCE_AI_CONFIG.AUTO_TAGGING.FEATURE_NAME,
          cost: actualCost,
          isBillableRun: true, // Auto-tagging is billable
          provider: CONTACT_INTELLIGENCE_AI_CONFIG.PROVIDER_NAME,
          budgetCheck,  // Top-level parameter for session tracking
          metadata: {
            inputTokens: actualInputTokens,
            outputTokens: actualOutputTokens,
            tagsGenerated: parsed.tags.length,
            tagId,
            contactName: contact.name
          },
          sessionId,
          stepLabel: 'Step 3: Auto-Tagging (AI Generation)'
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
      console.error(`❌ [AutoTagging] [${tagId}] Gemini call failed:`, error.message);
      throw error;
    }
  }

  /**
   * Build tagging prompt for Gemini
   * @private
   */
  static _buildTaggingPrompt(contact) {
    const parts = [];

    if (contact.name) parts.push(`Name: ${contact.name}`);
    if (contact.company) parts.push(`Company: ${contact.company}`);
    if (contact.jobTitle) parts.push(`Job Title: ${contact.jobTitle}`);
    if (contact.email) parts.push(`Email: ${contact.email}`);
    if (contact.notes) parts.push(`Notes: ${contact.notes.substring(0, 200)}`);

    const contactInfo = parts.join('\n');

    return `You are a contact categorization AI for a professional networking system.

Your task: Generate relevant semantic tags for this contact to enable smart categorization and search.

CONTACT INFORMATION:
${contactInfo}

INSTRUCTIONS:
1. Generate 3-8 relevant tags based on the contact's information
2. Tags should be lowercase, hyphenated (e.g., "software-engineer")
3. Include: job role, industry, company type, seniority, skills, technologies
4. Be specific and descriptive
5. Avoid generic tags like "professional" or "person"

TAG CATEGORIES TO CONSIDER:
- Job roles: "software-engineer", "product-manager", "ceo", "founder"
- Seniority: "senior", "junior", "mid-level", "executive", "c-level"
- Industries: "tech-industry", "healthcare", "finance", "education"
- Technologies: "ai", "blockchain", "cloud", "mobile-development"
- Company types: "startup", "enterprise", "big-tech", "saas"
- Specializations: "frontend", "backend", "data-science", "devops"

EXAMPLES:

Input: Name: "John Smith", Job Title: "Senior Software Engineer", Company: "Google"
Output: {
  "tags": ["senior-software-engineer", "software-engineer", "google-employee", "tech-industry", "big-tech", "engineer"]
}

Input: Name: "Marie Dubois", Job Title: "CEO", Company: "TechStartup"
Output: {
  "tags": ["ceo", "executive", "c-level", "founder", "startup", "leadership", "tech-entrepreneur"]
}

Input: Name: "Alex Chen", Job Title: "Product Manager", Company: "Microsoft", Notes: "Specializes in AI products"
Output: {
  "tags": ["product-manager", "microsoft-employee", "big-tech", "ai", "product-management", "tech-industry"]
}

RULES:
- Generate 3-8 tags minimum
- All lowercase, hyphenated format
- No duplicates
- No generic tags
- Focus on searchable, categorical information

RESPOND ONLY WITH VALID JSON:`;
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

      const ttl = CONTACT_INTELLIGENCE_AI_CONFIG.AUTO_TAGGING.CACHE_TTL; // 24 hours
      const success = await redisClient.set(cacheKey, cacheData, ttl);

      if (success) {
        console.log(`   💾 Cached in Redis (TTL: ${ttl}s)`);
      } else {
        console.warn(`   ⚠️ Redis caching failed (non-critical)`);
      }
    } catch (error) {
      console.warn(`⚠️ [AutoTagging] [${tagId}] Redis caching error:`, error.message);
      // Non-critical error, continue
    }
  }

  /**
   * Clear auto-tagging cache
   * Useful for testing or cache invalidation
   */
  static async clearCache() {
    try {
      const pattern = 'contact_tags:*';
      const cleared = await redisClient.clearPattern(pattern);
      console.log(`🗑️ [AutoTagging] Cleared ${cleared} cached tags`);
      return cleared;
    } catch (error) {
      console.error('❌ [AutoTagging] Cache clear failed:', error.message);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    try {
      const redisStats = await redisClient.getStats();
      return {
        staticCacheSize: Object.keys(COMMON_CONTACT_TAGS).length,
        techCompaniesCount: 8, // google, apple, microsoft, etc.
        redisConnected: redisStats?.connected || false,
        redisStats
      };
    } catch (error) {
      console.error('❌ [AutoTagging] Stats error:', error.message);
      return null;
    }
  }
}
