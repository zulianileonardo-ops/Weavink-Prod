// lib/services/serviceContact/server/rerankService.js
// MIGRATION: Switched from Pinecone rerank to Cohere rerank for better semantic matching
// SIMPLIFIED: Always uses rerank-v3.5 (best model for all languages)

import { CohereClient } from 'cohere-ai';
import { API_COSTS } from '@/lib/services/constants/apiCosts';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
import { StepTracker } from './costTracking/stepTracker';

// Initialize Cohere client
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

/**
 * RerankService
 *
 * SIMPLIFIED IMPLEMENTATION:
 * - Always uses rerank-v3.5 (best model for all languages)
 * - Testing showed v3.5 outperforms even language-specific models
 * - detectedLanguage is kept for analytics/logging purposes only
 */
export class RerankService {
  static async rerankContacts(query, contacts, options = {}) {
    const {
      subscriptionLevel = 'premium',
      topN = SEMANTIC_SEARCH_CONFIG.DEFAULT_RERANK_TOP_N,
      minRerankScore = null,
      rerankId = `rerank_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      detectedLanguage = null, // For analytics/logging only, not for model selection
      sessionId = null, // Session ID for tracking
      userId = null, // User ID for tracking
      trackSteps = false // Enable granular step tracking
    } = options;

    // Initialize timing tracker
    const rerankTotalStartTime = Date.now();
    const timings = {
      total: 0,
      yamlBuilding: 0,
      cohereApi: 0,
      scoreAnalysis: 0,
      thresholdFilter: 0
    };

    // Print rerank start header
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🔄 RERANK STARTED                                                           ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Rerank ID: ${rerankId.padEnd(65)}║`);
    console.log(`║  Query: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`.padEnd(79) + '║');
    console.log(`║  Contacts: ${contacts.length}`.padEnd(79) + '║');
    console.log(`║  Model: rerank-v3.5`.padEnd(79) + '║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
      // Build YAML documents for rerank (Cohere-optimized format)
      const yamlStart = Date.now();
      const documents = contacts.map(contact =>
        this._buildYAMLRerankDocument(contact, subscriptionLevel)
      );
      const yamlDuration = Date.now() - yamlStart;

      timings.yamlBuilding = yamlDuration;

      const docLengths = documents.map(d => d.length);
      const avgLength = Math.round(docLengths.reduce((a, b) => a + b) / docLengths.length);
      const minLength = Math.min(...docLengths);
      const maxLength = Math.max(...docLengths);

      // Count populated fields
      const fieldCounts = {
        name: documents.filter(d => d.includes('name:') && !d.includes('name: ""')).length,
        jobTitle: documents.filter(d => d.includes('job_title:') && !d.includes('job_title: ""')).length,
        company: documents.filter(d => d.includes('company:') && !d.includes('company: ""')).length,
        notes: documents.filter(d => d.includes('notes:') && !d.includes('notes: ""')).length,
        tags: documents.filter(d => d.includes('tags:') && !d.includes('tags: ""')).length
      };

      console.log(`[Step 5: YAML Document Building] ${'─'.repeat(54)}`);
      console.log(`  📄 Documents built: ${documents.length}`);
      console.log(`  📏 Avg chars: ${avgLength} (min: ${minLength}, max: ${maxLength})`);
      console.log(`  📝 Fields populated: name(${fieldCounts.name}), jobTitle(${fieldCounts.jobTitle}), company(${fieldCounts.company}), notes(${fieldCounts.notes}), tags(${fieldCounts.tags})`);
      console.log(`  ⏱️  Duration: ${yamlDuration}ms`);

      // STEP 8: Record YAML Document Preparation
      if (trackSteps && sessionId && userId) {
        try {
          await StepTracker.recordStep({
            userId,
            sessionId,
            stepNumber: 8,
            stepLabel: 'YAML Document Preparation',
            feature: 'semantic_search_yaml_build',
            provider: 'internal',
            cost: 0,
            duration: yamlDuration,
            isBillableRun: false,
            metadata: {
              documentsBuilt: documents.length,
              format: 'YAML',
              avgChars: avgLength,
              minChars: minLength,
              maxChars: maxLength,
              estimatedAvgTokens: Math.round(avgLength / 4),
              improvementVsPrevious: `${Math.round((avgLength / 123) * 100)}%`,
              sampleDocument: documents[0]?.substring(0, 200) + '...'
            }
          });
          console.log(`✅ [RerankService] [${rerankId}] Step 8 recorded`);
        } catch (stepError) {
          console.error(`❌ [RerankService] [${rerankId}] Failed to record Step 8:`, stepError);
        }
      }

      // Log first full document for YAML verification
      if (documents.length > 0) {
        console.log(`📋 [RerankService] [${rerankId}] Sample YAML document:`);
        console.log('---');
        console.log(documents[0]);
        console.log('---');
      }

      console.log(`📊 [RerankService] [${rerankId}] RERANK DOCUMENT STRATEGY: Using YAML format (Cohere-optimized)`);

      // Preprocess query to strip command verbs for better semantic matching
      const queryPreprocessing = this._preprocessQuery(query);
      const queryToUse = queryPreprocessing.preprocessed;

      if (queryPreprocessing.wasTransformed) {
        console.log(`✂️  [RerankService] [${rerankId}] Query preprocessing:`, {
          original: queryPreprocessing.original,
          preprocessed: queryPreprocessing.preprocessed,
          strippedVerb: queryPreprocessing.strippedVerb,
          reason: 'Improved semantic matching with declarative documents'
        });
      } else {
        console.log(`✓ [RerankService] [${rerankId}] Query preprocessing: No transformation needed (${queryPreprocessing.reason})`);
      }

      // === DIAGNOSTIC: Query Preprocessing Impact ===
      console.log(`🔍 [DIAGNOSTIC] [${rerankId}] Query Analysis:`, {
        originalQuery: queryPreprocessing.original,
        preprocessedQuery: queryPreprocessing.preprocessed,
        charsRemoved: queryPreprocessing.original.length - queryPreprocessing.preprocessed.length,
        percentageChange: ((1 - queryPreprocessing.preprocessed.length / queryPreprocessing.original.length) * 100).toFixed(1) + '%',
        strippedTokens: queryPreprocessing.wasTransformed ? [queryPreprocessing.strippedVerb] : [],
        detectedLanguage: detectedLanguage || 'unknown'
      });

      // ========================================
      // ALWAYS USE RERANK-V3.5 (BEST MODEL)
      // Testing showed v3.5 outperforms even rerank-english-v3.0 for English queries
      // v3.5 is Cohere's newest, most accurate model - use it for everything
      // ========================================
      const model = options.model || SEMANTIC_SEARCH_CONFIG.RERANK_MODELS.MULTILINGUAL_V35;

      console.log(`✅ [RerankService] [${rerankId}] Using rerank-v3.5 (best model for all languages)`, {
        detectedLanguage: detectedLanguage || 'unknown',
        note: 'v3.5 provides best results regardless of language'
      });

      // Call Cohere Rerank API
      console.log(`🔄 [RerankService] [${rerankId}] Calling Cohere Rerank API with ${model}...`);
      const rerankStartTime = Date.now();

      const useThresholdFiltering = minRerankScore !== null && minRerankScore > 0;
      const rerankTopN = useThresholdFiltering ? contacts.length : Math.min(topN, contacts.length);

      console.log(`🎯 [RerankService] [${rerankId}] Rerank strategy:`, {
        useThresholdFiltering,
        minRerankScore: minRerankScore || 'N/A',
        rerankTopN
      });

      let rerankResponse;
      try {
        // === DIAGNOSTIC: Cohere API Request ===
        console.log(`🔍 [DIAGNOSTIC] [${rerankId}] Sending to Cohere Rerank API:`, {
          model: model,
          documentsCount: documents.length,
          query: queryToUse,
          maxTokensPerDoc: 512,
          topN: rerankTopN,
          sampleDocumentLength: documents[0]?.length
        });

        // Call Cohere Rerank API
        rerankResponse = await cohere.rerank({
          query: queryToUse,
          documents: documents,
          model: model, // Use dynamically selected model
          topN: rerankTopN,
          returnDocuments: false,
          maxTokensPerDoc: 512
        });

        // === DIAGNOSTIC: Cohere API Response ===
        const allScores = rerankResponse.results.map(r => r.relevanceScore);
        console.log(`🔍 [DIAGNOSTIC] [${rerankId}] Cohere API Response:`, {
          totalResults: rerankResponse.results.length,
          scoreDistribution: {
            min: Math.min(...allScores).toFixed(4),
            max: Math.max(...allScores).toFixed(4),
            mean: (allScores.reduce((sum, r) => sum + r, 0) / allScores.length).toFixed(4)
          },
          top3Scores: rerankResponse.results.slice(0, 3).map(r => r.relevanceScore.toFixed(4))
        });

        console.log(`✅ [RerankService] [${rerankId}] Cohere API call succeeded with model: ${model}`);
      } catch (error) {
        console.error(`❌ [RerankService] [${rerankId}] Cohere API call failed:`, error.message);
        throw new Error(`Cohere rerank API failed: ${error.message}`);
      }

      const rerankDuration = Date.now() - rerankStartTime;
      timings.cohereApi = rerankDuration;

      // Cohere returns { results: [{ index, relevanceScore, document? }] }
      const rawResults = (rerankResponse.results || []).map(result => ({
        index: result.index,
        score: result.relevanceScore
      }));
      const rawCount = rawResults.length;

      const rawScoreRange = rawCount > 0 ? {
        min: Math.min(...rawResults.map(r => r.score)),
        max: Math.max(...rawResults.map(r => r.score))
      } : { min: 0, max: 0 };
      const rawScoreAvg = rawCount > 0 ? rawResults.reduce((sum, r) => sum + r.score, 0) / rawCount : 0;

      console.log('');
      console.log(`[Step 6: Cohere Rerank API] ${'─'.repeat(57)}`);
      console.log(`  🔄 Model: ${model}`);
      console.log(`  📊 Documents reranked: ${documents.length}`);
      console.log(`  📈 Score range: ${rawScoreRange.min.toFixed(4)} - ${rawScoreRange.max.toFixed(4)} (avg: ${rawScoreAvg.toFixed(4)})`);
      console.log(`  ⏱️  Duration: ${rerankDuration}ms`);
      console.log(`  💰 Cost: $${(this._getModelPrice(model) * contacts.length).toFixed(6)}`);

      // STEP 9: Record Cohere Rerank API Call
      if (trackSteps && sessionId && userId) {
        try {
          await StepTracker.recordStep({
            userId,
            sessionId,
            stepNumber: 9,
            stepLabel: 'Cohere Rerank API Call',
            feature: 'semantic_search_rerank',
            provider: model,
            cost: this._getModelPrice(model) * contacts.length,
            duration: rerankDuration,
            isBillableRun: false,
            metadata: {
              model,
              documentsReranked: documents.length,
              detectedLanguage: detectedLanguage || 'eng',
              isPartOfSemanticSearch: true,
              queryPreprocessing: queryPreprocessing.strategy || 'preserved',
              resultsReturned: rawCount,
              scoreRange: rawScoreRange
            }
          });
          console.log(`✅ [RerankService] [${rerankId}] Step 9 recorded`);
        } catch (stepError) {
          console.error(`❌ [RerankService] [${rerankId}] Failed to record Step 9:`, stepError);
        }
      }

      // COMPREHENSIVE SCORE ANALYSIS
      const scoreAnalysisStart = Date.now();
      if (rawCount > 0) {
        const allScores = rawResults.map(r => r.score);

        const scoreDistribution = {
          min: Math.min(...allScores),
          p25: this._getPercentile(allScores, 25),
          median: this._getPercentile(allScores, 50),
          p75: this._getPercentile(allScores, 75),
          max: Math.max(...allScores),
          mean: allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        };

        // Score buckets for quality analysis
        const scoreBuckets = {
          excellent: allScores.filter(s => s >= 0.8).length,
          good: allScores.filter(s => s >= 0.6 && s < 0.8).length,
          fair: allScores.filter(s => s >= 0.4 && s < 0.6).length,
          weak: allScores.filter(s => s >= 0.2 && s < 0.4).length,
          veryWeak: allScores.filter(s => s < 0.2).length
        };

        // Determine quality assessment
        let qualityEmoji = '🔴';
        let qualityLabel = 'VERY_WEAK';
        if (scoreDistribution.max >= 0.8) { qualityEmoji = '🟢'; qualityLabel = 'EXCELLENT'; }
        else if (scoreDistribution.max >= 0.6) { qualityEmoji = '🟢'; qualityLabel = 'GOOD'; }
        else if (scoreDistribution.max >= 0.4) { qualityEmoji = '🟡'; qualityLabel = 'FAIR'; }
        else if (scoreDistribution.max >= 0.2) { qualityEmoji = '🟠'; qualityLabel = 'WEAK'; }

        console.log('');
        console.log(`[Step 7: Score Analysis] ${'─'.repeat(60)}`);
        console.log(`  📊 Score distribution:`);
        console.log(`      ├── Excellent (≥0.8): ${scoreBuckets.excellent} contacts`);
        console.log(`      ├── Good (0.6-0.8): ${scoreBuckets.good} contacts`);
        console.log(`      ├── Fair (0.4-0.6): ${scoreBuckets.fair} contacts`);
        console.log(`      ├── Weak (0.2-0.4): ${scoreBuckets.weak} contacts`);
        console.log(`      └── Very Weak (<0.2): ${scoreBuckets.veryWeak} contacts`);
        console.log(`  📈 Statistics: min=${scoreDistribution.min.toFixed(4)}, median=${scoreDistribution.median.toFixed(4)}, max=${scoreDistribution.max.toFixed(4)}`);
        console.log(`  🎯 Quality: ${qualityEmoji} ${qualityLabel}`);

        // Show top 5 results with contact names and job titles
        console.log(`  🏆 Top 5 results:`);
        rawResults.slice(0, 5).forEach((result, i) => {
          const contact = contacts[result.index];
          const name = contact.name || 'Unknown';
          const jobTitle = contact.jobTitle || '';
          const company = contact.company || '';
          const info = [jobTitle, company].filter(Boolean).join(' @ ');
          console.log(`      ${i + 1}. ${name}${info ? ` (${info})` : ''} - ${(result.score * 100).toFixed(2)}%`);
        });

        timings.scoreAnalysis = Date.now() - scoreAnalysisStart;

        // STEP 10: Record Score Analysis & Distribution
        if (trackSteps && sessionId && userId) {
          try {
            await StepTracker.recordStep({
              userId,
              sessionId,
              stepNumber: 10,
              stepLabel: 'Score Analysis & Distribution',
              feature: 'semantic_search_score_analysis',
              provider: 'internal',
              cost: 0,
              duration: 25, // Score analysis is very fast
              isBillableRun: false,
              metadata: {
                scoreDistribution: {
                  min: parseFloat(scoreDistribution.min.toFixed(4)),
                  p25: parseFloat(scoreDistribution.p25.toFixed(4)),
                  median: parseFloat(scoreDistribution.median.toFixed(4)),
                  p75: parseFloat(scoreDistribution.p75.toFixed(4)),
                  max: parseFloat(scoreDistribution.max.toFixed(4)),
                  mean: parseFloat(scoreDistribution.mean.toFixed(4))
                },
                scoreBuckets,
                top10Results: rawResults.slice(0, 10).map(r => ({
                  name: contacts[r.index]?.name || 'Unknown',
                  score: parseFloat(r.score.toFixed(4))
                }))
              }
            });
            console.log(`✅ [RerankService] [${rerankId}] Step 10 recorded`);
          } catch (stepError) {
            console.error(`❌ [RerankService] [${rerankId}] Failed to record Step 10:`, stepError);
          }
        }
      }

      // Apply threshold filtering with smart fallback
      let filteredResults = rawResults;
      let filteringStats = null;
      let scoringMethod = 'rerank';

      const filterStart = Date.now();
      if (useThresholdFiltering) {
        console.log(`🎯 [RerankService] [${rerankId}] Applying rerank threshold filter: ${minRerankScore}`);

        filteredResults = rawResults.filter(result => result.score >= minRerankScore);
        const filteredCount = filteredResults.length;
        const removedCount = rawCount - filteredCount;

        console.log(`✅ [RerankService] [${rerankId}] After threshold filter:`, {
          kept: filteredCount,
          removed: removedCount
        });

        // SMART FALLBACK: If zero results, use original vector scores
        if (filteredCount === 0) {
          console.warn(`⚠️  [RerankService] [${rerankId}] ZERO RESULTS from rerank threshold!`);

          const scoreDistribution = this._getScoreDistribution(rawResults.map(r => r.score));
          console.log(`📊 [RerankService] [${rerankId}] Score distribution:`, {
            min: scoreDistribution.min.toFixed(4),
            p25: scoreDistribution.p25.toFixed(4),
            median: scoreDistribution.median.toFixed(4),
            p75: scoreDistribution.p75.toFixed(4),
            max: scoreDistribution.max.toFixed(4),
            mean: scoreDistribution.mean.toFixed(4),
            belowThreshold: rawResults.filter(r => r.score < minRerankScore).length,
            totalScores: rawResults.length
          });

          console.log(`🔄 [RerankService] [${rerankId}] Applying FALLBACK: Using vector scores`);

          const vectorSorted = contacts
            .map((contact, index) => ({
              contact,
              index,
              vectorScore: contact._vectorScore || contact.searchMetadata?.vectorSimilarity || 0
            }))
            .sort((a, b) => b.vectorScore - a.vectorScore)
            .slice(0, Math.min(topN, contacts.length));

          const vectorScoreRange = vectorSorted.length > 0 ? {
            min: vectorSorted[vectorSorted.length - 1].vectorScore,
            max: vectorSorted[0].vectorScore
          } : { min: 0, max: 0 };

          console.log(`   - Vector score range: ${vectorScoreRange.min.toFixed(3)} - ${vectorScoreRange.max.toFixed(3)}`);
          console.log(`   - Returning top ${vectorSorted.length} vector-sorted contacts`);

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
          const fallbackLimit = 30;
          let fallbackLimitApplied = false;

          if (filteredCount > fallbackLimit) {
            console.log(`⚠️  [RerankService] [${rerankId}] Applying fallback limit: ${fallbackLimit}`);
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
      const filterDuration = Date.now() - filterStart;

      // STEP 11: Record Threshold Filtering (Rerank)
      if (trackSteps && sessionId && userId) {
        try {
          await StepTracker.recordStep({
            userId,
            sessionId,
            stepNumber: 11,
            stepLabel: 'Threshold Filtering (Rerank)',
            feature: 'semantic_search_rerank_filter',
            provider: 'internal',
            cost: 0,
            duration: filterDuration,
            isBillableRun: false,
            metadata: {
              threshold: minRerankScore || 0,
              inputCount: rawCount,
              outputCount: filteredResults.length,
              filteredOut: rawCount - filteredResults.length,
              fallbackApplied: filteringStats?.fallbackApplied || false,
              useThresholdFiltering
            }
          });
          console.log(`✅ [RerankService] [${rerankId}] Step 11 recorded`);
        } catch (stepError) {
          console.error(`❌ [RerankService] [${rerankId}] Failed to record Step 11:`, stepError);
        }
      }

      const modelPrice = this._getModelPrice(model);
      const actualCost = contacts.length * modelPrice;

      console.log(`💰 [RerankService] [${rerankId}] Cost: $${actualCost.toFixed(6)}`);

      const rerankedContacts = filteredResults.map((result, rank) => {
        const originalContact = contacts[result.index];
        const vectorScore = originalContact._vectorScore || originalContact.searchMetadata?.vectorSimilarity || 0;

        return {
          ...originalContact,
          searchMetadata: {
            ...originalContact.searchMetadata,
            rerankScore: result.score,
            rerankRank: rank + 1,
            originalVectorRank: result.index + 1,
            hybridScore: (vectorScore * 0.3) + (result.score * 0.7),
            rerankModel: model,
            detectedLanguage: detectedLanguage || 'unknown',
            scoringMethod: scoringMethod
          }
        };
      });

      const result = {
        results: rerankedContacts,
        metadata: {
          cost: actualCost,
          model,
          detectedLanguage: detectedLanguage || 'unknown',
          documentsReranked: contacts.length,
          resultsReturned: rerankedContacts.length,
          rerankDuration,
          subscriptionLevel,
          timestamp: new Date().toISOString(),
          rerankId,
          thresholdFiltering: filteringStats,
          queryPreprocessing: {
            originalQuery: queryPreprocessing.original,
            preprocessedQuery: queryPreprocessing.preprocessed,
            wasTransformed: queryPreprocessing.wasTransformed,
            ...(queryPreprocessing.strippedVerb && { strippedVerb: queryPreprocessing.strippedVerb }),
            ...(queryPreprocessing.reason && { reason: queryPreprocessing.reason })
          }
        }
      };

      // Calculate total timing
      timings.total = Date.now() - rerankTotalStartTime;
      timings.thresholdFilter = filterDuration;

      // Print comprehensive rerank summary
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
      console.log('║  🔄 RERANK COMPLETE                                                          ║');
      console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
      console.log(`║  Total Duration: ${timings.total}ms`.padEnd(79) + '║');
      console.log(`║  Documents Reranked: ${contacts.length}`.padEnd(79) + '║');
      console.log(`║  Results Returned: ${rerankedContacts.length}`.padEnd(79) + '║');
      console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
      console.log('║  📊 TIMING BREAKDOWN                                                         ║');

      const getBar = (pct) => '█'.repeat(Math.round(pct / 5));
      const steps = [
        { name: 'YAML Document Building', duration: timings.yamlBuilding },
        { name: 'Cohere Rerank API', duration: timings.cohereApi },
        { name: 'Score Analysis', duration: timings.scoreAnalysis },
        { name: 'Threshold Filtering', duration: timings.thresholdFilter }
      ];

      steps.forEach(step => {
        const pct = timings.total > 0 ? (step.duration / timings.total) * 100 : 0;
        console.log(`║  ${step.name.padEnd(30)} │ ${(step.duration + 'ms').padStart(8)} │ ${pct.toFixed(1).padStart(5)}% ${getBar(pct)}`.padEnd(79) + '║');
      });

      // Calculate hybrid scores for summary
      const hybridScores = rerankedContacts.map(c => c.searchMetadata?.hybridScore || 0);
      const hybridMin = hybridScores.length > 0 ? Math.min(...hybridScores) : 0;
      const hybridMax = hybridScores.length > 0 ? Math.max(...hybridScores) : 0;
      const hybridAvg = hybridScores.length > 0 ? hybridScores.reduce((a, b) => a + b, 0) / hybridScores.length : 0;

      console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
      console.log('║  📈 HYBRID SCORES (30% vector + 70% rerank)                                  ║');
      console.log(`║  Range: ${hybridMin.toFixed(4)} - ${hybridMax.toFixed(4)} (avg: ${hybridAvg.toFixed(4)})`.padEnd(79) + '║');
      console.log(`║  Cost: $${actualCost.toFixed(6)}`.padEnd(79) + '║');
      console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
      console.log('');

      return result;

    } catch (error) {
      console.error(`❌ [RerankService] [${rerankId}] Reranking failed:`, error.message);
      throw error;
    }
  }

  /**
   * Build YAML document for Cohere rerank
   */
  static _buildYAMLRerankDocument(contact, subscriptionLevel) {
    const yamlParts = [];
    const isPremiumOrHigher = ['premium', 'business', 'enterprise'].includes(subscriptionLevel);

    const escape = (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, ' ')
        .trim();
    };

    const truncate = (text, maxChars = 500) => {
      if (!text || text.length <= maxChars) return text;
      return text.substring(0, maxChars) + '...';
    };

    if (contact.name) {
      yamlParts.push(`name: "${escape(contact.name)}"`);
    }

    const jobTitle = this._extractJobTitle(contact);
    if (jobTitle) {
      yamlParts.push(`job_title: "${escape(jobTitle)}"`);
    }

    const company = this._extractCompany(contact);
    if (company) {
      yamlParts.push(`company: "${escape(company)}"`);
    }

    // Make notes available to all tiers for better semantic matching
    if (contact.notes) {
      yamlParts.push(`notes: "${escape(truncate(contact.notes, 500))}"`);
    }

    if (contact.message) {
      yamlParts.push(`message: "${escape(truncate(contact.message, 500))}"`);
    }

    const department = this._extractDepartment(contact);
    if (department) {
      yamlParts.push(`department: "${escape(department)}"`);
    }

    if (contact.status) {
      yamlParts.push(`status: "${escape(contact.status)}"`);
    }

    if (contact.email) {
      yamlParts.push(`email: "${escape(contact.email)}"`);
    }

    if (contact.phone) {
      yamlParts.push(`phone: "${escape(contact.phone)}"`);
    }

    if (contact.linkedin) {
      yamlParts.push(`linkedin: "${escape(contact.linkedin)}"`);
    }

    // 🎯 Option B: Include semantic tags in rerank document for better matching
    if (contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0) {
      yamlParts.push(`tags: "${contact.tags.join(', ')}"`);
    }

    if (isPremiumOrHigher && contact.eventInfo?.eventName) {
      yamlParts.push(`event: "${escape(contact.eventInfo.eventName)}"`);
    }

    // Add synthetic summary for better semantic matching (even when notes are empty)
    const summaryParts = [
      jobTitle,
      department,
      contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0 ? contact.tags.join(', ') : null,
      company && `at ${company}`
    ].filter(Boolean);

    if (summaryParts.length > 1) {
      yamlParts.push(`summary: "${summaryParts.join(' | ')}"`);
    }

    const yamlDoc = yamlParts.join('\n');

    const name = contact.name || 'Unknown';
    console.log(`   📋 [YAMLDoc] ${name} → ${yamlDoc.length} chars`);

    return yamlDoc;
  }

  static _extractJobTitle(contact) {
    if (contact.jobTitle) return contact.jobTitle;
    if (contact.details && Array.isArray(contact.details)) {
      const jobField = contact.details.find(d =>
        d.label?.toLowerCase() === 'job title' ||
        d.label?.toLowerCase() === 'title' ||
        d.label?.toLowerCase() === 'position'
      );
      if (jobField?.value) return jobField.value;
    }
    return null;
  }

  static _extractCompany(contact) {
    if (contact.company) return contact.company;
    if (contact.details && Array.isArray(contact.details)) {
      const companyField = contact.details.find(d =>
        d.label?.toLowerCase() === 'company' ||
        d.label?.toLowerCase() === 'organization'
      );
      if (companyField?.value) return companyField.value;
    }
    return null;
  }

  static _extractDepartment(contact) {
    if (contact.department) return contact.department;
    if (contact.details && Array.isArray(contact.details)) {
      const deptField = contact.details.find(d =>
        d.label?.toLowerCase().includes('department')
      );
      if (deptField?.value) return deptField.value;
    }
    if (contact.dynamicFields && Array.isArray(contact.dynamicFields)) {
      const deptField = contact.dynamicFields.find(f =>
        f.label?.toLowerCase().includes('department')
      );
      if (deptField?.value) return deptField.value;
    }
    return null;
  }

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

  static _getPercentile(values, percentile) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  static _getScoreDistribution(scores) {
    if (!scores || scores.length === 0) {
      return { min: 0, p25: 0, median: 0, p75: 0, max: 0, mean: 0 };
    }
    const sorted = [...scores].sort((a, b) => a - b);
    const len = sorted.length;
    return {
      min: sorted[0],
      p25: sorted[Math.floor(len * 0.25)],
      median: sorted[Math.floor(len * 0.5)],
      p75: sorted[Math.floor(len * 0.75)],
      max: sorted[len - 1],
      mean: scores.reduce((sum, s) => sum + s, 0) / len
    };
  }

  static _getModelPrice(model) {
    if (API_COSTS.COHERE_RERANK) {
      if (model === 'rerank-english-v3.0' && API_COSTS.COHERE_RERANK.RERANK_ENGLISH_V3) {
        return API_COSTS.COHERE_RERANK.RERANK_ENGLISH_V3.PER_REQUEST;
      }
      if (model === 'rerank-multilingual-v3.0' && API_COSTS.COHERE_RERANK.RERANK_MULTILINGUAL_V3) {
        return API_COSTS.COHERE_RERANK.RERANK_MULTILINGUAL_V3.PER_REQUEST;
      }
      if (model === 'rerank-v3.5' && API_COSTS.COHERE_RERANK.RERANK_V35) {
        return API_COSTS.COHERE_RERANK.RERANK_V35.PER_REQUEST;
      }
    }
    return 0.001;
  }

  static estimateCost(contactCount, model = SEMANTIC_SEARCH_CONFIG.RERANK_MODELS.ENGLISH) {
    const modelPrice = this._getModelPrice(model);
    const estimatedCost = contactCount * modelPrice;
    return { contactCount, modelPrice, estimatedCost };
  }
}