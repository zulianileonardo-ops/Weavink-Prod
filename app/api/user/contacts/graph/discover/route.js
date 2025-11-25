// app/api/user/contacts/graph/discover/route.js
// POST - Trigger relationship discovery (background job pattern)

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { ContactCRUDService } from '@/lib/services/serviceContact/server/ContactCRUDService';
import RelationshipDiscoveryService from '@/lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService';
import Neo4jSyncService from '@/lib/services/serviceContact/server/neo4j/Neo4jSyncService';
import { DiscoveryJobManager } from '@/lib/services/serviceContact/server/DiscoveryJobManager';

/**
 * Run discovery in background (not awaited by the route)
 */
async function runDiscoveryInBackground(jobId, userId, contacts, options) {
  try {
    // Create progress callback
    const onProgress = (progress, currentStep) => {
      DiscoveryJobManager.updateProgress(jobId, progress, currentStep);
    };

    // Run discovery with progress tracking
    const results = await RelationshipDiscoveryService.discoverAllRelationships(
      userId,
      contacts,
      { ...options, onProgress }
    );

    // Store tiered relationship results for review workflow
    if (results.relationships && results.counts) {
      DiscoveryJobManager.updateRelationshipResults(
        jobId,
        results.relationships,
        results.counts
      );
    }

    // Mark job as completed
    DiscoveryJobManager.completeJob(jobId, results);

  } catch (error) {
    console.error(`❌ Background discovery failed for job ${jobId}:`, error);
    DiscoveryJobManager.failJob(jobId, error.message);
  }
}

/**
 * POST /api/user/contacts/graph/discover
 * Triggers relationship discovery for all user contacts
 * Returns immediately with jobId for progress polling
 *
 * Body (optional):
 * - includeSemantic: boolean - Include semantic similarity (default: true)
 * - forceResync: boolean - Force full resync even if data exists (default: false)
 *
 * Response:
 * - { jobId, status: 'started' } - Job started, poll /discover/status?jobId=x
 */
export async function POST(request) {
  console.log('🔍 POST /api/user/contacts/graph/discover - Request received');

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

    // 3. Parse request body
    let options = {};
    try {
      const body = await request.json();
      options = {
        includeSemantic: body.includeSemantic !== false,
        forceResync: body.forceResync === true
      };
    } catch {
      // No body provided, use defaults
    }

    // 4. Get user's contacts from Firestore
    console.log('📥 Fetching contacts for user:', session.userId);
    const contacts = await ContactCRUDService.getAllContacts({ session });
    console.log(`✅ Found ${contacts.length} contacts`);

    if (contacts.length === 0) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'No contacts to discover relationships for',
        results: {
          totalContacts: 0,
          companiesFound: 0,
          similarityRelationships: 0,
          tagRelationships: 0
        }
      });
    }

    // 5. Create a background job
    const jobId = DiscoveryJobManager.createJob(session.userId);
    console.log(`📋 Created discovery job: ${jobId}`);

    // 6. Start discovery in background (don't await!)
    // This allows the HTTP response to return immediately
    runDiscoveryInBackground(jobId, session.userId, contacts, options);

    // 7. Return job ID immediately
    return NextResponse.json({
      success: true,
      jobId,
      status: 'started',
      message: `Started discovery for ${contacts.length} contacts. Poll /api/user/contacts/graph/discover/status?jobId=${jobId} for progress.`,
      totalContacts: contacts.length
    });

  } catch (error) {
    console.error('❌ API Error in POST /api/user/contacts/graph/discover:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to start discovery',
      details: error.message
    }, { status: 500 });
  }
}
