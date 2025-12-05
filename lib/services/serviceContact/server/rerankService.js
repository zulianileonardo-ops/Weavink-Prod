// lib/services/serviceContact/server/rerankService.js
// MIGRATION: 2025-12-04 - Switched from Cohere to self-hosted BGE reranker
// ARCHITECTURE: 2025-12-05 - Separated rerank-service from embed-service for fault isolation
// Self-hosted BGE-reranker-base provides 94% top-1 accuracy at $0 cost

import http from 'http';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
import { StepTracker } from './costTracking/stepTracker';

// Rerank service configuration (separate from embed-service)
const RERANK_SERVICE_URL = process.env.RERANK_SERVICE_URL || 'http://rerank-service:5556';

// Optimization: Limit rerank candidates
// More candidates = better recall but slower
// 20 candidates provides good balance: ~150ms latency
const MAX_RERANK_CANDIDATES = 20;

// HTTP keep-alive agent
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

/**
 * RerankService
 *
 * Self-hosted implementation using BGE-reranker-base via embed-server.
 *
 * Performance vs Cohere:
 * - Recall@3: 56% (vs Cohere 100%)
 * - Top-1 Accuracy: 94% (vs Cohere 100%)
 * - Cost: $0 (vs Cohere $2/1K)
 * - Latency: ~150ms for 20 docs
 */
export class RerankService {
  static async rerankContacts(query, contacts, options = {}) {
    const {
      subscriptionLevel = 'premium',
      topN = SEMANTIC_SEARCH_CONFIG.DEFAULT_RERANK_TOP_N,
      minRerankScore = null,
      rerankId = `rerank_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      detectedLanguage = null,
      sessionId = null,
      userId = null,
      trackSteps = false
    } = options;

    // Initialize timing tracker
    const rerankTotalStartTime = Date.now();
    const timings = {
      total: 0,
      documentBuilding: 0,
      rerankApi: 0,
      scoreAnalysis: 0,
      thresholdFilter: 0
    };

    // Print rerank start header
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🔄 RERANK STARTED (Self-Hosted BGE)                                         ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Rerank ID: ${rerankId.padEnd(65)}║`);
    console.log(`║  Query: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`.padEnd(79) + '║');
    console.log(`║  Contacts: ${contacts.length}`.padEnd(79) + '║');
    console.log(`║  Model: BAAI/bge-reranker-base (self-hosted)`.padEnd(79) + '║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
      // Limit candidates to optimize latency
      const candidatesToRerank = contacts.slice(0, MAX_RERANK_CANDIDATES);

      // Build documents for rerank
      const docStart = Date.now();
      const documents = candidatesToRerank.map(contact =>
        this._buildSearchableText(contact, subscriptionLevel)
      );
      timings.documentBuilding = Date.now() - docStart;

      const docLengths = documents.map(d => d.length);
      const avgLength = Math.round(docLengths.reduce((a, b) => a + b, 0) / docLengths.length);

      console.log(`[Step 5: Document Building] ${'─'.repeat(54)}`);
      console.log(`  📄 Documents built: ${documents.length}`);
      console.log(`  📏 Avg chars: ${avgLength}`);
      console.log(`  ⏱️  Duration: ${timings.documentBuilding}ms`);

      // Preprocess query
      const queryPreprocessing = this._preprocessQuery(query);
      const queryToUse = queryPreprocessing.preprocessed;

      if (queryPreprocessing.wasTransformed) {
        console.log(`✂️  [RerankService] Query preprocessing:`, {
          original: queryPreprocessing.original,
          preprocessed: queryPreprocessing.preprocessed,
          strippedVerb: queryPreprocessing.strippedVerb
        });
      }

      // Call embed-server rerank API
      console.log(`🔄 [RerankService] [${rerankId}] Calling embed-server rerank API...`);
      const rerankStartTime = Date.now();

      const useThresholdFiltering = minRerankScore !== null && minRerankScore > 0;
      const rerankTopN = useThresholdFiltering ? candidatesToRerank.length : Math.min(topN, candidatesToRerank.length);

      let rerankResponse;
      try {
        const response = await fetch(`${RERANK_SERVICE_URL}/rerank`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          agent: keepAliveAgent,
          body: JSON.stringify({
            query: queryToUse,
            documents: documents,
            top_n: rerankTopN,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Rerank service error: ${response.status} - ${error}`);
        }

        rerankResponse = await response.json();
        console.log(`✅ [RerankService] [${rerankId}] Rerank API call succeeded`);

      } catch (error) {
        console.error(`❌ [RerankService] [${rerankId}] Rerank API call failed:`, error.message);
        throw new Error(`Rerank API failed: ${error.message}`);
      }

      const rerankDuration = Date.now() - rerankStartTime;
      timings.rerankApi = rerankDuration;

      // Process results - embed-server returns { results: [{ index, score, document }] }
      const rawResults = (rerankResponse.results || []).map(result => ({
        index: result.index,
        score: result.score
      }));
      const rawCount = rawResults.length;

      const rawScoreRange = rawCount > 0 ? {
        min: Math.min(...rawResults.map(r => r.score)),
        max: Math.max(...rawResults.map(r => r.score))
      } : { min: 0, max: 0 };
      const rawScoreAvg = rawCount > 0 ? rawResults.reduce((sum, r) => sum + r.score, 0) / rawCount : 0;

      console.log('');
      console.log(`[Step 6: BGE Rerank API] ${'─'.repeat(57)}`);
      console.log(`  🔄 Model: BAAI/bge-reranker-base (self-hosted)`);
      console.log(`  📊 Documents reranked: ${documents.length}`);
      console.log(`  📈 Score range: ${rawScoreRange.min.toFixed(4)} - ${rawScoreRange.max.toFixed(4)} (avg: ${rawScoreAvg.toFixed(4)})`);
      console.log(`  ⏱️  Duration: ${rerankDuration}ms`);
      console.log(`  💰 Cost: $0.00 (self-hosted)`);

      // Record step if tracking enabled
      if (trackSteps && sessionId && userId) {
        try {
          await StepTracker.recordStep({
            userId,
            sessionId,
            stepNumber: 9,
            stepLabel: 'BGE Rerank (Self-Hosted)',
            feature: 'semantic_search_rerank',
            provider: 'self-hosted:bge-reranker-base',
            cost: 0, // Self-hosted = $0
            duration: rerankDuration,
            isBillableRun: false,
            metadata: {
              model: 'BAAI/bge-reranker-base',
              documentsReranked: documents.length,
              detectedLanguage: detectedLanguage || 'unknown',
              resultsReturned: rawCount,
              scoreRange: rawScoreRange
            }
          });
        } catch (stepError) {
          console.error(`❌ [RerankService] Failed to record step:`, stepError);
        }
      }

      // Score analysis
      const scoreAnalysisStart = Date.now();
      if (rawCount > 0) {
        const allScores = rawResults.map(r => r.score);
        const scoreBuckets = {
          excellent: allScores.filter(s => s >= 0.8).length,
          good: allScores.filter(s => s >= 0.6 && s < 0.8).length,
          fair: allScores.filter(s => s >= 0.4 && s < 0.6).length,
          weak: allScores.filter(s => s >= 0.2 && s < 0.4).length,
          veryWeak: allScores.filter(s => s < 0.2).length
        };

        console.log('');
        console.log(`[Step 7: Score Analysis] ${'─'.repeat(60)}`);
        console.log(`  📊 Score distribution:`);
        console.log(`      ├── Excellent (≥0.8): ${scoreBuckets.excellent} contacts`);
        console.log(`      ├── Good (0.6-0.8): ${scoreBuckets.good} contacts`);
        console.log(`      ├── Fair (0.4-0.6): ${scoreBuckets.fair} contacts`);
        console.log(`      ├── Weak (0.2-0.4): ${scoreBuckets.weak} contacts`);
        console.log(`      └── Very Weak (<0.2): ${scoreBuckets.veryWeak} contacts`);

        // Show top 5 results
        console.log(`  🏆 Top 5 results:`);
        rawResults.slice(0, 5).forEach((result, i) => {
          const contact = candidatesToRerank[result.index];
          const name = contact.name || 'Unknown';
          const jobTitle = contact.jobTitle || '';
          const company = contact.company || '';
          const info = [jobTitle, company].filter(Boolean).join(' @ ');
          console.log(`      ${i + 1}. ${name}${info ? ` (${info})` : ''} - ${(result.score * 100).toFixed(2)}%`);
        });
      }
      timings.scoreAnalysis = Date.now() - scoreAnalysisStart;

      // Apply threshold filtering
      let filteredResults = rawResults;
      let filteringStats = null;
      let scoringMethod = 'rerank';

      const filterStart = Date.now();
      if (useThresholdFiltering) {
        console.log(`🎯 [RerankService] [${rerankId}] Applying threshold filter: ${minRerankScore}`);

        filteredResults = rawResults.filter(result => result.score >= minRerankScore);
        const filteredCount = filteredResults.length;
        const removedCount = rawCount - filteredCount;

        console.log(`✅ [RerankService] After threshold filter: kept ${filteredCount}, removed ${removedCount}`);

        // Fallback to vector scores if zero results
        if (filteredCount === 0) {
          console.warn(`⚠️  [RerankService] [${rerankId}] ZERO RESULTS from rerank threshold!`);
          console.log(`🔄 [RerankService] Applying FALLBACK: Using vector scores`);

          const vectorSorted = candidatesToRerank
            .map((contact, index) => ({
              contact,
              index,
              vectorScore: contact._vectorScore || contact.searchMetadata?.vectorSimilarity || 0
            }))
            .sort((a, b) => b.vectorScore - a.vectorScore)
            .slice(0, Math.min(topN, candidatesToRerank.length));

          filteredResults = vectorSorted.map(item => ({
            index: item.index,
            score: item.vectorScore,
            fallbackUsed: true
          }));

          scoringMethod = 'vector';

          filteringStats = {
            thresholdUsed: minRerankScore,
            rawCount,
            filteredCount: 0,
            removedCount: rawCount,
            fallbackApplied: true,
            fallbackReason: 'zero_rerank_results',
            finalCount: filteredResults.length,
            scoringMethod: 'vector'
          };
        } else {
          // Apply fallback limit
          const fallbackLimit = 30;
          let fallbackLimitApplied = false;

          if (filteredCount > fallbackLimit) {
            filteredResults = filteredResults.slice(0, fallbackLimit);
            fallbackLimitApplied = true;
          }

          filteringStats = {
            thresholdUsed: minRerankScore,
            rawCount,
            filteredCount,
            removedCount,
            fallbackApplied: fallbackLimitApplied,
            finalCount: filteredResults.length,
            scoringMethod: 'rerank'
          };
        }
      }
      timings.thresholdFilter = Date.now() - filterStart;

      // Build reranked contacts with metadata
      const rerankedContacts = filteredResults.map((result, rank) => {
        const originalContact = candidatesToRerank[result.index];
        const vectorScore = originalContact._vectorScore || originalContact.searchMetadata?.vectorSimilarity || 0;

        return {
          ...originalContact,
          searchMetadata: {
            ...originalContact.searchMetadata,
            rerankScore: result.score,
            rerankRank: rank + 1,
            originalVectorRank: result.index + 1,
            hybridScore: (vectorScore * 0.3) + (result.score * 0.7),
            rerankModel: 'BAAI/bge-reranker-base',
            detectedLanguage: detectedLanguage || 'unknown',
            scoringMethod: scoringMethod,
            provider: 'self-hosted'
          }
        };
      });

      // Calculate total timing
      timings.total = Date.now() - rerankTotalStartTime;

      // Calculate hybrid scores for summary
      const hybridScores = rerankedContacts.map(c => c.searchMetadata?.hybridScore || 0);
      const hybridMin = hybridScores.length > 0 ? Math.min(...hybridScores) : 0;
      const hybridMax = hybridScores.length > 0 ? Math.max(...hybridScores) : 0;
      const hybridAvg = hybridScores.length > 0 ? hybridScores.reduce((a, b) => a + b, 0) / hybridScores.length : 0;

      // Print summary
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
      console.log('║  🔄 RERANK COMPLETE (Self-Hosted BGE)                                        ║');
      console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
      console.log(`║  Total Duration: ${timings.total}ms`.padEnd(79) + '║');
      console.log(`║  Documents Reranked: ${candidatesToRerank.length}`.padEnd(79) + '║');
      console.log(`║  Results Returned: ${rerankedContacts.length}`.padEnd(79) + '║');
      console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
      console.log(`║  📈 Hybrid Scores: ${hybridMin.toFixed(4)} - ${hybridMax.toFixed(4)} (avg: ${hybridAvg.toFixed(4)})`.padEnd(79) + '║');
      console.log(`║  💰 Cost: $0.00 (self-hosted)`.padEnd(79) + '║');
      console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
      console.log('');

      return {
        results: rerankedContacts,
        metadata: {
          cost: 0, // Self-hosted = $0
          model: 'BAAI/bge-reranker-base',
          provider: 'self-hosted',
          detectedLanguage: detectedLanguage || 'unknown',
          documentsReranked: candidatesToRerank.length,
          resultsReturned: rerankedContacts.length,
          rerankDuration,
          subscriptionLevel,
          timestamp: new Date().toISOString(),
          rerankId,
          thresholdFiltering: filteringStats,
          queryPreprocessing: {
            originalQuery: queryPreprocessing.original,
            preprocessedQuery: queryPreprocessing.preprocessed,
            wasTransformed: queryPreprocessing.wasTransformed
          }
        }
      };

    } catch (error) {
      console.error(`❌ [RerankService] [${rerankId}] Reranking failed:`, error.message);

      // Fallback: return original order with vector scores
      console.log(`🔄 [RerankService] [${rerankId}] Falling back to vector scores`);
      return {
        results: contacts.slice(0, topN),
        metadata: {
          cost: 0,
          model: 'fallback',
          provider: 'self-hosted',
          error: error.message,
          fallbackUsed: true
        }
      };
    }
  }

  /**
   * Build searchable text from contact object
   */
  static _buildSearchableText(contact, subscriptionLevel) {
    const parts = [];

    if (contact.name) parts.push(contact.name);
    if (contact.jobTitle) parts.push(contact.jobTitle);
    if (contact.company) parts.push(contact.company);
    if (contact.notes) parts.push(contact.notes.substring(0, 500));
    if (contact.message) parts.push(contact.message.substring(0, 500));
    if (contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0) {
      parts.push(contact.tags.join(', '));
    }
    if (contact.email) parts.push(contact.email);

    return parts.join(' - ');
  }

  /**
   * Preprocess query to strip command verbs
   */
  static _preprocessQuery(query) {
    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();

    const { QUERY_PREPROCESSING } = require('@/lib/services/serviceContact/client/constants/contactConstants');

    const startsWithPreserveKeyword = QUERY_PREPROCESSING.PRESERVE_KEYWORDS.some(keyword =>
      lowerQuery.startsWith(keyword.toLowerCase() + ' ')
    );

    if (startsWithPreserveKeyword) {
      return {
        original: trimmedQuery,
        preprocessed: trimmedQuery,
        wasTransformed: false,
        reason: 'preserved_question_format'
      };
    }

    const allCommandVerbs = [
      ...QUERY_PREPROCESSING.COMMAND_VERBS_EN,
      ...QUERY_PREPROCESSING.COMMAND_VERBS_FR,
      ...QUERY_PREPROCESSING.COMMAND_VERBS_IT
    ];

    for (const verb of allCommandVerbs) {
      const pattern = new RegExp(`^${verb}\\s+`, 'i');
      if (pattern.test(trimmedQuery)) {
        const preprocessed = trimmedQuery.replace(pattern, '').trim();
        if (preprocessed.length >= 3) {
          return {
            original: trimmedQuery,
            preprocessed: preprocessed,
            wasTransformed: true,
            strippedVerb: verb
          };
        }
      }
    }

    return {
      original: trimmedQuery,
      preprocessed: trimmedQuery,
      wasTransformed: false,
      reason: 'no_command_verb_detected'
    };
  }

  /**
   * Estimate cost (always $0 for self-hosted)
   */
  static estimateCost(contactCount) {
    return {
      contactCount,
      estimatedCost: 0,
      provider: 'self-hosted',
      model: 'BAAI/bge-reranker-base'
    };
  }

  /**
   * Health check for rerank service
   */
  static async checkHealth() {
    try {
      const response = await fetch(`${RERANK_SERVICE_URL}/health`, {
        agent: keepAliveAgent,
      });
      const data = await response.json();
      return {
        healthy: data.status === 'ok',
        model: data.model,
        modelLoaded: data.model_loaded,
        provider: 'self-hosted'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: 'self-hosted'
      };
    }
  }
}
