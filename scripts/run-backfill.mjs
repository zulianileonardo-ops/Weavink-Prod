#!/usr/bin/env node
// scripts/run-backfill.mjs
// Runner script for backfilling contact tags

import { backfillContactTags, backfillAllUsers } from '../lib/services/serviceContact/server/scripts/backfillContactTags.js';

// Parse command line arguments
const args = process.argv.slice(2);
const userId = args[0];
const dryRun = args.includes('--dry-run');
const onlyEmpty = args.includes('--only-empty');
const allUsers = args.includes('--all-users');

console.log('🚀 Contact Tag Backfill Runner\n');

async function main() {
  try {
    if (allUsers) {
      // Backfill all users (ADMIN ONLY)
      console.log('⚠️  WARNING: This will backfill ALL users in the system!');
      console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');

      await new Promise(resolve => setTimeout(resolve, 5000));

      const result = await backfillAllUsers({ dryRun, onlyEmpty });

      console.log('\n✅ All users backfill completed!');
      console.log('📊 Final Results:', result);

    } else if (userId) {
      // Backfill single user
      console.log(`📦 Backfilling user: ${userId}`);
      console.log(`   Options: { dryRun: ${dryRun}, onlyEmpty: ${onlyEmpty} }\n`);

      const result = await backfillContactTags(userId, { dryRun, onlyEmpty });

      console.log('\n✅ Backfill completed!');
      console.log('📊 Results:', result);

    } else {
      // Show usage
      console.log('Usage:');
      console.log('  node scripts/run-backfill.mjs <userId> [options]');
      console.log('  node scripts/run-backfill.mjs --all-users [options]');
      console.log('');
      console.log('Options:');
      console.log('  --dry-run      Test without saving to Firestore');
      console.log('  --only-empty   Only tag contacts without existing tags');
      console.log('  --all-users    Backfill all users (ADMIN ONLY)');
      console.log('');
      console.log('Examples:');
      console.log('  # Backfill your contacts (replace with your userId)');
      console.log('  node scripts/run-backfill.mjs IFxPCgSA8NapEq5W8jh6yHrtJGJ2');
      console.log('');
      console.log('  # Test run (dry run - no changes saved)');
      console.log('  node scripts/run-backfill.mjs IFxPCgSA8NapEq5W8jh6yHrtJGJ2 --dry-run');
      console.log('');
      console.log('  # Only tag contacts without tags');
      console.log('  node scripts/run-backfill.mjs IFxPCgSA8NapEq5W8jh6yHrtJGJ2 --only-empty');
      console.log('');
      console.log('  # Backfill all users');
      console.log('  node scripts/run-backfill.mjs --all-users --only-empty');

      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Backfill failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
