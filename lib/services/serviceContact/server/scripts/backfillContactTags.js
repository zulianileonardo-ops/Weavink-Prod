// lib/services/serviceContact/server/scripts/backfillContactTags.js
// Backfill script to add auto-generated tags to existing contacts

import { adminDb } from '@/lib/firebaseAdmin.js';
import { AutoTaggingService } from '../AutoTaggingService.js';

/**
 * Backfill tags for all existing contacts of a user
 *
 * @param {string} userId - User ID to backfill contacts for
 * @param {object} options - Backfill options
 * @param {boolean} options.dryRun - If true, don't actually update contacts (default: false)
 * @param {boolean} options.onlyEmpty - If true, only tag contacts without tags (default: false)
 * @returns {Promise<object>} Backfill results
 */
export async function backfillContactTags(userId, options = {}) {
  const { dryRun = false, onlyEmpty = false } = options;

  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  BACKFILL CONTACT TAGS                                         ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  User ID:         ${userId.slice(-20).padEnd(42)}║`);
  console.log(`║  Dry Run:         ${(dryRun ? 'YES (no updates)' : 'NO (will update)').padEnd(42)}║`);
  console.log(`║  Only Empty:      ${(onlyEmpty ? 'YES (skip tagged)' : 'NO (all contacts)').padEnd(42)}║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  const startTime = Date.now();

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

    // Filter contacts based on options
    let contactsToProcess = allContacts;
    if (onlyEmpty) {
      contactsToProcess = allContacts.filter(c => !c.tags || c.tags.length === 0);
      console.log(`📊 Filtering to ${contactsToProcess.length} contacts without tags`);
    }

    if (contactsToProcess.length === 0) {
      console.log(`✅ No contacts to process`);
      return { total: allContacts.length, succeeded: 0, failed: 0, skipped: allContacts.length, duration: 0 };
    }

    // Fetch user data for feature flags
    const userDoc = await adminDb.collection('AccountData').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`\n🚀 Starting parallel tagging of ${contactsToProcess.length} contacts...`);
    console.log(`⏱️  This should take ~30-60 seconds with parallel processing\n`);

    // 2. Process ALL contacts in parallel (no batching, no rate limiting)
    const results = await Promise.allSettled(contactsToProcess.map(async (contact) => {
      try {
        // Skip if contact already has tags (only if onlyEmpty is false)
        if (!onlyEmpty && contact.tags && contact.tags.length > 0) {
          skipped++;
          return { success: true, name: contact.name, reason: 'already_has_tags' };
        }

        // Call AutoTaggingService
        const taggedContact = await AutoTaggingService.tagContact(
          contact,
          userId,
          userData,
          null,  // sessionId: null for backfill (standalone operation)
          null   // budgetCheck: null (will be checked inside tagContact)
        );

        // Check if tags were generated
        if (!taggedContact.tags || taggedContact.tags.length === 0) {
          skipped++;
          console.log(`⏭️  ${contact.name || contact.email}: No tags generated (likely skipped or no taggable data)`);
          return { success: true, name: contact.name, reason: 'no_tags_generated' };
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
        console.log(`✅ ${contact.name || contact.email}: ${taggedContact.tags.join(', ')}`);
        return { success: true, name: contact.name, tags: taggedContact.tags };

      } catch (error) {
        failed++;
        console.error(`❌ ${contact.name || contact.email}:`, error.message);
        return { success: false, name: contact.name, error: error.message };
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
        return {
          total: contactsToProcess.length,
          succeeded: 0,
          failed: contactsToProcess.length,
          skipped: 0,
          duration,
          error: 'firestore_update_failed'
        };
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

    return {
      total: contactsToProcess.length,
      succeeded,
      failed,
      skipped,
      duration
    };

  } catch (error) {
    console.error(`\n❌ Backfill failed:`, error);
    throw error;
  }
}

/**
 * Backfill tags for all users (ADMIN ONLY)
 *
 * @param {object} options - Backfill options
 * @returns {Promise<object>} Aggregate results
 */
export async function backfillAllUsers(options = {}) {
  console.log(`\n🌍 BACKFILLING ALL USERS`);
  console.log(`⚠️  This may take a while...\n`);

  const startTime = Date.now();

  try {
    // Get all users from AccountData
    const usersSnapshot = await adminDb.collection('AccountData').get();
    const userIds = usersSnapshot.docs.map(doc => doc.id);

    console.log(`📊 Found ${userIds.length} users to process\n`);

    const results = {
      totalUsers: userIds.length,
      processedUsers: 0,
      totalContacts: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      totalSkipped: 0,
      errors: []
    };

    // Process users one by one (not in parallel to avoid overwhelming the system)
    for (const userId of userIds) {
      try {
        console.log(`\n📦 Processing user ${results.processedUsers + 1}/${userIds.length}: ${userId.slice(-12)}`);

        const userResult = await backfillContactTags(userId, options);

        results.processedUsers++;
        results.totalContacts += userResult.total;
        results.totalSucceeded += userResult.succeeded;
        results.totalFailed += userResult.failed;
        results.totalSkipped += userResult.skipped;

      } catch (error) {
        console.error(`❌ Failed to process user ${userId}:`, error.message);
        results.errors.push({ userId, error: error.message });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  ALL USERS BACKFILL COMPLETE                                   ║`);
    console.log(`╠════════════════════════════════════════════════════════════════╣`);
    console.log(`║  Total Users:        ${results.totalUsers.toString().padEnd(41)}║`);
    console.log(`║  Processed Users:    ${results.processedUsers.toString().padEnd(41)}║`);
    console.log(`║  Total Contacts:     ${results.totalContacts.toString().padEnd(41)}║`);
    console.log(`║  Successfully Tagged: ${results.totalSucceeded.toString().padEnd(40)}║`);
    console.log(`║  Failed:             ${results.totalFailed.toString().padEnd(41)}║`);
    console.log(`║  Skipped:            ${results.totalSkipped.toString().padEnd(41)}║`);
    console.log(`║  Duration:           ${duration}s${' '.repeat(38 - duration.length)}║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    return results;

  } catch (error) {
    console.error(`\n❌ All users backfill failed:`, error);
    throw error;
  }
}

// Example usage:
// import { backfillContactTags, backfillAllUsers } from './backfillContactTags.js';
//
// // Backfill a single user
// await backfillContactTags('IFxPCgSA8NapEq5W8jh6yHrtJGJ2');
//
// // Dry run (don't save)
// await backfillContactTags('IFxPCgSA8NapEq5W8jh6yHrtJGJ2', { dryRun: true });
//
// // Only tag contacts without tags
// await backfillContactTags('IFxPCgSA8NapEq5W8jh6yHrtJGJ2', { onlyEmpty: true });
//
// // Backfill all users (ADMIN ONLY)
// await backfillAllUsers({ onlyEmpty: true });
