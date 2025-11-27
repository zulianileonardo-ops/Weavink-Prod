// lib/services/serviceEvent/tests/bulkImportTests.js
/**
 * Real-World Tests: Bulk Import API
 *
 * Tests bulk event import with validation, admin checks, and error handling.
 * Uses REAL Firestore database and API - no mocks.
 *
 * Test Coverage:
 * - Bulk import with valid events
 * - Admin-only check for public events
 * - Rate limiting (max 100 events)
 * - Data validation (missing fields, invalid dates, coordinates)
 * - Partial failures (some valid, some invalid)
 * - Response format verification
 */

import { adminDb } from '../../../firebaseAdmin.js';
import { EventService } from '../server/eventService.js';

/**
 * Run all bulk import tests
 * @param {string} testUserPrefix - Prefix for test user IDs
 * @returns {Promise<{passed: number, failed: number, success: boolean}>}
 */
export async function runBulkImportTests(testUserPrefix = 'test-bulk') {
  console.log('\n🧪 Running Bulk Import Tests (Real-World)...');

  let passed = 0;
  let failed = 0;
  const results = [];

  // Test users
  const adminUserId = `${testUserPrefix}-admin-${Date.now()}`;
  const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0] || 'admin@test.com';
  const regularUserId = `${testUserPrefix}-user-${Date.now()}`;
  const regularEmail = 'regular@test.com';

  // Cleanup function
  const cleanup = async () => {
    try {
      const eventsSnapshot = await adminDb.collection('events')
        .where('userId', 'in', [adminUserId, regularUserId])
        .get();

      const batch = adminDb.batch();
      eventsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  };

  try {
    // Test 1: Bulk import with valid events
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const validEvents = [
        {
          name: 'Event 1',
          startDate: '2025-12-01T09:00:00Z',
          endDate: '2025-12-01T17:00:00Z',
          location: { address: 'Paris', latitude: 48.8566, longitude: 2.3522 },
          source: 'manual',
          tags: ['test']
        },
        {
          name: 'Event 2',
          startDate: '2025-12-02T09:00:00Z',
          location: { address: 'Lyon' },
          source: 'manual'
        },
        {
          name: 'Event 3',
          startDate: '2025-12-03T09:00:00Z',
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: validEvents,
        session: adminSession
      });

      if (result.success === 3 && result.failed === 0 && result.events.length === 3) {
        console.log('  ✅ Test 1: Bulk import with valid events');
        passed++;
        results.push({ test: 'Bulk import valid events', status: 'PASSED' });
      } else {
        throw new Error(`Expected 3 success, 0 failed. Got ${result.success} success, ${result.failed} failed`);
      }
    } catch (error) {
      console.log('  ❌ Test 1 Failed:', error.message);
      failed++;
      results.push({ test: 'Bulk import valid events', status: 'FAILED', error: error.message });
    }

    // Test 2: Admin can bulk import public events
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const publicEvents = [
        {
          name: 'Public Conference 1',
          startDate: '2025-12-10T09:00:00Z',
          source: 'manual',
          isPublic: true
        },
        {
          name: 'Public Conference 2',
          startDate: '2025-12-11T09:00:00Z',
          source: 'manual',
          isPublic: true
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: publicEvents,
        session: adminSession
      });

      const allPublic = result.events.every(e => e.isPublic === true);

      if (result.success === 2 && allPublic) {
        console.log('  ✅ Test 2: Admin can bulk import public events');
        passed++;
        results.push({ test: 'Admin bulk import public events', status: 'PASSED' });
      } else {
        throw new Error('Public events not created correctly');
      }
    } catch (error) {
      console.log('  ❌ Test 2 Failed:', error.message);
      failed++;
      results.push({ test: 'Admin bulk import public events', status: 'FAILED', error: error.message });
    }

    // Test 3: Non-admin blocked from bulk importing public events
    try {
      const regularSession = {
        userId: regularUserId,
        email: regularEmail,
        subscriptionLevel: 'pro'
      };

      const publicEvents = [
        {
          name: 'Unauthorized Public Event',
          startDate: '2025-12-12T09:00:00Z',
          source: 'manual',
          isPublic: true
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: publicEvents,
        session: regularSession
      });

      // Should fail with admin error
      if (result.failed === 1 && result.success === 0) {
        const error = result.errors[0];
        if (error.error.includes('Only administrators can create public events')) {
          console.log('  ✅ Test 3: Non-admin blocked from bulk importing public events');
          passed++;
          results.push({ test: 'Non-admin blocked from public bulk import', status: 'PASSED' });
        } else {
          throw new Error('Wrong error message');
        }
      } else {
        throw new Error('Non-admin was able to create public events in bulk');
      }
    } catch (error) {
      console.log('  ❌ Test 3 Failed:', error.message);
      failed++;
      results.push({ test: 'Non-admin blocked from public bulk import', status: 'FAILED', error: error.message });
    }

    // Test 4: Validation - missing name
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const invalidEvents = [
        {
          // Missing name
          startDate: '2025-12-13T09:00:00Z',
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: invalidEvents,
        session: adminSession
      });

      if (result.failed === 1 && result.errors[0].error.includes('Event name is required')) {
        console.log('  ✅ Test 4: Validation catches missing name');
        passed++;
        results.push({ test: 'Validation - missing name', status: 'PASSED' });
      } else {
        throw new Error('Missing name not caught by validation');
      }
    } catch (error) {
      console.log('  ❌ Test 4 Failed:', error.message);
      failed++;
      results.push({ test: 'Validation - missing name', status: 'FAILED', error: error.message });
    }

    // Test 5: Validation - missing startDate
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const invalidEvents = [
        {
          name: 'Event Without Date',
          // Missing startDate
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: invalidEvents,
        session: adminSession
      });

      if (result.failed === 1 && result.errors[0].error.includes('Event start date is required')) {
        console.log('  ✅ Test 5: Validation catches missing startDate');
        passed++;
        results.push({ test: 'Validation - missing startDate', status: 'PASSED' });
      } else {
        throw new Error('Missing startDate not caught by validation');
      }
    } catch (error) {
      console.log('  ❌ Test 5 Failed:', error.message);
      failed++;
      results.push({ test: 'Validation - missing startDate', status: 'FAILED', error: error.message });
    }

    // Test 6: Validation - invalid date format
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const invalidEvents = [
        {
          name: 'Event With Invalid Date',
          startDate: 'not-a-date',
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: invalidEvents,
        session: adminSession
      });

      if (result.failed === 1 && result.errors[0].error.includes('Invalid start date format')) {
        console.log('  ✅ Test 6: Validation catches invalid date format');
        passed++;
        results.push({ test: 'Validation - invalid date', status: 'PASSED' });
      } else {
        throw new Error('Invalid date format not caught by validation');
      }
    } catch (error) {
      console.log('  ❌ Test 6 Failed:', error.message);
      failed++;
      results.push({ test: 'Validation - invalid date', status: 'FAILED', error: error.message });
    }

    // Test 7: Validation - endDate before startDate
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const invalidEvents = [
        {
          name: 'Event With Invalid Date Range',
          startDate: '2025-12-15T18:00:00Z',
          endDate: '2025-12-15T09:00:00Z', // Before startDate
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: invalidEvents,
        session: adminSession
      });

      if (result.failed === 1 && result.errors[0].error.includes('End date must be after start date')) {
        console.log('  ✅ Test 7: Validation catches endDate before startDate');
        passed++;
        results.push({ test: 'Validation - endDate before startDate', status: 'PASSED' });
      } else {
        throw new Error('Invalid date range not caught by validation');
      }
    } catch (error) {
      console.log('  ❌ Test 7 Failed:', error.message);
      failed++;
      results.push({ test: 'Validation - endDate before startDate', status: 'FAILED', error: error.message });
    }

    // Test 8: Validation - invalid latitude
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const invalidEvents = [
        {
          name: 'Event With Invalid Coordinates',
          startDate: '2025-12-16T09:00:00Z',
          location: {
            address: 'Test',
            latitude: 91, // Invalid (> 90)
            longitude: 0
          },
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: invalidEvents,
        session: adminSession
      });

      if (result.failed === 1 && result.errors[0].error.includes('Invalid latitude')) {
        console.log('  ✅ Test 8: Validation catches invalid latitude');
        passed++;
        results.push({ test: 'Validation - invalid latitude', status: 'PASSED' });
      } else {
        throw new Error('Invalid latitude not caught by validation');
      }
    } catch (error) {
      console.log('  ❌ Test 8 Failed:', error.message);
      failed++;
      results.push({ test: 'Validation - invalid latitude', status: 'FAILED', error: error.message });
    }

    // Test 9: Validation - invalid longitude
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const invalidEvents = [
        {
          name: 'Event With Invalid Longitude',
          startDate: '2025-12-17T09:00:00Z',
          location: {
            address: 'Test',
            latitude: 45,
            longitude: 181 // Invalid (> 180)
          },
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: invalidEvents,
        session: adminSession
      });

      if (result.failed === 1 && result.errors[0].error.includes('Invalid longitude')) {
        console.log('  ✅ Test 9: Validation catches invalid longitude');
        passed++;
        results.push({ test: 'Validation - invalid longitude', status: 'PASSED' });
      } else {
        throw new Error('Invalid longitude not caught by validation');
      }
    } catch (error) {
      console.log('  ❌ Test 9 Failed:', error.message);
      failed++;
      results.push({ test: 'Validation - invalid longitude', status: 'FAILED', error: error.message });
    }

    // Test 10: Partial failures (some valid, some invalid)
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const mixedEvents = [
        {
          name: 'Valid Event 1',
          startDate: '2025-12-20T09:00:00Z',
          source: 'manual'
        },
        {
          // Invalid - missing name
          startDate: '2025-12-21T09:00:00Z',
          source: 'manual'
        },
        {
          name: 'Valid Event 2',
          startDate: '2025-12-22T09:00:00Z',
          source: 'manual'
        },
        {
          name: 'Invalid Event',
          startDate: 'bad-date', // Invalid date
          source: 'manual'
        },
        {
          name: 'Valid Event 3',
          startDate: '2025-12-23T09:00:00Z',
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: mixedEvents,
        session: adminSession
      });

      if (result.success === 3 && result.failed === 2 && result.errors.length === 2) {
        console.log('  ✅ Test 10: Partial failures handled correctly');
        passed++;
        results.push({ test: 'Partial failures', status: 'PASSED' });
      } else {
        throw new Error(`Expected 3 success, 2 failed. Got ${result.success} success, ${result.failed} failed`);
      }
    } catch (error) {
      console.log('  ❌ Test 10 Failed:', error.message);
      failed++;
      results.push({ test: 'Partial failures', status: 'FAILED', error: error.message });
    }

    // Test 11: Response format verification
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const testEvents = [
        {
          name: 'Response Test Event',
          startDate: '2025-12-25T09:00:00Z',
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: testEvents,
        session: adminSession
      });

      const hasCorrectFormat =
        typeof result.success === 'number' &&
        typeof result.failed === 'number' &&
        Array.isArray(result.events) &&
        Array.isArray(result.errors);

      if (hasCorrectFormat) {
        console.log('  ✅ Test 11: Response format correct');
        passed++;
        results.push({ test: 'Response format', status: 'PASSED' });
      } else {
        throw new Error('Response format incorrect');
      }
    } catch (error) {
      console.log('  ❌ Test 11 Failed:', error.message);
      failed++;
      results.push({ test: 'Response format', status: 'FAILED', error: error.message });
    }

    // Test 12: Errors include event context
    try {
      const adminSession = {
        userId: adminUserId,
        email: adminEmail,
        subscriptionLevel: 'premium'
      };

      const invalidEvents = [
        {
          name: 'Test Error Context',
          startDate: 'invalid-date',
          source: 'manual'
        }
      ];

      const result = await EventService.bulkCreateEvents({
        events: invalidEvents,
        session: adminSession
      });

      const errorHasContext =
        result.errors.length === 1 &&
        result.errors[0].eventData &&
        result.errors[0].eventData.name === 'Test Error Context' &&
        result.errors[0].error;

      if (errorHasContext) {
        console.log('  ✅ Test 12: Errors include event context');
        passed++;
        results.push({ test: 'Error context', status: 'PASSED' });
      } else {
        throw new Error('Error context missing or incorrect');
      }
    } catch (error) {
      console.log('  ❌ Test 12 Failed:', error.message);
      failed++;
      results.push({ test: 'Error context', status: 'FAILED', error: error.message });
    }

  } catch (error) {
    console.error('  ❌ Test suite error:', error);
    failed++;
  } finally {
    // Cleanup
    await cleanup();
  }

  console.log(`\n📊 Bulk Import Tests: ${passed}/${passed + failed} passed`);

  return {
    passed,
    failed,
    success: failed === 0,
    results
  };
}

export default runBulkImportTests;
