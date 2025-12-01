// app/api/admin/backfill-tags/route.js
// Admin endpoint to backfill contact tags

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { AutoTaggingService } from '@/lib/services/serviceContact/server/AutoTaggingService';

/**
 * POST /api/admin/backfill-tags
 *
 * Body: {
 *   userId: string (required) - User ID to backfill
 *   dryRun: boolean (optional, default: false) - Test without saving
 *   onlyEmpty: boolean (optional, default: false) - Only tag contacts without tags
 *   adminKey: string (required) - Admin authentication key
 * }
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { userId, dryRun = false, onlyEmpty = false, adminKey } = body;

    // Basic admin key check (use env variable)
    const expectedKey = process.env.ADMIN_API_KEY || 'backfill-2024';
    if (adminKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  BACKFILL CONTACT TAGS (API)                                   ║`);
    console.log(`╠════════════════════════════════════════════════════════════════╣`);
    console.log(`║  User ID:         ${userId.slice(-20).padEnd(42)}║`);
    console.log(`║  Dry Run:         ${(dryRun ? 'YES (no updates)' : 'NO (will update)').padEnd(42)}║`);
    console.log(`║  Only Empty:      ${(onlyEmpty ? 'YES (skip tagged)' : 'NO (all contacts)').padEnd(42)}║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    // 1. Query all contacts for user
    const contactsRef = adminDb.collection('Contacts').doc(userId);
    const contactsDoc = await contactsRef.get();

    if (!contactsDoc.exists) {
      console.log(`❌ No contacts document found for user: ${userId}`);
      return NextResponse.json({
        success: true,
        total: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        duration: '0.00',
        message: 'No contacts found for this user'
      });
    }

    const allContacts = contactsDoc.data().contacts || [];
    console.log(`📊 Found ${allContacts.length} total contacts`);

    // Filter contacts based on options
    let contactsToProcess = allContacts;
    if (onlyEmpty) {
      contactsToProcess = allContacts.filter(c => !c.tags || c.tags.length === 0);
      console.log(`📊 Filtering to ${contactsToProcess.length} contacts without tags`);
    }

    if (contactsToProcess.length === 0) {
      console.log(`✅ No contacts to process`);
      return NextResponse.json({
        success: true,
        total: allContacts.length,
        succeeded: 0,
        failed: 0,
        skipped: allContacts.length,
        duration: '0.00',
        message: 'All contacts already have tags'
      });
    }

    // Fetch user data for feature flags
    const userDoc = await adminDb.collection('AccountData').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const taggedResults = [];

    console.log(`\n🚀 Starting parallel tagging of ${contactsToProcess.length} contacts...`);

    // 2. Process ALL contacts in parallel (no batching, no rate limiting)
    await Promise.allSettled(contactsToProcess.map(async (contact) => {
      try {
        // Skip if contact already has tags (only if onlyEmpty is false)
        if (!onlyEmpty && contact.tags && contact.tags.length > 0) {
          skipped++;
          return;
        }

        // Call AutoTaggingService
        const taggedContact = await AutoTaggingService.tagContact(
          contact,
          userId,
          userData,
          null,  // sessionId: null for backfill
          null   // budgetCheck: null
        );

        // Check if tags were generated
        if (!taggedContact.tags || taggedContact.tags.length === 0) {
          skipped++;
          console.log(`⏭️  ${contact.name || contact.email}: No tags generated`);
          return;
        }

        // Update contact with tags (in-memory)
        contact.tags = taggedContact.tags;
        if (taggedContact.metadata) {
          contact.metadata = {
            ...contact.metadata,
            ...taggedContact.metadata
          };
        }

        succeeded++;
        taggedResults.push({
          name: contact.name || contact.email,
          tags: taggedContact.tags
        });
        console.log(`✅ ${contact.name || contact.email}: ${taggedContact.tags.join(', ')}`);

      } catch (error) {
        failed++;
        console.error(`❌ ${contact.name || contact.email}:`, error.message);
      }
    }));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 3. Update Firestore with all tagged contacts (if not dry run)
    if (!dryRun && succeeded > 0) {
      console.log(`\n💾 Updating Firestore with ${succeeded} tagged contacts...`);

      try {
        await contactsRef.update({
          contacts: allContacts,
          lastModified: new Date().toISOString()
        });
        console.log(`✅ Firestore updated successfully`);
      } catch (updateError) {
        console.error(`❌ Failed to update Firestore:`, updateError.message);
        return NextResponse.json({
          success: false,
          error: 'Failed to save to Firestore',
          total: contactsToProcess.length,
          succeeded: 0,
          failed: contactsToProcess.length,
          skipped: 0,
          duration
        }, { status: 500 });
      }
    } else if (dryRun) {
      console.log(`\n⚠️  DRY RUN: Skipping Firestore update`);
    }

    // 4. Print final summary
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  BACKFILL COMPLETE                                             ║`);
    console.log(`╠════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Total Contacts:     ${contactsToProcess.length.toString().padEnd(41)}║`);
    console.log(`║  Successfully Tagged: ${succeeded.toString().padEnd(40)}║`);
    console.log(`║  Failed:             ${failed.toString().padEnd(41)}║`);
    console.log(`║  Skipped:            ${skipped.toString().padEnd(41)}║`);
    console.log(`║  Duration:           ${duration}s${' '.repeat(38 - duration.length)}║`);
    console.log(`║  Dry Run:            ${(dryRun ? 'YES (not saved)' : 'NO (saved)').padEnd(41)}║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    return NextResponse.json({
      success: true,
      total: contactsToProcess.length,
      succeeded,
      failed,
      skipped,
      duration,
      dryRun,
      results: taggedResults.slice(0, 20) // Return first 20 results as sample
    });

  } catch (error) {
    console.error('❌ Backfill API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint for health check / info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/backfill-tags',
    method: 'POST',
    description: 'Backfill contact tags for a user',
    body: {
      userId: 'string (required)',
      dryRun: 'boolean (optional, default: false)',
      onlyEmpty: 'boolean (optional, default: false)',
      adminKey: 'string (required)'
    },
    example: {
      userId: 'IFxPCgSA8NapEq5W8jh6yHrtJGJ2',
      dryRun: false,
      onlyEmpty: false,
      adminKey: 'your-admin-key'
    }
  });
}
