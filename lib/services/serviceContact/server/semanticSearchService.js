// lib/services/serviceContact/server/semanticSearchService.js
// Server-side service for semantic search operations
// MIGRATION: 2025-01-30 - Switched from Pinecone to self-hosted Qdrant
// Handles Cohere embeddings and Qdrant vector queries

import { adminDb } from '@/lib/firebaseAdmin';
import { API_COSTS } from '@/lib/services/constants/apiCosts';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
import { IndexManagementService } from './indexManagementService';
import { EmbeddingService } from './embeddingService';
import { QueryEnhancementService } from './queryEnhancementService';
import { QueryTaggingService } from './QueryTaggingService';
import { StepTracker } from './costTracking/stepTracker';
import { CostTrackingService } from './costTrackingService';
import { qdrantClient } from '../../../qdrant.js';

/**
 * SemanticSearchService
 *
 * Architecture:
 * - Generates embeddings using Cohere Embeddings API
 * - Queries Qdrant vector database (self-hosted)
 * - Retrieves full contact data from Firestore
 * - Returns formatted results with metadata
 */
export class SemanticSearchService {
  /**
   * Print comprehensive search summary with timing breakdown and optimization suggestions
   * @private
   */
  static _printSearchSummary(searchId, userId, query, timings, scores, costs, cacheInfo) {
    const totalDuration = timings.total || 0;

    // Build timing breakdown
    const steps = [
      { name: 'Query Enhancement (Gemini)', duration: timings.queryEnhancement || 0, cached: cacheInfo.queryEnhancement },
      { name: 'Query Tagging', duration: timings.queryTagging || 0, cached: cacheInfo.queryTagging },
      { name: 'Embedding Generation (Cohere)', duration: timings.embedding || 0 },
      { name: 'Qdrant Vector Search', duration: timings.qdrantSearch || 0 },
      { name: 'Threshold Filtering (Vector)', duration: timings.thresholdFilter || 0 },
      { name: 'Contact Retrieval (Firestore)', duration: timings.firestoreRetrieval || 0 },
    ];

    // Calculate percentages and build bar chart
    const getBar = (pct) => {
      const blocks = Math.round(pct / 5);
      return '█'.repeat(blocks);
    };

    // Detect bottlenecks (>30% of total time)
    const bottlenecks = steps.filter(s => (s.duration / totalDuration) * 100 > 30);

    // Score quality analysis
    const analyzeScoreQuality = (maxScore) => {
      if (maxScore >= 0.85) return { quality: 'EXCELLENT', emoji: '🟢' };
      if (maxScore >= 0.7) return { quality: 'GOOD', emoji: '🟢' };
      if (maxScore >= 0.5) return { quality: 'FAIR', emoji: '🟡' };
      if (maxScore >= 0.3) return { quality: 'WEAK', emoji: '🟠' };
      return { quality: 'VERY_WEAK', emoji: '🔴' };
    };

    const vectorQuality = scores.vectorMax ? analyzeScoreQuality(scores.vectorMax) : null;

    // Print header
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 SEMANTIC SEARCH COMPLETE                                                  ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Search ID: ${searchId.padEnd(65)}║`);
    console.log(`║  User: ${userId.substring(0, 20).padEnd(70)}║`);
    console.log(`║  Query: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`.padEnd(79) + '║');
    console.log(`║  Total Duration: ${totalDuration}ms`.padEnd(79) + '║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log('║  📊 TIMING BREAKDOWN                                                         ║');
    console.log('╠════════════════════════════════════════╤══════════╤══════════════════════════╣');
    console.log('║  Step                                  │ Time     │ % of Total               ║');
    console.log('╠════════════════════════════════════════╪══════════╪══════════════════════════╣');

    steps.forEach(step => {
      const pct = totalDuration > 0 ? (step.duration / totalDuration) * 100 : 0;
      const bar = getBar(pct);
      const cacheLabel = step.cached === true ? ' (CACHED)' : step.cached === false ? ' (MISS)' : '';
      const name = (step.name + cacheLabel).padEnd(38);
      const time = `${step.duration}ms`.padStart(8);
      const pctStr = `${pct.toFixed(1)}%  ${bar}`.padEnd(24);
      console.log(`║  ${name}│ ${time} │ ${pctStr}║`);
    });

    console.log('╠════════════════════════════════════════╧══════════╧══════════════════════════╣');
    console.log(`║  TOTAL                                 │ ${totalDuration}ms`.padEnd(79) + '║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');

    // Print cache info
    console.log('║  💾 CACHE STATUS                                                             ║');
    const enhCacheStatus = cacheInfo.queryEnhancement ? '✅ HIT' : '❌ MISS';
    const tagCacheStatus = cacheInfo.queryTagging ? '✅ HIT' : '❌ MISS';
    console.log(`║  • Query Enhancement: ${enhCacheStatus} ${cacheInfo.queryEnhancementType ? `(${cacheInfo.queryEnhancementType})` : ''}`.padEnd(79) + '║');
    console.log(`║  • Query Tagging: ${tagCacheStatus} ${cacheInfo.queryTaggingType ? `(${cacheInfo.queryTaggingType})` : ''}`.padEnd(79) + '║');

    // Print scores
    if (scores.vectorMin !== undefined) {
      console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
      console.log('║  📈 VECTOR SCORES                                                            ║');
      const scoreRange = `${scores.vectorMin.toFixed(4)} - ${scores.vectorMax.toFixed(4)} (avg: ${scores.vectorAvg.toFixed(4)})`;
      console.log(`║  • Range: ${scoreRange}`.padEnd(79) + '║');
      console.log(`║  • Quality: ${vectorQuality.emoji} ${vectorQuality.quality}`.padEnd(79) + '║');
      console.log(`║  • Matches: ${scores.matchCount} contacts`.padEnd(79) + '║');
    }

    // Print costs
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log('║  💰 COST SUMMARY                                                             ║');
    console.log(`║  • Query Enhancement (Gemini): $${(costs.queryEnhancement || 0).toFixed(6)}`.padEnd(79) + '║');
    console.log(`║  • Query Tagging (Gemini): $${(costs.queryTagging || 0).toFixed(6)}`.padEnd(79) + '║');
    console.log(`║  • Embedding (Cohere): $${(costs.embedding || 0).toFixed(6)}`.padEnd(79) + '║');
    console.log(`║  • Vector Search (Qdrant): $0.000000 (self-hosted)`.padEnd(79) + '║');
    console.log(`║  • TOTAL: $${(costs.total || 0).toFixed(6)}`.padEnd(79) + '║');

    // Print optimization suggestions
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log('║  💡 OPTIMIZATION SUGGESTIONS                                                 ║');

    let suggestionCount = 0;

    // Bottleneck suggestions
    bottlenecks.forEach(b => {
      const pct = ((b.duration / totalDuration) * 100).toFixed(1);
      console.log(`║  ⚠️ BOTTLENECK: ${b.name} (${pct}%)`.padEnd(79) + '║');
      if (b.name.includes('Enhancement') && !cacheInfo.queryEnhancement) {
        console.log('║     └─ Pre-warm Redis cache with common queries'.padEnd(79) + '║');
      }
      if (b.name.includes('Rerank')) {
        console.log('║     └─ Reduce maxResults or enable vector threshold filtering'.padEnd(79) + '║');
      }
      suggestionCount++;
    });

    // Score quality suggestions
    if (vectorQuality && vectorQuality.quality === 'VERY_WEAK') {
      console.log('║  ⚠️ LOW VECTOR SCORES: Max score < 0.3'.padEnd(79) + '║');
      console.log('║     └─ Contact tags may be too generic - run backfill-tags --force'.padEnd(79) + '║');
      console.log('║     └─ Add more notes to contacts for semantic richness'.padEnd(79) + '║');
      suggestionCount++;
    } else if (vectorQuality && vectorQuality.quality === 'WEAK') {
      console.log('║  ⚠️ WEAK VECTOR SCORES: Max score < 0.5'.padEnd(79) + '║');
      console.log('║     └─ Consider enriching contact notes and job titles'.padEnd(79) + '║');
      suggestionCount++;
    }

    // Cache suggestions
    if (!cacheInfo.queryEnhancement) {
      console.log('║  ⚠️ Query enhancement cache MISS'.padEnd(79) + '║');
      console.log('║     └─ This query will be cached for 24h for faster future searches'.padEnd(79) + '║');
      suggestionCount++;
    }

    // Good things
    if (timings.qdrantSearch && timings.qdrantSearch < 100) {
      console.log(`║  ✅ GOOD: Vector search fast (${timings.qdrantSearch}ms) - Qdrant performing well`.padEnd(79) + '║');
    }
    if (cacheInfo.queryEnhancement) {
      console.log('║  ✅ GOOD: Query enhancement cache HIT - saved ~300-500ms'.padEnd(79) + '║');
    }
    if (cacheInfo.queryTagging) {
      console.log('║  ✅ GOOD: Query tagging cache HIT - saved ~300-500ms'.padEnd(79) + '║');
    }

    if (suggestionCount === 0) {
      console.log('║  ✅ All systems performing optimally!'.padEnd(79) + '║');
    }

    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
  }

  /**
   * Perform semantic search for contacts
   *
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results with metadata
   */
  static async search(userId, query, options = {}) {
 const {
    maxResults = SEMANTIC_SEARCH_CONFIG.DEFAULT_MAX_RESULTS,
    includeMetadata = SEMANTIC_SEARCH_CONFIG.DEFAULT_INCLUDE_METADATA,
    searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    minVectorScore = null,
    subscriptionLevel = 'premium',
    sessionId = null, // Accept sessionId for cost tracking
    enhanceQuery = true, // Option to enable/disable enhancement
    disableQueryTags = false, // Query tagging is DEFAULT ON
    trackSteps = false, // Enable granular step tracking
    budgetCheck = null // Affordability check result from route
  } = options;

    // Initialize comprehensive timing tracker
    const searchStartTime = Date.now();
    const timings = {
      total: 0,
      queryEnhancement: 0,
      queryTagging: 0,
      embedding: 0,
      qdrantSearch: 0,
      thresholdFilter: 0,
      firestoreRetrieval: 0
    };
    const cacheInfo = {
      queryEnhancement: false,
      queryEnhancementType: null,
      queryTagging: false,
      queryTaggingType: null
    };
    const scores = {
      vectorMin: null,
      vectorMax: null,
      vectorAvg: null,
      matchCount: 0
    };
    const costs = {
      queryEnhancement: 0,
      queryTagging: 0,
      embedding: 0,
      total: 0
    };

    // Print search start header
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 SEMANTIC SEARCH STARTED                                                   ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Search ID: ${searchId.padEnd(65)}║`);
    console.log(`║  User: ${userId.substring(0, 20).padEnd(70)}║`);
    console.log(`║  Query: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`.padEnd(79) + '║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

  try {
    // Step 0: Enhance query with AI (NEW!)
    let queryToUse = query;
    let detectedLanguage = 'eng';
    let enhancementMetadata = null;

    if (enhanceQuery) {
      console.log(`🚀 [SemanticSearchService] [${searchId}] Step 0: Enhancing query...`);
      const enhancementStartTime = Date.now();

      const enhancement = await QueryEnhancementService.enhanceQuery(query, {
        sessionId,
        userId,
        enhanceId: `${searchId}_enhance`,
        trackSteps,
        budgetCheck
      });

      queryToUse = enhancement.enhancedQuery;
      detectedLanguage = enhancement.language;
      enhancementMetadata = enhancement.metadata;

      const enhancementTime = Date.now() - enhancementStartTime;
      timings.queryEnhancement = enhancementTime;
      cacheInfo.queryEnhancement = enhancementMetadata.cached || false;
      cacheInfo.queryEnhancementType = enhancementMetadata.cacheType || null;
      costs.queryEnhancement = enhancementMetadata.cost || 0;

      console.log('');
      console.log(`[Step 0: Query Enhancement] ${'─'.repeat(58)}`);
      console.log(`  📝 Original: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`);
      console.log(`  ✨ Enhanced: "${queryToUse.substring(0, 60)}${queryToUse.length > 60 ? '...' : ''}"`);
      console.log(`  🌐 Language: ${detectedLanguage}`);
      console.log(`  💾 Cache: ${enhancementMetadata.cached ? '✅ HIT' : '❌ MISS'} ${enhancementMetadata.cacheType ? `(${enhancementMetadata.cacheType})` : ''}`);
      console.log(`  ⏱️  Duration: ${enhancementTime}ms`);
      console.log(`  💰 Cost: $${(enhancementMetadata.cost || 0).toFixed(6)}`);
    }

    // Step 0.5: Query Tagging (DEFAULT ON) - Tags query with same vocabulary as contacts
    let queryTags = [];
    let queryTaggingMetadata = null;

    if (!disableQueryTags) {
      console.log(`🏷️ [SemanticSearchService] [${searchId}] Step 0.5: Tagging query...`);
      const taggingStartTime = Date.now();

      const tagResult = await QueryTaggingService.tagQuery(query, {
        sessionId,
        userId,
        trackSteps,
        budgetCheck
      });

      const taggingTime = Date.now() - taggingStartTime;
      timings.queryTagging = taggingTime;

      if (tagResult.tags && tagResult.tags.length > 0) {
        queryTags = tagResult.tags;
        queryTaggingMetadata = tagResult.metadata;
        cacheInfo.queryTagging = queryTaggingMetadata?.cached || false;
        cacheInfo.queryTaggingType = queryTaggingMetadata?.cacheType || null;
        costs.queryTagging = queryTaggingMetadata?.cost || 0;

        // Append tags to query for better embedding alignment
        queryToUse = `${queryToUse} [Query Tags]: ${queryTags.join(', ')}`;

        console.log('');
        console.log(`[Step 0.5: Query Tagging] ${'─'.repeat(60)}`);
        console.log(`  🏷️  Tags: [${queryTags.join(', ')}]`);
        console.log(`  💾 Cache: ${queryTaggingMetadata?.cached ? '✅ HIT' : '❌ MISS'} ${queryTaggingMetadata?.cacheType ? `(${queryTaggingMetadata.cacheType})` : ''}`);
        console.log(`  ⏱️  Duration: ${taggingTime}ms`);
        console.log(`  💰 Cost: $${(queryTaggingMetadata?.cost || 0).toFixed(6)}`);
      } else {
        console.log('');
        console.log(`[Step 0.5: Query Tagging] ${'─'.repeat(60)}`);
        console.log(`  ⏭️  Skipped: ${tagResult.metadata?.taggingSkippedReason || 'no_tags'}`);
        console.log(`  ⏱️  Duration: ${taggingTime}ms`);
      }
    }

    const embeddingStartTime = Date.now();

    const queryEmbedding = await EmbeddingService.generateEmbedding(queryToUse, {
      sessionId,
      userId,
      trackSteps,
      budgetCheck,
      inputType: 'search_query'  // CRITICAL: Use 'search_query' for queries, not 'search_document'
    }); // Use enhanced query

    const embeddingTime = Date.now() - embeddingStartTime;
    timings.embedding = embeddingTime;
    const embeddingCostEstimate = EmbeddingService.estimateCost(queryToUse);
    costs.embedding = embeddingCostEstimate.embeddingCost;

    console.log('');
    console.log(`[Step 1: Embedding Generation] ${'─'.repeat(55)}`);
    console.log(`  📊 Input tokens: ~${embeddingCostEstimate.estimatedTokens}`);
    console.log(`  🧠 Model: embed-multilingual-v3.0`);
    console.log(`  📐 Dimension: ${queryEmbedding.length}`);
    console.log(`  ⏱️  Duration: ${embeddingTime}ms`);
    console.log(`  💰 Cost: $${costs.embedding.toFixed(6)}`);

      // Step 2: Query Qdrant for similar vectors
      const qdrantSearchStartTime = Date.now();

      const collectionName = userId;  // Direct userId = collection name

      // Ensure collection exists before searching
      await IndexManagementService.ensureCollection(collectionName);

      // Query Qdrant
      const qdrantResults = await qdrantClient.search(collectionName, {
        vector: queryEmbedding,
        limit: maxResults,
        with_payload: includeMetadata,
        with_vector: false
      });

      const searchDuration = Date.now() - qdrantSearchStartTime;
      timings.qdrantSearch = searchDuration;

      // Transform Qdrant results to Pinecone format for backward compatibility
      // Qdrant: results[].id (UUID), results[].score, results[].payload
      // Pinecone: matches[].id (contact ID), matches[].score, matches[].metadata
      const rawMatches = qdrantResults.map(point => ({
        id: point.payload.originalId,  // CRITICAL: Map originalId back to id
        score: point.score,
        metadata: point.payload,
        values: point.vector || null
      }));

      const rawCount = rawMatches.length;
      const rawScoreRange = rawCount > 0 ? {
        min: Math.min(...rawMatches.map(m => m.score)),
        max: Math.max(...rawMatches.map(m => m.score))
      } : { min: 0, max: 0 };
      const rawScoreAvg = rawCount > 0 ? rawMatches.reduce((sum, m) => sum + m.score, 0) / rawCount : 0;

      // Store scores for summary
      scores.vectorMin = rawScoreRange.min;
      scores.vectorMax = rawScoreRange.max;
      scores.vectorAvg = rawScoreAvg;
      scores.matchCount = rawCount;

      console.log('');
      console.log(`[Step 2: Qdrant Vector Search] ${'─'.repeat(54)}`);
      console.log(`  📁 Collection: ${collectionName.substring(0, 30)}`);
      console.log(`  🎯 Matches found: ${rawCount}`);
      console.log(`  📈 Score range: ${rawScoreRange.min.toFixed(4)} - ${rawScoreRange.max.toFixed(4)} (avg: ${rawScoreAvg.toFixed(4)})`);
      console.log(`  ⏱️  Duration: ${searchDuration}ms`);
      console.log(`  💰 Cost: $0.000000 (self-hosted)`);

      // STEP 4: Record Qdrant Vector Search
      if (trackSteps && sessionId && userId) {
        try {
          await StepTracker.recordStep({
            userId,
            sessionId,
            stepNumber: 4,
            stepLabel: 'Qdrant Vector Search',
            feature: 'semantic_search_vector',
            provider: 'qdrant',
            cost: API_COSTS.QDRANT.QUERY_BASE,  // $0 for self-hosted
            duration: searchDuration,
            isBillableRun: false,
            budgetCheck,
            metadata: {
              collection: collectionName,
              limit: maxResults,
              matchesFound: rawCount,
              scoreRange: rawScoreRange,
              selfHosted: true
            }
          });
          console.log(`✅ [SemanticSearchService] [${searchId}] Step 4 recorded`);
        } catch (stepError) {
          console.error(`❌ [SemanticSearchService] [${searchId}] Failed to record Step 4:`, stepError);
        }
      }

      // Apply threshold filtering if minVectorScore is provided
      let filteredMatches = rawMatches;
      let filteringStats = null;

      const filterStartTime = Date.now();
      if (minVectorScore !== null && minVectorScore > 0) {
        filteredMatches = rawMatches.filter(match => match.score >= minVectorScore);
        const filteredCount = filteredMatches.length;
        const removedCount = rawCount - filteredCount;
        const filteredScoreRange = filteredCount > 0 ? {
          min: Math.min(...filteredMatches.map(m => m.score)),
          max: Math.max(...filteredMatches.map(m => m.score))
        } : { min: 0, max: 0 };

        filteringStats = {
          thresholdUsed: minVectorScore,
          rawCount,
          filteredCount,
          removedCount,
          rawScoreRange,
          filteredScoreRange
        };

        console.log('');
        console.log(`[Step 3: Threshold Filtering (Vector)] ${'─'.repeat(47)}`);
        console.log(`  🎯 Threshold: ${minVectorScore} (${(minVectorScore * 100).toFixed(0)}% minimum)`);
        console.log(`  📊 Before: ${rawCount} contacts`);
        console.log(`  📊 After: ${filteredCount} contacts`);
        console.log(`  ❌ Filtered out: ${removedCount} contacts`);
        if (filteredCount === 0) {
          console.log(`  ⚠️  WARNING: No results passed threshold! Consider lowering threshold.`);
        }
      } else {
        console.log('');
        console.log(`[Step 3: Threshold Filtering (Vector)] ${'─'.repeat(47)}`);
        console.log(`  ℹ️  Skipped (no threshold set)`);
      }
      const filterDuration = Date.now() - filterStartTime;
      timings.thresholdFilter = filterDuration;
      console.log(`  ⏱️  Duration: ${filterDuration}ms`);

      // STEP 5: Record Threshold Filtering
      if (trackSteps && sessionId && userId) {
        try {
          const filteredScoreRange = filteredMatches.length > 0 ? {
            min: Math.min(...filteredMatches.map(m => m.score)),
            max: Math.max(...filteredMatches.map(m => m.score))
          } : { min: 0, max: 0 };

          await StepTracker.recordStep({
            userId,
            sessionId,
            stepNumber: 5,
            stepLabel: 'Threshold Filtering (Vector)',
            feature: 'semantic_search_filter',
            provider: 'internal',
            cost: 0,
            duration: filterDuration,
            isBillableRun: false,
            budgetCheck,
            metadata: {
              threshold: minVectorScore || 0,
              thresholdPercentage: `${((minVectorScore || 0) * 100).toFixed(0)}%`,
              subscriptionLevel,
              inputCount: rawCount,
              outputCount: filteredMatches.length,
              filteredOut: rawCount - filteredMatches.length,
              scoreRange: filteredScoreRange
            }
          });
          console.log(`✅ [SemanticSearchService] [${searchId}] Step 5 recorded`);
        } catch (stepError) {
          console.error(`❌ [SemanticSearchService] [${searchId}] Failed to record Step 5:`, stepError);
        }
      }

      // Create searchResults object with filtered matches (Pinecone-compatible format)
      const searchResults = { matches: filteredMatches };

      // Step 3: Calculate actual costs
      const costEstimate = EmbeddingService.estimateCost(query);
      const embeddingCost = costEstimate.embeddingCost;
      const searchCost = API_COSTS.QDRANT.QUERY_BASE;  // $0 for self-hosted
      const totalCost = embeddingCost + searchCost;

      console.log(`💾 [SemanticSearchService] [${searchId}] Cost calculation:`, {
        tokens: costEstimate.estimatedTokens,
        embeddingCost: embeddingCost.toFixed(6),
        searchCost: searchCost.toFixed(6),
        totalCost: totalCost.toFixed(6)
      });

      // Step 4: Retrieve full contact data from Firestore
      const retrieveStartTime = Date.now();
      const contacts = await this._retrieveContactData(userId, searchResults.matches, searchId, collectionName);
      const retrieveDuration = Date.now() - retrieveStartTime;
      timings.firestoreRetrieval = retrieveDuration;

      // Count contacts with dynamic fields
      const contactsWithDynamicFields = contacts.filter(c => c.dynamicFields?.length > 0).length;

      console.log('');
      console.log(`[Step 4: Contact Retrieval (Firestore)] ${'─'.repeat(47)}`);
      console.log(`  📋 Contacts retrieved: ${contacts.length}`);
      console.log(`  📊 With dynamic fields: ${contactsWithDynamicFields}`);
      console.log(`  ⏱️  Duration: ${retrieveDuration}ms`);

      // STEP 6: Record Contact Details Retrieval
      if (trackSteps && sessionId && userId) {
        try {
          await StepTracker.recordStep({
            userId,
            sessionId,
            stepNumber: 6,
            stepLabel: 'Contact Details Retrieval',
            feature: 'semantic_search_retrieval',
            provider: 'firestore',
            cost: 0,
            duration: retrieveDuration,
            isBillableRun: false,
            budgetCheck,
            metadata: {
              contactsRetrieved: contacts.length,
              batchSize: searchResults.matches.length,
              firestoreReads: contacts.length
            }
          });
          console.log(`✅ [SemanticSearchService] [${searchId}] Step 6 recorded`);
        } catch (stepError) {
          console.error(`❌ [SemanticSearchService] [${searchId}] Failed to record Step 6:`, stepError);
        }
      }

      // Step 5: Return formatted results
       const result = {
      results: contacts,
      searchMetadata: {
        query: query.substring(0, 100),
        enhancedQuery: queryToUse !== query ? queryToUse.substring(0, 100) : undefined, // NEW
        detectedLanguage, // NEW
        queryEnhancement: enhancementMetadata, // NEW
        queryTags: queryTags.length > 0 ? queryTags : undefined, // Query tagging
        queryTaggingMetadata: queryTaggingMetadata || undefined, // Query tagging metadata
        totalResults: contacts.length,
        collection: collectionName,  // Changed from namespace
        vectorDatabase: 'qdrant',    // NEW: Indicate which DB
        costs: {
      embedding: embeddingCost,
      search: searchCost,
      queryEnhancement: enhancementMetadata?.cost || 0,
      queryTagging: queryTaggingMetadata?.cost || 0, // Query tagging cost
      total: totalCost + (enhancementMetadata?.cost || 0) + (queryTaggingMetadata?.cost || 0),
      tokens: costEstimate.estimatedTokens // ✅ ADD THIS LINE
    },
        searchDuration,
        embeddingTime,
        timestamp: new Date().toISOString(),
        searchId,
        sessionId, // NEW: Include sessionId in response
        thresholdFiltering: filteringStats
      }
    };

      // Finalize session to set status to "completed"
      if (trackSteps && sessionId && userId) {
        try {
          await CostTrackingService.finalizeSession(userId, sessionId);
        } catch (finalizeError) {
          console.error(`⚠️ [SemanticSearchService] [${searchId}] Failed to finalize session:`, finalizeError.message);
        }
      }

      // Calculate total timing and costs
      timings.total = Date.now() - searchStartTime;
      costs.total = costs.queryEnhancement + costs.queryTagging + costs.embedding;

      // Print comprehensive summary
      this._printSearchSummary(
        searchId,
        userId,
        query,
        timings,
        scores,
        costs,
        cacheInfo
      );

      return result;

    } catch (error) {
      console.error(`❌ [SemanticSearchService] [${searchId}] Search failed:`, {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Retrieve full contact data from Firestore based on Qdrant matches
   * @private
   */
  static async _retrieveContactData(userId, matches, searchId, collectionName) {
    if (!matches || matches.length === 0) {
      return [];
    }

    const userContactsDoc = await adminDb.collection('Contacts').doc(userId).get();

    if (!userContactsDoc.exists) {
      console.log(`📋 [SemanticSearchService] [${searchId}] No contacts document found for user`);
      return [];
    }

    const allUserContacts = userContactsDoc.data().contacts || [];
    const contactsMap = new Map(allUserContacts.map(contact => [contact.id, contact]));

    const validContacts = matches.map(match => {
      const contactData = contactsMap.get(match.id);
      if (contactData) {
        // Log dynamic fields for debugging
        if (contactData.dynamicFields?.length > 0) {
          console.log(`📋 [SemanticSearchService] [${searchId}] Contact ${contactData.name} has ${contactData.dynamicFields.length} dynamic fields:`,
            contactData.dynamicFields.map(f => `${f.label}: ${f.value}`));
        }

        return {
          ...contactData,
          id: match.id,
          _vectorScore: match.score,
          searchMetadata: {
            score: match.score,
            collection: collectionName,
            retrievedAt: new Date().toISOString(),
            searchId,
            dynamicFieldsFromVector: Object.entries(match.metadata || {})
              .filter(([key]) => !['userId', 'name', 'email', 'company', 'subscriptionTier', 'lastUpdated', 'source', 'embeddingModel'].includes(key))
              .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
          }
        };
      }
      return null;
    }).filter(contact => contact !== null);

    // Log summary of dynamic fields found
    const contactsWithDynamicFields = validContacts.filter(c => c.dynamicFields?.length > 0);
    if (contactsWithDynamicFields.length > 0) {
      console.log(`📋 [SemanticSearchService] [${searchId}] Found ${contactsWithDynamicFields.length} contacts with dynamic fields`);
    }

    return validContacts;
  }

  /**
   * Estimate cost for a semantic search operation
   * UPDATED: Now uses Cohere Embeddings API and Qdrant (self-hosted)
   *
   * @param {string} query - Search query
   * @returns {object} Cost estimate
   */
  static estimateCost(query) {
    const estimatedTokens = Math.ceil(query.length / 4);
    const embeddingCost = (estimatedTokens / 1000000) * API_COSTS.COHERE.EMBEDDING.PER_MILLION;
    const searchCost = API_COSTS.QDRANT.QUERY_BASE;  // $0 for self-hosted
    const totalCost = embeddingCost + searchCost;

    return {
      estimatedTokens,
      embeddingCost,
      searchCost,
      totalCost
    };
  }
}