#!/usr/bin/env node
// scripts/backfill-tags-standalone.mjs
// Standalone backfill script with no @/ imports

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// Firebase Admin Setup (inline to avoid @/ imports)
// ============================================
let adminDb;

function initFirebaseAdmin() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('✅ Firebase Admin initialized');
  }
  // Use named database if specified, otherwise fall back to default
  const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
  return getFirestore(getApp(), databaseId);
}

// ============================================
// Gemini Setup (using @google/generative-ai)
// ============================================
let genAI;
let geminiModel;

function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ No GEMINI_API_KEY found, will use static cache only');
    return null;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
}

// ============================================
// Simple Tagging Logic (inline)
// ============================================

// Static cache for common job titles
const STATIC_TAG_CACHE = {
  'ceo': ['ceo', 'chief-executive-officer', 'executive', 'c-level', 'leadership'],
  'cto': ['cto', 'chief-technology-officer', 'tech-leadership', 'c-level', 'engineering'],
  'cfo': ['cfo', 'chief-financial-officer', 'finance', 'c-level', 'executive'],
  'software engineer': ['software-engineer', 'developer', 'engineering', 'coding'],
  'senior software engineer': ['senior', 'software-engineer', 'developer', 'engineering'],
  'frontend developer': ['frontend', 'developer', 'javascript', 'react', 'ui'],
  'backend developer': ['backend', 'developer', 'api', 'server-side'],
  'full stack developer': ['full-stack', 'developer', 'frontend', 'backend'],
  'data scientist': ['data-scientist', 'machine-learning', 'python', 'analytics'],
  'product manager': ['product-manager', 'product', 'management', 'strategy'],
  'designer': ['designer', 'ui-ux', 'creative', 'visual-design'],
  'ux designer': ['ux-designer', 'user-experience', 'design', 'research'],
  'devops engineer': ['devops', 'infrastructure', 'ci-cd', 'cloud', 'automation'],
  'marketing manager': ['marketing', 'management', 'growth', 'campaigns'],
  'sales manager': ['sales', 'management', 'business-development', 'revenue'],
};

function checkStaticCache(contact) {
  const jobTitle = (contact.jobTitle || '').toLowerCase().trim();
  const company = (contact.company || '').toLowerCase().trim();

  // Check exact match first
  if (STATIC_TAG_CACHE[jobTitle]) {
    return STATIC_TAG_CACHE[jobTitle];
  }

  // Check partial matches
  for (const [key, tags] of Object.entries(STATIC_TAG_CACHE)) {
    if (jobTitle.includes(key) || key.includes(jobTitle)) {
      return tags;
    }
  }

  return null;
}

async function generateTagsWithGemini(contact) {
  const contactInfo = [
    contact.name && `Name: ${contact.name}`,
    contact.jobTitle && `Job Title: ${contact.jobTitle}`,
    contact.company && `Company: ${contact.company}`,
    contact.email && `Email: ${contact.email}`,
    contact.notes && `Notes: ${contact.notes}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are a contact categorization AI. Generate 5-15 relevant tags for this contact.

CONTACT:
${contactInfo}

INSTRUCTIONS:
1. Generate 5-15 relevant lowercase, hyphenated tags
2. Prioritize SPECIFIC technologies (react, python, aws, docker, kubernetes)
3. Include role type (frontend-engineer, backend-engineer, data-scientist)
4. Include seniority if mentioned (senior, lead, staff, junior)
5. Include industry domain (fintech, healthcare, saas, ai-ml)
6. NO generic tags like "professional" or "person"

RESPOND WITH VALID JSON ONLY:
{"tags": ["tag1", "tag2", ...]}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tags && Array.isArray(parsed.tags)) {
        return parsed.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0);
      }
    }
  } catch (error) {
    console.error(`⚠️ Gemini error for ${contact.name}:`, error.message);
  }

  return null;
}

// ============================================
// Main Backfill Logic
// ============================================

async function backfillContactTags(userId, options = {}) {
  const { dryRun = false, onlyEmpty = false, force = false } = options;

  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  BACKFILL CONTACT TAGS                                         ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  User ID:         ${userId.slice(-20).padEnd(42)}║`);
  console.log(`║  Dry Run:         ${(dryRun ? 'YES (no updates)' : 'NO (will update)').padEnd(42)}║`);
  console.log(`║  Force Re-tag:    ${(force ? 'YES (replace existing)' : 'NO (skip tagged)').padEnd(42)}║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  const startTime = Date.now();

  // Initialize Firebase
  adminDb = initFirebaseAdmin();

  // Initialize Gemini model
  geminiModel = initGemini();
  if (geminiModel) {
    console.log('✅ Gemini model initialized');
  }

  try {
    // 1. Query all contacts for user
    const contactsRef = adminDb.collection('Contacts').doc(userId);
    const contactsDoc = await contactsRef.get();

    if (!contactsDoc.exists) {
      console.log(`❌ No contacts document found for user: ${userId}`);
      return { total: 0, succeeded: 0, failed: 0, skipped: 0, duration: 0 };
    }

    const allContacts = contactsDoc.data().contacts || [];
    console.log(`📊 Found ${allContacts.length} total contacts`);

    // Filter contacts
    let contactsToProcess = allContacts;
    if (onlyEmpty) {
      contactsToProcess = allContacts.filter(c => !c.tags || c.tags.length === 0);
      console.log(`📊 Filtering to ${contactsToProcess.length} contacts without tags`);
    }

    if (contactsToProcess.length === 0) {
      console.log(`✅ No contacts to process`);
      return { total: allContacts.length, succeeded: 0, failed: 0, skipped: allContacts.length, duration: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`\n🚀 Starting sequential tagging of ${contactsToProcess.length} contacts (3s delay to avoid rate limits)...`);
    console.log(`⏱️  Estimated time: ${Math.ceil(contactsToProcess.length * 3 / 60)} minutes\n`);

    // 2. Process contacts SEQUENTIALLY with delay to avoid rate limits
    for (let i = 0; i < contactsToProcess.length; i++) {
      const contact = contactsToProcess[i];

      try {
        // Skip if already has tags (unless --force is used)
        if (!force && contact.tags && contact.tags.length > 0) {
          skipped++;
          continue;
        }

        // Try static cache first
        let tags = checkStaticCache(contact);

        // Fall back to Gemini if no cache hit
        if (!tags && geminiModel) {
          tags = await generateTagsWithGemini(contact);

          // Add delay after Gemini call to avoid rate limits (3 seconds = 20 req/min, under 25 limit)
          if (i < contactsToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

        if (!tags || tags.length === 0) {
          skipped++;
          console.log(`⏭️  [${i + 1}/${contactsToProcess.length}] ${contact.name || contact.email}: No tags generated`);
          continue;
        }

        // Update contact in-memory
        contact.tags = tags;
        succeeded++;
        console.log(`✅ [${i + 1}/${contactsToProcess.length}] ${contact.name || contact.email}: ${tags.join(', ')}`);

      } catch (error) {
        failed++;
        console.error(`❌ [${i + 1}/${contactsToProcess.length}] ${contact.name || contact.email}:`, error.message);

        // Still add delay on error to avoid hammering the API
        if (i < contactsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 3. Update Firestore
    if (!dryRun && succeeded > 0) {
      console.log(`\n💾 Updating Firestore with ${succeeded} tagged contacts...`);
      await contactsRef.update({
        contacts: allContacts,
        lastModified: new Date().toISOString()
      });
      console.log(`✅ Firestore updated successfully`);
    } else if (dryRun) {
      console.log(`\n⚠️  DRY RUN: Skipping Firestore update`);
    }

    // 4. Summary
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  BACKFILL COMPLETE                                             ║`);
    console.log(`╠════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Total Contacts:     ${contactsToProcess.length.toString().padEnd(41)}║`);
    console.log(`║  Successfully Tagged: ${succeeded.toString().padEnd(40)}║`);
    console.log(`║  Failed:             ${failed.toString().padEnd(41)}║`);
    console.log(`║  Skipped:            ${skipped.toString().padEnd(41)}║`);
    console.log(`║  Duration:           ${duration}s${' '.repeat(38 - duration.length)}║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    return { total: contactsToProcess.length, succeeded, failed, skipped, duration };

  } catch (error) {
    console.error(`\n❌ Backfill failed:`, error);
    throw error;
  }
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);
const userId = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const onlyEmpty = args.includes('--only-empty');
const force = args.includes('--force');

if (!userId) {
  console.log('Usage: node scripts/backfill-tags-standalone.mjs <userId> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run     Test without saving');
  console.log('  --only-empty  Only tag contacts without tags');
  console.log('  --force       Re-tag ALL contacts (even those with existing tags)');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/backfill-tags-standalone.mjs IFxPCgSA8NapEq5W8jh6yHrtJGJ2 --force');
  console.log('  node scripts/backfill-tags-standalone.mjs IFxPCgSA8NapEq5W8jh6yHrtJGJ2 --dry-run --force');
  process.exit(1);
}

backfillContactTags(userId, { dryRun, onlyEmpty, force })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
