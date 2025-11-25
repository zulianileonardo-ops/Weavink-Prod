// app/api/user/contacts/graph/suggestions/route.js
// GET - Group suggestions based on discovered relationships

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createApiSession } from '@/lib/server/session';
import RelationshipDiscoveryService from '@/lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService';
import Neo4jSyncService from '@/lib/services/serviceContact/server/neo4j/Neo4jSyncService';

/**
 * GET /api/user/contacts/graph/suggestions
 * Returns AI-suggested groups based on discovered relationships
 * Returns 4 types: company, tag, semantic, knows
 * Uses balanced distribution to ensure all types get representation
 * AI naming generates creative group names via Gemini
 *
 * Query params:
 * - minSimilarity: number - Minimum similarity score (default: 0.75)
 * - maxSuggestions: number - Maximum suggestions to return (default: 40)
 * - generateAINames: boolean - Use AI naming (default: true)
 */
export async function GET(request) {
  console.log('🔍 GET /api/user/contacts/graph/suggestions - Request received');

  try {
    // 1. Authenticate
    const session = await createApiSession(request);
    console.log('✅ Session created for user:', session.userId);

    // 2. Check if Neo4j is enabled
    if (!Neo4jSyncService.isEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'Graph features are not enabled',
        reason: 'NEO4J_URI not configured'
      }, { status: 503 });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const generateAINames = searchParams.get('generateAINames') !== 'false'; // Default: true
    const options = {
      minSimilarity: parseFloat(searchParams.get('minSimilarity')) || 0.75,
      maxSuggestions: parseInt(searchParams.get('maxSuggestions')) || 40, // Increased from 10 to show all types
      generateAINames
    };

    // 4. Get suggestions (with AI naming if enabled)
    console.log(`💡 Fetching group suggestions for user: ${session.userId} (AI naming: ${generateAINames})`);
    const suggestions = await RelationshipDiscoveryService.getSuggestedGroups(
      session.userId,
      options
    );

    // Group suggestions by type for balanced distribution
    const suggestionsByType = {
      company: suggestions.filter(s => s.type === 'company'),
      tag: suggestions.filter(s => s.type === 'tag'),
      semantic: suggestions.filter(s => s.type === 'semantic'),
      knows: suggestions.filter(s => s.type === 'knows')
    };

    // Distribute maxSuggestions evenly across types that have suggestions
    const typesWithSuggestions = Object.keys(suggestionsByType)
      .filter(type => suggestionsByType[type].length > 0);
    const perType = Math.ceil(options.maxSuggestions / Math.max(typesWithSuggestions.length, 1));

    // Build balanced list: take up to perType from each type
    const balancedSuggestions = [];
    for (const type of typesWithSuggestions) {
      balancedSuggestions.push(...suggestionsByType[type].slice(0, perType));
    }

    // Final limit to maxSuggestions (in case rounding pushed us over)
    const limitedSuggestions = balancedSuggestions.slice(0, options.maxSuggestions);

    // Count suggestions by type
    const typeCounts = limitedSuggestions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ Found ${limitedSuggestions.length} suggestions (company: ${typeCounts.company || 0}, tag: ${typeCounts.tag || 0}, semantic: ${typeCounts.semantic || 0}, knows: ${typeCounts.knows || 0})`);

    return NextResponse.json({
      success: true,
      suggestions: limitedSuggestions,
      metadata: {
        totalSuggestions: suggestions.length,
        returnedSuggestions: limitedSuggestions.length,
        typeCounts,
        aiNamingEnabled: options.generateAINames,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ API Error in GET /api/user/contacts/graph/suggestions:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to get group suggestions',
      details: error.message
    }, { status: 500 });
  }
}
