// app/api/admin/rebuild-vectors/route.js
// API endpoint to rebuild all vectors with Cohere embeddings
// Usage: curl http://localhost:3000/api/admin/rebuild-vectors

import { VectorStorageService } from '@/lib/services/serviceContact/server/vectorStorageService';
import { adminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

const USER_IDS = [
  'IFxPCgSA8NapEq5W8jh6yHrtJGJ2',  // 102 vectors
  'ScmVq6p8ubQ9JFbniF2Vg5ocmbv2'   // 1 vector
];

export async function GET() {
  try {
    console.log('🔄 Starting vector rebuild with Cohere embeddings...');
    const results = [];

    for (const userId of USER_IDS) {
      console.log(`\n👤 Processing user: ${userId}`);

      try {
        // Get user's subscription level from Firestore
        const userDoc = await adminDb.collection('Users').doc(userId).get();

        const userData = userDoc.exists ? userDoc.data() : null;
        const subscriptionLevel = userData?.subscriptionTier || 'premium';

        console.log(`📊 Subscription: ${subscriptionLevel}`);

        // Rebuild vectors
        const result = await VectorStorageService.rebuildUserVectors(userId, subscriptionLevel);

        console.log(`✅ Rebuild complete:`, {
          userId,
          total: result.total,
          rebuilt: result.rebuilt,
          failed: result.failed,
          duration: `${(result.duration / 1000).toFixed(2)}s`
        });

        results.push({
          userId,
          success: true,
          total: result.total,
          rebuilt: result.rebuilt,
          failed: result.failed,
          duration: result.duration
        });

      } catch (error) {
        console.error(`❌ Failed to rebuild vectors for user ${userId}:`, error.message);
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n✅ All users processed!');

    return NextResponse.json({
      success: true,
      message: 'Vector rebuild complete',
      results
    });

  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
