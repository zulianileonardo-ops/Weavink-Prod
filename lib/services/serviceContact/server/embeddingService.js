// lib/services/serviceContact/server/embeddingService.js
// Server-side service for generating embeddings using Cohere Embeddings API
// Handles embedding generation and cost estimation
// MIGRATION: 2025-01-30 - Switched from Pinecone Inference to Cohere

import { CohereClient } from 'cohere-ai';
import { API_COSTS } from '@/lib/services/constants/apiCosts';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
import { StepTracker } from './costTracking/stepTracker';
import { CostTrackingService } from './costTrackingService';

// Initialize Cohere client
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

/**
 * EmbeddingService
 *
 * Architecture:
 * - Server-side only (Cohere API key required)
 * - Generates embeddings using Cohere's embed-multilingual-v3.0 model
 * - Provides cost estimation for embedding operations
 * - Returns 1024-dimensional vectors (multilingual optimized)
 */
export class EmbeddingService {
  /**
   * Generate embedding for text
   * Uses Cohere embed-multilingual-v3.0 model
   *
   * @param {string} text - Text to embed
   * @param {object} options - Options for tracking
   * @param {string} options.sessionId - Session ID for tracking
   * @param {string} options.userId - User ID for tracking
   * @param {boolean} options.trackSteps - Enable granular step tracking
   * @param {string} options.feature - Feature name for tracking
   * @param {string} options.stepLabel - Step label for tracking
   * @returns {Promise<Array<number>>} 1024-dimensional embedding vector
   */
  static async generateEmbedding(text, options = {}) {
    const {
      sessionId = null,
      userId = null,
      trackSteps = false,
      feature = 'semantic_search_embedding',  // Default for search
      stepLabel = 'Embedding Generation',  // Default for search
      budgetCheck = null  // Budget check result from caller
    } = options;
    const startTime = Date.now();

    // DEBUG: Log received options to trace budgetCheck value
    console.log('[EMBEDDING] 🔍 DEBUG options:', {
      sessionId,
      userId,
      trackSteps,
      feature,
      stepLabel,
      budgetCheck,
      budgetCheckType: typeof budgetCheck,
      budgetCheckKeys: budgetCheck ? Object.keys(budgetCheck) : 'null/undefined'
    });

    try {
      // Clean and validate input
      const cleanText = text.replace(/\n/g, ' ').trim();

      if (!cleanText || cleanText.length === 0) {
        throw new Error('Cannot generate embedding for empty text');
      }

      console.log(`🧠 [EmbeddingService] Generating embedding for text (${cleanText.length} chars)`);
      console.log(`📝 [EmbeddingService] Text preview: "${cleanText.substring(0, 100)}..."`);

      // Generate embedding using Cohere Embeddings API
      const response = await cohere.embed({
        model: SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL,  // 'embed-multilingual-v3.0'
        texts: [cleanText],
        inputType: 'search_document',
        embeddingTypes: ['float']
      });

      // Debug: Log response type and structure
      console.log(`🔍 [EmbeddingService] Response type: ${typeof response}, isArray: ${Array.isArray(response)}`);
      if (response && typeof response === 'object') {
        console.log(`🔍 [EmbeddingService] Response keys: ${Object.keys(response).join(', ')}`);
      }

      // Validate response exists
      if (!response) {
        throw new Error('Cohere Embeddings API returned empty response');
      }

      // Extract embeddings from Cohere response structure
      // Cohere returns: { embeddings: { float: [[...]], ... }, ... }
      if (!response.embeddings || !response.embeddings.float) {
        console.error(`❌ [EmbeddingService] Unexpected response structure:`, JSON.stringify(response, null, 2));
        throw new Error(`Missing embeddings.float in response. Response keys: ${Object.keys(response).join(', ')}`);
      }

      const embeddingData = response.embeddings.float;
      console.log(`📦 [EmbeddingService] Found embeddings.float, length: ${embeddingData.length}`);

      // Validate embeddingData is an array
      if (!Array.isArray(embeddingData)) {
        throw new Error(`Embedding data is not an array: ${typeof embeddingData}`);
      }

      if (embeddingData.length === 0) {
        throw new Error('Embedding data array is empty');
      }

      // Extract the actual embedding vector (first item, since we only sent one text)
      const embedding = embeddingData[0];
      console.log(`🔍 [EmbeddingService] Embedding type: ${typeof embedding}, isArray: ${Array.isArray(embedding)}`);

      // Validate embedding is an array of numbers
      if (!Array.isArray(embedding)) {
        throw new Error(`Embedding is not an array: ${typeof embedding}`);
      }

      if (embedding.length === 0) {
        throw new Error('Embedding array is empty');
      }

      const duration = Date.now() - startTime;

      // Log embedding details
      console.log(`✅ [EmbeddingService] Embedding generated successfully:`);
      console.log(`   - Model: ${SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL}`);
      console.log(`   - Dimension: ${embedding.length}`);
      console.log(`   - Duration: ${duration}ms`);
      console.log(`   - First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
      console.log(`   - Vector magnitude: ${this._calculateMagnitude(embedding).toFixed(4)}`);

      // Validate embedding dimension
      if (embedding.length !== SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION) {
        console.warn(`⚠️ [EmbeddingService] Unexpected embedding dimension: ${embedding.length} (expected ${SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION})`);
      }

      // Record Embedding Generation (Step 3 for search, Step 4 for contact enrichment)
      if (trackSteps && sessionId && userId) {
        try {
          const estimatedTokens = Math.ceil(cleanText.length / 4); // Rough token estimate

          // Prepare metadata object
          const metadata = {
            model: SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL,
            dimension: embedding.length,
            textLength: cleanText.length,
            estimatedTokens: estimatedTokens,
            vectorMagnitude: this._calculateMagnitude(embedding)
            // Note: budgetCheck is passed as root-level parameter to recordUsage, not in metadata
          };

          // DEBUG: Log metadata before recordUsage
          console.log('[EMBEDDING] 🔍 DEBUG before recordUsage:', {
            budgetCheck,
            budgetCheckType: typeof budgetCheck,
            metadataKeys: Object.keys(metadata),
            note: 'budgetCheck passed as root-level parameter, not in metadata'
          });

          // Record usage for budget tracking (also records to SessionUsage if sessionId provided)
          await CostTrackingService.recordUsage({
            userId,
            usageType: 'ApiUsage',  // API budget (not AI)
            feature: feature,
            cost: (estimatedTokens / 1000000) * API_COSTS.COHERE.EMBEDDING.PER_MILLION,
            isBillableRun: true,  // Counts against API run limits
            provider: 'cohere',
            sessionId,
            stepLabel: stepLabel,
            budgetCheck: budgetCheck,  // Pass as root-level parameter (not inside metadata)
            metadata: metadata
          });
          console.log(`✅ [EmbeddingService] ${stepLabel} recorded`);
        } catch (stepError) {
          console.error(`❌ [EmbeddingService] Failed to record ${stepLabel}:`, stepError);
        }
      }

      return embedding;

    } catch (error) {
      console.error(`❌ [EmbeddingService] Embedding generation failed:`, {
        message: error.message,
        textLength: text?.length || 0,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Estimate cost of generating an embedding
   * Based on text length and Cohere pricing
   *
   * @param {string} text - Text to estimate cost for
   * @returns {object} Cost estimation details
   */
  static estimateCost(text) {
    // Rough token estimation (1 token ≈ 4 characters for English)
    const estimatedTokens = Math.ceil(text.length / 4);

    // Calculate cost using Cohere pricing
    const embeddingCost = (estimatedTokens / 1000000) * API_COSTS.COHERE.EMBEDDING.PER_MILLION;

    return {
      textLength: text.length,
      estimatedTokens,
      embeddingCost,
      model: SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL,
      pricePerMillion: API_COSTS.COHERE.EMBEDDING.PER_MILLION
    };
  }

  /**
   * Batch generate embeddings
   * Generates embeddings for multiple texts with rate limiting
   *
   * @param {Array<string>} texts - Array of texts to embed
   * @param {object} options - Options for batch processing
   * @returns {Promise<Array<Array<number>>>} Array of embeddings
   */
  static async batchGenerateEmbeddings(texts, options = {}) {
    const {
      batchSize = SEMANTIC_SEARCH_CONFIG.BATCH_SIZE,
      delayMs = SEMANTIC_SEARCH_CONFIG.BATCH_DELAY_MS,
      onProgress = null
    } = options;

    console.log(`📦 [EmbeddingService] Batch generating embeddings for ${texts.length} texts`);

    const embeddings = [];
    let processedCount = 0;

    // Process in batches to respect rate limits
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / batchSize);

      console.log(`📦 [EmbeddingService] Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

      try {
        // Cohere's embed API supports batch requests natively
        const response = await cohere.embed({
          model: SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL,
          texts: batch,
          inputType: 'search_document',
          embeddingTypes: ['float']
        });

        // Extract embedding data from Cohere response
        // Cohere returns: { embeddings: { float: [[...], [...], ...] } }
        if (!response.embeddings || !response.embeddings.float) {
          console.error(`❌ [EmbeddingService] Unexpected batch response structure`);
          throw new Error('Missing embeddings.float in batch response');
        }

        const batchEmbeddings = response.embeddings.float;

        embeddings.push(...batchEmbeddings);
        processedCount += batch.length;

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            processed: processedCount,
            total: texts.length,
            batchNumber,
            totalBatches
          });
        }

        // Delay between batches (except for last batch)
        if (i + batchSize < texts.length) {
          console.log(`⏳ [EmbeddingService] Waiting ${delayMs}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`❌ [EmbeddingService] Batch ${batchNumber} failed:`, error);
        throw error;
      }
    }

    console.log(`✅ [EmbeddingService] Batch complete: ${embeddings.length} embeddings generated`);

    return embeddings;
  }

  /**
   * Calculate vector magnitude (Euclidean norm)
   * @private
   */
  static _calculateMagnitude(vector) {
    return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  }

  /**
   * Calculate cosine similarity between two vectors
   * Useful for debugging and validation
   *
   * @param {Array<number>} vector1 - First vector
   * @param {Array<number>} vector2 - Second vector
   * @returns {number} Cosine similarity (-1 to 1)
   */
  static calculateCosineSimilarity(vector1, vector2) {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = this._calculateMagnitude(vector1);
    const magnitude2 = this._calculateMagnitude(vector2);

    return dotProduct / (magnitude1 * magnitude2);
  }
}