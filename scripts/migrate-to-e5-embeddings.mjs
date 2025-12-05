#!/usr/bin/env node
/**
 * Migration Script: Re-embed all contacts with E5-large
 *
 * IMPORTANT: Run this AFTER deploying embed-server and
 * updating embeddingService.js
 *
 * Usage:
 *   node scripts/migrate-to-e5-embeddings.mjs [--dry-run] [--batch-size=50]
 *
 * Options:
 *   --dry-run      Show what would be done without making changes
 *   --batch-size   Number of contacts to process at once (default: 50)
 *   --user-id      Only migrate specific user (for testing)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://localhost:5555';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '50');
const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_USER = process.argv.find(a => a.startsWith('--user-id='))?.split('=')[1];

// Initialize Firebase Admin
let db;
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require('../serviceAccountKey.json');

  initializeApp({
    credential: cert(serviceAccount),
  });
  db = getFirestore();
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  console.error('   Set FIREBASE_SERVICE_ACCOUNT env var or place serviceAccountKey.json in project root');
  process.exit(1);
}

// Initialize Qdrant
const qdrant = new QdrantClient({ url: QDRANT_URL });

// Stats
const stats = {
  usersProcessed: 0,
  contactsProcessed: 0,
  contactsFailed: 0,
  startTime: Date.now(),
};

/**
 * Generate embedding via embed-server
 */
async function generateEmbedding(text) {
  const response = await fetch(`${EMBED_SERVER_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'intfloat/multilingual-e5-large',
      text: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embed server error: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding;
}

/**
 * Generate embeddings in batch
 */
async function batchGenerateEmbeddings(texts) {
  const response = await fetch(`${EMBED_SERVER_URL}/embed/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'intfloat/multilingual-e5-large',
      texts: texts,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embed server error: ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings;
}

/**
 * Build searchable text from contact
 */
function buildSearchableText(contact) {
  const parts = [];
  if (contact.name) parts.push(contact.name);
  if (contact.jobTitle) parts.push(contact.jobTitle);
  if (contact.company) parts.push(contact.company);
  if (contact.notes) parts.push(contact.notes.substring(0, 500));
  if (contact.message) parts.push(contact.message.substring(0, 500));
  if (contact.tags?.length > 0) parts.push(contact.tags.join(', '));
  if (contact.email) parts.push(contact.email);
  return parts.join(' - ') || 'Unknown contact';
}

/**
 * Process a single user's contacts
 */
async function processUser(userId) {
  console.log(`\n📂 Processing user: ${userId}`);

  try {
    // Get all contacts for this user
    const contactsRef = db.collection('users').doc(userId).collection('contacts');
    const snapshot = await contactsRef.get();

    if (snapshot.empty) {
      console.log(`   No contacts found`);
      return;
    }

    const contacts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`   Found ${contacts.length} contacts`);

    // Process in batches
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => buildSearchableText(c));

      console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contacts.length / BATCH_SIZE)}: ${batch.length} contacts`);

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would generate ${batch.length} embeddings`);
        stats.contactsProcessed += batch.length;
        continue;
      }

      try {
        // Generate embeddings in batch
        const embeddings = await batchGenerateEmbeddings(texts);

        // Upsert to Qdrant
        const points = batch.map((contact, idx) => ({
          id: contact.id,
          vector: embeddings[idx],
          payload: {
            userId: userId,
            name: contact.name || '',
            company: contact.company || '',
            jobTitle: contact.jobTitle || '',
            email: contact.email || '',
          },
        }));

        await qdrant.upsert(userId, {
          wait: true,
          points: points,
        });

        stats.contactsProcessed += batch.length;
        console.log(`   ✅ Upserted ${batch.length} vectors`);

      } catch (error) {
        console.error(`   ❌ Batch failed: ${error.message}`);
        stats.contactsFailed += batch.length;
      }

      // Small delay to avoid overwhelming the server
      await new Promise(r => setTimeout(r, 100));
    }

    stats.usersProcessed++;

  } catch (error) {
    console.error(`   ❌ User processing failed: ${error.message}`);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('  E5-LARGE EMBEDDING MIGRATION');
  console.log('='.repeat(60));
  console.log(`  Embed Server: ${EMBED_SERVER_URL}`);
  console.log(`  Qdrant: ${QDRANT_URL}`);
  console.log(`  Batch Size: ${BATCH_SIZE}`);
  console.log(`  Dry Run: ${DRY_RUN}`);
  console.log('='.repeat(60));

  // Check embed-server health
  try {
    const healthRes = await fetch(`${EMBED_SERVER_URL}/health`);
    const health = await healthRes.json();
    if (health.status !== 'ok') {
      throw new Error('Embed server not healthy');
    }
    console.log('\n✅ Embed server is healthy');
    console.log(`   Loaded models: ${health.fastembed_loaded?.join(', ') || 'none'}`);
  } catch (error) {
    console.error('\n❌ Cannot connect to embed-server:', error.message);
    console.error('   Make sure embed-server is running at', EMBED_SERVER_URL);
    process.exit(1);
  }

  // Check Qdrant health
  try {
    await qdrant.getCollections();
    console.log('✅ Qdrant is healthy');
  } catch (error) {
    console.error('❌ Cannot connect to Qdrant:', error.message);
    console.error('   Make sure Qdrant is running at', QDRANT_URL);
    process.exit(1);
  }

  // Get all users or specific user
  let userIds = [];
  if (SPECIFIC_USER) {
    userIds = [SPECIFIC_USER];
    console.log(`\n📊 Processing specific user: ${SPECIFIC_USER}`);
  } else {
    console.log('\n📊 Fetching all users...');
    const usersSnapshot = await db.collection('users').get();
    userIds = usersSnapshot.docs.map(doc => doc.id);
    console.log(`   Found ${userIds.length} users`);
  }

  // Process each user
  for (const userId of userIds) {
    await processUser(userId);
  }

  // Final stats
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('  MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Users processed: ${stats.usersProcessed}`);
  console.log(`  Contacts processed: ${stats.contactsProcessed}`);
  console.log(`  Contacts failed: ${stats.contactsFailed}`);
  console.log(`  Total time: ${elapsed}s`);
  console.log('='.repeat(60));
}

// Run migration
migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
