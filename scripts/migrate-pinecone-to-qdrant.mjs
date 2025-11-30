#!/usr/bin/env node
// scripts/migrate-pinecone-to-qdrant.mjs
// Data migration script: Pinecone → Qdrant
// Imports vectors from pinecone_export.json and uploads to Qdrant

import { readFileSync } from 'fs';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.QDRANT_URL) {
  console.error('❌ ERROR: QDRANT_URL not found in .env file');
  process.exit(1);
}

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
});

// Configuration
const EMBEDDING_DIMENSION = 1024;  // embed-multilingual-v3.0 dimensions
const BATCH_SIZE = 50;             // Upsert 50 vectors at a time

/**
 * Main migration function
 */
async function migrateToQdrant() {
  console.log('🚀 [Migration] Starting Pinecone → Qdrant migration...\n');

  try {
    // Step 1: Load exported Pinecone data
    console.log('📂 [Migration] Step 1: Loading pinecone_export.json...');
    const exportData = JSON.parse(readFileSync('./pinecone_export.json', 'utf-8'));
    console.log(`✅ [Migration] Loaded ${exportData.length} vectors from export file\n`);

    // Step 2: Group vectors by userId (extracted from namespace)
    console.log('📦 [Migration] Step 2: Grouping vectors by user...');
    const vectorsByUser = new Map();

    for (const vector of exportData) {
      // Extract userId from namespace: "user_IFxPCgSA8NapEq5W8jh6yHrtJGJ2" → "IFxPCgSA8NapEq5W8jh6yHrtJGJ2"
      const userId = vector.namespace.replace('user_', '');

      if (!vectorsByUser.has(userId)) {
        vectorsByUser.set(userId, []);
      }

      vectorsByUser.get(userId).push(vector);
    }

    console.log(`✅ [Migration] Grouped into ${vectorsByUser.size} users:`);
    for (const [userId, vectors] of vectorsByUser) {
      console.log(`   - ${userId}: ${vectors.length} vectors`);
    }
    console.log();

    // Step 3: Migrate each user's vectors to Qdrant
    console.log('📤 [Migration] Step 3: Migrating vectors to Qdrant...\n');

    let totalMigrated = 0;
    let totalErrors = 0;

    for (const [userId, vectors] of vectorsByUser) {
      console.log(`👤 [Migration] Processing user: ${userId} (${vectors.length} vectors)`);

      try {
        // Ensure collection exists
        console.log(`   🔍 Checking if collection exists...`);
        let collectionExists = false;

        try {
          await qdrantClient.getCollection(userId);
          collectionExists = true;
          console.log(`   ✅ Collection "${userId}" exists`);
        } catch (error) {
          if (error.status === 404 || error.message?.includes('not found')) {
            console.log(`   ⚠️  Collection does not exist. Creating...`);

            await qdrantClient.createCollection(userId, {
              vectors: {
                size: EMBEDDING_DIMENSION,
                distance: 'Cosine'
              },
              on_disk_payload: true
            });

            console.log(`   ✅ Collection "${userId}" created`);
          } else {
            throw error;
          }
        }

        // Migrate vectors in batches
        console.log(`   📤 Migrating ${vectors.length} vectors (batch size: ${BATCH_SIZE})...`);

        for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
          const batch = vectors.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);

          // Transform Pinecone vectors to Qdrant format
          const points = batch.map(vector => ({
            id: uuidv4(),                    // Generate new UUID
            vector: vector.values,           // Embedding vector
            payload: {
              originalId: vector.id,         // CRITICAL: Store original Pinecone ID
              ...vector.metadata             // Include all metadata
            }
          }));

          // Upsert to Qdrant
          await qdrantClient.upsert(userId, {
            wait: true,
            points
          });

          totalMigrated += batch.length;
          console.log(`   📦 Batch ${batchNumber}/${totalBatches}: Migrated ${batch.length} vectors (${totalMigrated}/${exportData.length} total)`);
        }

        console.log(`   ✅ User "${userId}" migration complete: ${vectors.length} vectors\n`);

      } catch (error) {
        console.error(`   ❌ Failed to migrate user "${userId}":`, error.message);
        totalErrors++;
      }
    }

    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 [Migration] MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total vectors in export:     ${exportData.length}`);
    console.log(`Total vectors migrated:      ${totalMigrated}`);
    console.log(`Total users:                 ${vectorsByUser.size}`);
    console.log(`Errors:                      ${totalErrors}`);
    console.log(`Success rate:                ${((totalMigrated / exportData.length) * 100).toFixed(2)}%`);
    console.log('='.repeat(60));

    if (totalMigrated === exportData.length) {
      console.log('\n✅ [Migration] SUCCESS! All vectors migrated successfully.');
      console.log('\n🎉 Migration complete! You can now use Qdrant for semantic search.\n');
    } else {
      console.log(`\n⚠️  [Migration] WARNING: ${exportData.length - totalMigrated} vectors failed to migrate.`);
    }

  } catch (error) {
    console.error('\n❌ [Migration] FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateToQdrant();
