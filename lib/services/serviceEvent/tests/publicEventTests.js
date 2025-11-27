// lib/services/serviceEvent/tests/publicEventTests.js
/**
 * Real-World Tests: Public Events Feature
 *
 * Tests admin-only public event creation, access control, and visibility.
 * Uses REAL Firestore database - no mocks.
 *
 * Test Coverage:
 * - Admin can create public events
 * - Non-admin cannot create public events (403)
 * - Public events visible to all users
 * - Private events only visible to creator
 * - Access control for getEvent()
 * - Query behavior (user events + public events)
 */

import { adminDb, adminAuth } from '../../../firebaseAdmin.js';
import { EventService } from '../server/eventService.js';
import { AdminService } from '../../serviceAdmin/server/adminService.js';

/**
 * Run all public event tests
 * @param {string} testUserPrefix - Prefix for test user IDs
 * @returns {Promise<{passed: number, failed: number, success: boolean}>}
 */
export async function runPublicEventTests(testUserPrefix = 'test-pubevt') {
  console.log('\n🧪 Running Public Events Tests (Real-World)...');

  let passed = 0;
  let failed = 0;
  const results = [];

  // Test users
  const adminUserId = `${testUserPrefix}-admin-${Date.now()}`;
  const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0] || 'admin@test.com';
  const regularUserId = `${testUserPrefix}-user-${Date.now()}`;
  const regularEmail = 'regular@test.com';
  const otherUserId = `${testUserPrefix}-other-${Date.now()}`;

  // Cleanup function
  const cleanup = async () => {
    try {
      // Delete test events
      const eventsSnapshot = await adminDb.collection('events')
        .where('userId', 'in', [adminUserId, regularUserId, otherUserId])
        .get();

      const batch = adminDb.batch();
      eventsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  };

  try {
    // Test 1: Admin can create public event
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const publicEvent = await EventService.createEvent({
        eventData: {
          name: 'Public Tech Conference',
          description: 'Open to all users',
          startDate: new Date('2025-12-01T09:00:00Z'),
          endDate: new Date('2025-12-01T18:00:00Z'),
          location: {
            address: 'Paris, France',
            latitude: 48.8566,
            longitude: 2.3522,
            venue: 'Tech Hub'
          },
          source: 'manual',
          tags: ['tech', 'conference'],
          isPublic: true
        },
        session: adminSession
      });

      if (publicEvent && publicEvent.isPublic === true) {
        console.log('  ✅ Test 1: Admin can create public event');
        passed++;
        results.push({ test: 'Admin creates public event', status: 'PASSED' });
      } else {
        throw new Error('Public event not created with isPublic=true');
      }
    } catch (error) {
      console.log('  ❌ Test 1 Failed:', error.message);
      failed++;
      results.push({ test: 'Admin creates public event', status: 'FAILED', error: error.message });
    }

    // Test 2: Non-admin cannot create public event
    try {
      const regularSession = {
        userId: regularUserId,
        email: regularEmail,
        subscriptionLevel: 'pro'
      };

      let errorThrown = false;
      let errorMessage = '';

      try {
        await EventService.createEvent({
          eventData: {
            name: 'Unauthorized Public Event',
            startDate: new Date('2025-12-02T09:00:00Z'),
            isPublic: true
          },
          session: regularSession
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = error.message;
      }

      if (errorThrown && errorMessage.includes('Only administrators can create public events')) {
        console.log('  ✅ Test 2: Non-admin blocked from creating public event');
        passed++;
        results.push({ test: 'Non-admin blocked from public event', status: 'PASSED' });
      } else {
        throw new Error('Non-admin was able to create public event (should be blocked)');
      }
    } catch (error) {
      console.log('  ❌ Test 2 Failed:', error.message);
      failed++;
      results.push({ test: 'Non-admin blocked from public event', status: 'FAILED', error: error.message });
    }

    // Test 3: Regular user can create private event
    try {
      const regularSession = {
        userId: regularUserId,
        email: regularEmail,
        subscriptionLevel: 'pro'
      };

      const privateEvent = await EventService.createEvent({
        eventData: {
          name: 'Private Meeting',
          startDate: new Date('2025-12-03T10:00:00Z'),
          location: { address: 'My Office' },
          source: 'manual'
        },
        session: regularSession
      });

      if (privateEvent && privateEvent.isPublic === false && privateEvent.userId === regularUserId) {
        console.log('  ✅ Test 3: Regular user can create private event');
        passed++;
        results.push({ test: 'Regular user creates private event', status: 'PASSED' });
      } else {
        throw new Error('Private event not created correctly');
      }
    } catch (error) {
      console.log('  ❌ Test 3 Failed:', error.message);
      failed++;
      results.push({ test: 'Regular user creates private event', status: 'FAILED', error: error.message });
    }

    // Test 4: Public event visible to other users
    try {
      // First, get the public event created by admin
      const publicEventsQuery = await adminDb.collection('events')
        .where('userId', '==', adminUserId)
        .where('isPublic', '==', true)
        .limit(1)
        .get();

      if (publicEventsQuery.empty) {
        throw new Error('Public event not found in database');
      }

      const publicEventId = publicEventsQuery.docs[0].id;

      // Try to access it as a different user
      const otherSession = {
        userId: otherUserId,
        email: 'other@test.com',
        subscriptionLevel: 'pro'
      };

      const accessedEvent = await EventService.getEvent({
        eventId: publicEventId,
        session: otherSession
      });

      if (accessedEvent && accessedEvent.isPublic === true) {
        console.log('  ✅ Test 4: Public event accessible to other users');
        passed++;
        results.push({ test: 'Public event accessible to others', status: 'PASSED' });
      } else {
        throw new Error('Public event not accessible to other users');
      }
    } catch (error) {
      console.log('  ❌ Test 4 Failed:', error.message);
      failed++;
      results.push({ test: 'Public event accessible to others', status: 'FAILED', error: error.message });
    }

    // Test 5: Private event NOT visible to other users
    try {
      // Get the private event created by regular user
      const privateEventsQuery = await adminDb.collection('events')
        .where('userId', '==', regularUserId)
        .limit(1)
        .get();

      if (privateEventsQuery.empty) {
        throw new Error('Private event not found in database');
      }

      const privateEventId = privateEventsQuery.docs[0].id;

      // Try to access it as a different user (should fail)
      const otherSession = {
        userId: otherUserId,
        email: 'other@test.com',
        subscriptionLevel: 'pro'
      };

      let errorThrown = false;
      try {
        await EventService.getEvent({
          eventId: privateEventId,
          session: otherSession
        });
      } catch (error) {
        errorThrown = true;
        if (error.message.includes('Access denied')) {
          console.log('  ✅ Test 5: Private event blocked from other users');
          passed++;
          results.push({ test: 'Private event blocked from others', status: 'PASSED' });
        } else {
          throw error;
        }
      }

      if (!errorThrown) {
        throw new Error('Private event was accessible to other users (should be blocked)');
      }
    } catch (error) {
      console.log('  ❌ Test 5 Failed:', error.message);
      failed++;
      results.push({ test: 'Private event blocked from others', status: 'FAILED', error: error.message });
    }

    // Test 6: getUserEvents returns both user events and public events
    try {
      const otherSession = {
        userId: otherUserId,
        email: 'other@test.com',
        subscriptionLevel: 'pro'
      };

      // Create one event for this user
      await EventService.createEvent({
        eventData: {
          name: 'My Own Event',
          startDate: new Date('2025-12-04T10:00:00Z'),
          source: 'manual'
        },
        session: otherSession
      });

      // Now get all events (should include own event + public events)
      const eventsResult = await EventService.getUserEvents({
        session: otherSession,
        options: { limit: 100 }
      });

      const hasOwnEvent = eventsResult.events.some(e => e.userId === otherUserId);
      const hasPublicEvent = eventsResult.events.some(e => e.isPublic === true && e.userId !== otherUserId);

      if (hasOwnEvent && hasPublicEvent) {
        console.log('  ✅ Test 6: getUserEvents returns user events + public events');
        passed++;
        results.push({ test: 'getUserEvents returns combined results', status: 'PASSED' });
      } else {
        throw new Error(`getUserEvents missing events - own: ${hasOwnEvent}, public: ${hasPublicEvent}`);
      }
    } catch (error) {
      console.log('  ❌ Test 6 Failed:', error.message);
      failed++;
      results.push({ test: 'getUserEvents returns combined results', status: 'FAILED', error: error.message });
    }

    // Test 7: Default isPublic is false
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const defaultEvent = await EventService.createEvent({
        eventData: {
          name: 'Event Without isPublic',
          startDate: new Date('2025-12-05T10:00:00Z'),
          source: 'manual'
        },
        session: adminSession
      });

      if (defaultEvent.isPublic === false) {
        console.log('  ✅ Test 7: Default isPublic is false');
        passed++;
        results.push({ test: 'Default isPublic is false', status: 'PASSED' });
      } else {
        throw new Error('isPublic should default to false');
      }
    } catch (error) {
      console.log('  ❌ Test 7 Failed:', error.message);
      failed++;
      results.push({ test: 'Default isPublic is false', status: 'FAILED', error: error.message });
    }

    // Test 8: Admin verification works correctly
    try {
      const isAdmin = AdminService.isServerAdmin(adminEmail);
      const isNotAdmin = AdminService.isServerAdmin(regularEmail);

      if (isAdmin && !isNotAdmin) {
        console.log('  ✅ Test 8: Admin verification working correctly');
        passed++;
        results.push({ test: 'Admin verification', status: 'PASSED' });
      } else {
        throw new Error(`Admin check failed - admin: ${isAdmin}, regular: ${isNotAdmin}`);
      }
    } catch (error) {
      console.log('  ❌ Test 8 Failed:', error.message);
      failed++;
      results.push({ test: 'Admin verification', status: 'FAILED', error: error.message });
    }

  } catch (error) {
    console.error('  ❌ Test suite error:', error);
    failed++;
  } finally {
    // Cleanup
    await cleanup();
  }

  console.log(`\n📊 Public Events Tests: ${passed}/${passed + failed} passed`);

  return {
    passed,
    failed,
    success: failed === 0,
    results
  };
}

export default runPublicEventTests;
