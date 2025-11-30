#!/usr/bin/env node
// rebuild-vectors-cohere.mjs
// Rebuild all vectors with Cohere embeddings (correct inputType)
// Run from project root: node rebuild-vectors-cohere.mjs

import { VectorStorageService } from './lib/services/serviceContact/server/vectorStorageService.js';
import { adminDb } from './lib/firebaseAdmin.js';

const USER_IDS = [
  'IFxPCgSA8NapEq5W8jh6yHrtJGJ2',  // 102 vectors
  'ScmVq6p8ubQ9JFbniF2Vg5ocmbv2'   // 1 vector
];

async function rebuildAllVectors() {
  console.log('🔄 Rebuilding Vectors with Cohere Embeddings');
  console.log('='.repeat(60));
  console.log('');

  for (const userId of USER_IDS) {
    console.log(`\n👤 Processing user: ${userId}`);
    console.log('-'.repeat(60));

    try {
      // Get user's subscription level from Firestore
      const userDoc = await adminDb.collection('Users').doc(userId).get();

      if (!userDoc.exists) {
        console.log(`⚠️  User document not found, using default: premium`);
      }

      const userData = userDoc.data();
      const subscriptionLevel = userData?.subscriptionTier || 'premium';

      console.log(`📊 Subscription: ${subscriptionLevel}`);

      // Rebuild vectors
      const result = await VectorStorageService.rebuildUserVectors(userId, subscriptionLevel);

      console.log(`✅ Rebuild complete:`, {
        total: result.total,
        rebuilt: result.rebuilt,
        failed: result.failed,
        duration: `${(result.duration / 1000).toFixed(2)}s`
      });

    } catch (error) {
      console.error(`❌ Failed to rebuild vectors for user ${userId}:`, error.message);
      console.error(error.stack);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All users processed!');
  console.log('='.repeat(60));
}

// Run rebuild
rebuildAllVectors()
  .then(() => {
    console.log('\n✅ SUCCESS! All vectors rebuilt with Cohere embeddings.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
