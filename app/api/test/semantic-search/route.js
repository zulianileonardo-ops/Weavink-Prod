// app/api/test/semantic-search/route.js
// Test endpoint for semantic search - bypasses authentication for testing
// ONLY FOR DEVELOPMENT USE - disable in production

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SemanticSearchService } from '@/lib/services/serviceContact/server/semanticSearchService';
import { RerankService } from '@/lib/services/serviceContact/server/rerankService';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/constants';

// Test user ID - must have contacts indexed in Qdrant
const TEST_USER_ID = process.env.TEST_USER_ID || 'IFxPCgSA8NapEq5W8jh6yHrtJGJ2';

/**
 * POST /api/test/semantic-search
 *
 * Test endpoint for semantic search - bypasses auth
 * ONLY USE FOR DEVELOPMENT/TESTING
 *
 * Body: {
 *   query: string (required),
 *   enhanceQuery: boolean (default: true),
 *   disableQueryTags: boolean (default: false),
 *   maxResults: number (default: 10),
 *   minVectorScore: number | null (default: null),
 *   minRerankScore: number | null (default: null),
 *   trackSteps: boolean (default: true),
 *   includeRerank: boolean (default: true)
 * }
 */
export async function POST(request) {
  const searchId = `test_search_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const sessionId = `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 TEST SEMANTIC SEARCH ENDPOINT                                             ║');
  console.log(`║  Search ID: ${searchId.padEnd(65)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const body = await request.json();
    const {
      query,
      enhanceQuery = true,
      disableQueryTags = false,
      maxResults = SEMANTIC_SEARCH_CONFIG.DEFAULT_MAX_RESULTS,
      minVectorScore = null,
      minRerankScore = null,
      trackSteps = true,
      includeRerank = true,
      userId = TEST_USER_ID  // Allow override for testing different users
    } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 });
    }

    console.log(`📝 Test params:`, {
      query: query.substring(0, 50),
      enhanceQuery,
      disableQueryTags,
      maxResults,
      minVectorScore,
      minRerankScore,
      userId
    });

    // Call semantic search service
    const searchResult = await SemanticSearchService.search(userId, query, {
      maxResults,
      includeMetadata: true,
      searchId,
      minVectorScore,
      subscriptionLevel: 'premium',  // Test as premium user
      sessionId,
      trackSteps,
      enhanceQuery,
      disableQueryTags,
      budgetCheck: null  // Skip budget check for tests
    });

    let finalResults = searchResult.results;
    let rerankMetadata = null;

    // Apply reranking if requested and there are results
    if (includeRerank && finalResults.length > 0) {
      console.log(`🔄 Applying rerank to ${finalResults.length} results...`);

      const rerankResult = await RerankService.rerankContacts(query, finalResults, {
        subscriptionLevel: 'premium',
        topN: maxResults,
        minRerankScore,
        rerankId: `${searchId}_rerank`,
        detectedLanguage: searchResult.searchMetadata.detectedLanguage,
        sessionId,
        userId,
        trackSteps
      });

      finalResults = rerankResult.results;
      rerankMetadata = rerankResult.metadata;
    }

    // Build response
    const response = {
      success: true,
      results: finalResults,
      searchMetadata: {
        ...searchResult.searchMetadata,
        rerank: rerankMetadata
      },
      testInfo: {
        testUserId: userId,
        testEndpoint: true,
        searchId,
        sessionId
      }
    };

    console.log('');
    console.log(`✅ Test search complete: ${finalResults.length} results`);
    console.log('');

    return NextResponse.json(response);

  } catch (error) {
    console.error(`❌ Test search failed:`, error.message);
    console.error(error.stack);

    return NextResponse.json({
      success: false,
      error: error.message,
      searchId
    }, { status: 500 });
  }
}

/**
 * GET /api/test/semantic-search
 *
 * Health check and usage info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/semantic-search',
    method: 'POST',
    description: 'Test endpoint for semantic search (bypasses auth)',
    defaultTestUser: TEST_USER_ID,
    body: {
      query: 'string (required)',
      enhanceQuery: 'boolean (default: true)',
      disableQueryTags: 'boolean (default: false)',
      maxResults: 'number (default: 10)',
      minVectorScore: 'number | null (default: null)',
      minRerankScore: 'number | null (default: null)',
      trackSteps: 'boolean (default: true)',
      includeRerank: 'boolean (default: true)',
      userId: 'string (optional, override test user)'
    },
    example: {
      query: 'CEO startup AI',
      enhanceQuery: true,
      disableQueryTags: false,
      maxResults: 10,
      minVectorScore: 0.3,
      minRerankScore: 0.1
    }
  });
}
