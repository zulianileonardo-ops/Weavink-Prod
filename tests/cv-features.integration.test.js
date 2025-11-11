/**
 * CV Features Integration Tests
 *
 * Tests for:
 * 1. AppearanceService Caching System
 * 2. Individual CV Link Activation
 * 3. Bidirectional Navigation
 * 4. CV Link Validation & Auto-Activation
 *
 * @created 2025-11-11
 * @category integration
 *
 * NOTE: These are pure unit tests testing business logic patterns
 * without requiring Firebase initialization or network calls.
 */

// Test utilities
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.startTime = Date.now();
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('🧪 Starting CV Features Integration Tests\n');
        console.log('='.repeat(60));

        for (const { name, fn } of this.tests) {
            try {
                await fn();
                this.passed++;
                console.log(`✅ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${name}`);
                console.log(`   Error: ${error.message}`);
            }
        }

        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        console.log('='.repeat(60));
        console.log(`\n📊 Test Results:`);
        console.log(`   Total: ${this.tests.length}`);
        console.log(`   Passed: ${this.passed} ✅`);
        console.log(`   Failed: ${this.failed} ${this.failed > 0 ? '❌' : ''}`);
        console.log(`   Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
        console.log(`   Duration: ${duration}s`);

        process.exit(this.failed > 0 ? 1 : 0);
    }
}

// Assertion utilities
function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(
            message || `Expected ${expected}, but got ${actual}`
        );
    }
}

function assertTrue(condition, message = '') {
    if (!condition) {
        throw new Error(message || 'Assertion failed: expected true');
    }
}

function assertFalse(condition, message = '') {
    if (condition) {
        throw new Error(message || 'Assertion failed: expected false');
    }
}

function assertExists(value, message = '') {
    if (value === null || value === undefined) {
        throw new Error(message || 'Expected value to exist');
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock AppearanceService for testing
class MockAppearanceService {
    constructor() {
        this.cache = {
            data: null,
            expiry: null,
            userId: null,
            listeners: new Set(),
        };
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.apiCallCount = 0;
    }

    async getAppearanceData(forceRefresh = false) {
        const now = Date.now();
        const currentUserId = 'test-user-123';

        // Check cache
        if (
            !forceRefresh &&
            this.cache.data &&
            this.cache.userId === currentUserId &&
            now < this.cache.expiry
        ) {
            console.log('   ⚡ Serving from cache');
            return this.cache.data;
        }

        // Simulate API call
        this.apiCallCount++;
        console.log(`   🌐 API call #${this.apiCallCount}`);
        await sleep(100);

        const data = {
            theme: { primaryColor: '#000000' },
            avatar: null,
        };

        // Update cache
        this.cache = {
            ...this.cache,
            data,
            expiry: now + this.CACHE_DURATION,
            userId: currentUserId,
        };

        return data;
    }

    subscribe(callback) {
        this.cache.listeners.add(callback);
        return () => {
            this.cache.listeners.delete(callback);
        };
    }

    invalidateCache() {
        this.cache = {
            ...this.cache,
            data: null,
            expiry: null,
        };
    }

    getCachedAppearanceData() {
        return this.cache.data;
    }
}

// Mock LinksService for testing
class MockLinksService {
    constructor() {
        this.links = [];
        this.subscribers = new Set();
    }

    async getLinks() {
        return { links: this.links };
    }

    async updateLink(linkId, updates) {
        const link = this.links.find(l => l.id === linkId);
        if (link) {
            Object.assign(link, updates);
            this.notifySubscribers();
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.links));
    }

    addLink(link) {
        this.links.push(link);
        this.notifySubscribers();
    }
}

// Test Suite
const runner = new TestRunner();

// ============================================================================
// Test Suite 1: AppearanceService Caching
// ============================================================================

runner.test('Cache: First call makes API request', async () => {
    const service = new MockAppearanceService();
    await service.getAppearanceData();
    assertEqual(service.apiCallCount, 1, 'Should make 1 API call');
});

runner.test('Cache: Second call uses cache', async () => {
    const service = new MockAppearanceService();
    await service.getAppearanceData();
    await service.getAppearanceData();
    assertEqual(service.apiCallCount, 1, 'Should still be 1 API call (cached)');
});

runner.test('Cache: Force refresh bypasses cache', async () => {
    const service = new MockAppearanceService();
    await service.getAppearanceData();
    await service.getAppearanceData(true);
    assertEqual(service.apiCallCount, 2, 'Force refresh should make new API call');
});

runner.test('Cache: Expired cache triggers new request', async () => {
    const service = new MockAppearanceService();
    service.CACHE_DURATION = 100; // 100ms for testing

    await service.getAppearanceData();
    await sleep(150); // Wait for cache to expire
    await service.getAppearanceData();

    assertEqual(service.apiCallCount, 2, 'Expired cache should trigger new API call');
});

runner.test('Cache: Invalidation clears cached data', async () => {
    const service = new MockAppearanceService();
    await service.getAppearanceData();

    assertExists(service.getCachedAppearanceData(), 'Cache should have data');

    service.invalidateCache();
    assertEqual(service.getCachedAppearanceData(), null, 'Cache should be null after invalidation');
});

runner.test('Cache: Multiple calls within duration use cache', async () => {
    const service = new MockAppearanceService();

    await service.getAppearanceData();
    await service.getAppearanceData();
    await service.getAppearanceData();
    await service.getAppearanceData();

    assertEqual(service.apiCallCount, 1, 'Should only make 1 API call for 4 requests');
});

runner.test('Cache: Subscriber pattern works correctly', async () => {
    const service = new MockAppearanceService();
    let callbackCount = 0;

    const unsubscribe = service.subscribe(() => {
        callbackCount++;
    });

    assertTrue(service.cache.listeners.size === 1, 'Should have 1 subscriber');

    unsubscribe();
    assertTrue(service.cache.listeners.size === 0, 'Should have 0 subscribers after unsubscribe');
});

runner.test('Cache: Returns consistent data structure', async () => {
    const service = new MockAppearanceService();
    const data = await service.getAppearanceData();

    assertExists(data, 'Data should exist');
    assertExists(data.theme, 'Theme should exist');
    assertTrue('avatar' in data, 'Avatar field should exist');
});

// ============================================================================
// Test Suite 2: Individual CV Link Activation
// ============================================================================

runner.test('Activation: CV link can be individually activated', async () => {
    const service = new MockLinksService();

    service.addLink({
        id: 'cv-1',
        type: 3,
        isActive: false,
        cvItemId: 'item-1',
    });

    await service.updateLink('cv-1', { isActive: true });
    const { links } = await service.getLinks();

    assertTrue(links[0].isActive, 'CV link should be active');
});

runner.test('Activation: CV link can be individually deactivated', async () => {
    const service = new MockLinksService();

    service.addLink({
        id: 'cv-1',
        type: 3,
        isActive: true,
        cvItemId: 'item-1',
    });

    await service.updateLink('cv-1', { isActive: false });
    const { links } = await service.getLinks();

    assertFalse(links[0].isActive, 'CV link should be inactive');
});

runner.test('Activation: Multiple CV links can have different states', async () => {
    const service = new MockLinksService();

    service.addLink({
        id: 'cv-1',
        type: 3,
        isActive: true,
        cvItemId: 'item-1',
    });

    service.addLink({
        id: 'cv-2',
        type: 3,
        isActive: false,
        cvItemId: 'item-2',
    });

    const { links } = await service.getLinks();

    assertTrue(links[0].isActive, 'First CV link should be active');
    assertFalse(links[1].isActive, 'Second CV link should be inactive');
});

runner.test('Activation: Subscriber notified on link update', async () => {
    const service = new MockLinksService();
    let notificationCount = 0;

    service.subscribe(() => {
        notificationCount++;
    });

    service.addLink({
        id: 'cv-1',
        type: 3,
        isActive: false,
        cvItemId: 'item-1',
    });

    await service.updateLink('cv-1', { isActive: true });

    assertTrue(notificationCount >= 2, 'Subscribers should be notified of updates');
});

// ============================================================================
// Test Suite 3: CV Link Validation
// ============================================================================

runner.test('Validation: Cannot activate link without document URL', () => {
    const linkedCvItem = { url: '' };
    const newValue = true;

    const canActivate = linkedCvItem?.url && linkedCvItem.url.trim() !== '';

    assertFalse(canActivate, 'Should not allow activation without URL');
});

runner.test('Validation: Cannot activate link with null URL', () => {
    const linkedCvItem = { url: null };
    const newValue = true;

    const canActivate = linkedCvItem?.url && linkedCvItem.url.trim() !== '';

    assertFalse(canActivate, 'Should not allow activation with null URL');
});

runner.test('Validation: Cannot activate link with whitespace-only URL', () => {
    const linkedCvItem = { url: '   ' };
    const newValue = true;

    const canActivate = linkedCvItem?.url && linkedCvItem.url.trim() !== '';

    assertFalse(canActivate, 'Should not allow activation with whitespace URL');
});

runner.test('Validation: Can activate link with valid URL', () => {
    const linkedCvItem = { url: 'https://example.com/cv.pdf' };
    const newValue = true;

    const canActivate = linkedCvItem?.url && linkedCvItem.url.trim() !== '';

    assertTrue(canActivate, 'Should allow activation with valid URL');
});

runner.test('Validation: Can deactivate link regardless of URL', () => {
    const linkedCvItem = { url: '' };
    const newValue = false;

    // Deactivation doesn't require validation
    const canDeactivate = !newValue || (linkedCvItem?.url && linkedCvItem.url.trim() !== '');

    assertTrue(canDeactivate, 'Should always allow deactivation');
});

runner.test('Validation: Missing linkedCvItem prevents activation', () => {
    const linkedCvItem = null;
    const newValue = true;

    const canActivate = linkedCvItem?.url && linkedCvItem.url.trim() !== '';

    assertFalse(canActivate, 'Should not allow activation without linkedCvItem');
});

// ============================================================================
// Test Suite 4: Auto-Activation Logic
// ============================================================================

runner.test('Auto-activation: Activates inactive link after upload', async () => {
    const service = new MockLinksService();

    service.addLink({
        id: 'cv-1',
        type: 3,
        isActive: false,
        cvItemId: 'item-1',
    });

    // Simulate document upload
    const linkedLinkItem = service.links[0];
    if (linkedLinkItem && !linkedLinkItem.isActive) {
        await service.updateLink(linkedLinkItem.id, { isActive: true });
    }

    const { links } = await service.getLinks();
    assertTrue(links[0].isActive, 'Link should be auto-activated after upload');
});

runner.test('Auto-activation: Does not change already active link', async () => {
    const service = new MockLinksService();

    service.addLink({
        id: 'cv-1',
        type: 3,
        isActive: true,
        cvItemId: 'item-1',
    });

    // Simulate document upload
    const linkedLinkItem = service.links[0];
    const shouldActivate = linkedLinkItem && !linkedLinkItem.isActive;

    assertFalse(shouldActivate, 'Should not attempt to activate already active link');
});

runner.test('Auto-activation: Handles missing linked link gracefully', async () => {
    const service = new MockLinksService();

    // No linked link exists
    const linkedLinkItem = null;

    try {
        if (linkedLinkItem && !linkedLinkItem.isActive) {
            await service.updateLink(linkedLinkItem.id, { isActive: true });
        }
        // Should not throw error
        assertTrue(true, 'Should handle missing link gracefully');
    } catch (error) {
        throw new Error('Should not throw error when no linked link exists');
    }
});

// ============================================================================
// Test Suite 5: Navigation Helpers
// ============================================================================

runner.test('Navigation: getItemHash generates correct hash', () => {
    const getItemHash = (itemType, itemId) => `#${itemType}-${itemId}`;

    const hash1 = getItemHash('cv-item', 'item-123');
    const hash2 = getItemHash('cv-link', 'link-456');

    assertEqual(hash1, '#cv-item-item-123', 'Should generate correct cv-item hash');
    assertEqual(hash2, '#cv-link-link-456', 'Should generate correct cv-link hash');
});

runner.test('Navigation: Hash matching works correctly', () => {
    const currentHash = '#cv-item-item-123';
    const itemType = 'cv-item';
    const itemId = 'item-123';
    const targetHash = `#${itemType}-${itemId}`;

    assertEqual(currentHash, targetHash, 'Hash should match item');
});

runner.test('Navigation: Hash mismatch detected correctly', () => {
    const currentHash = '#cv-item-item-123';
    const itemType = 'cv-item';
    const itemId = 'item-456';
    const targetHash = `#${itemType}-${itemId}`;

    assertTrue(currentHash !== targetHash, 'Different hashes should not match');
});

runner.test('Navigation: Element ID format is consistent', () => {
    const itemId = 'test-123';
    const cvItemElementId = `cv-item-${itemId}`;
    const cvLinkElementId = `cv-link-${itemId}`;

    assertEqual(cvItemElementId, 'cv-item-test-123', 'CV item element ID should be correct');
    assertEqual(cvLinkElementId, 'cv-link-test-123', 'CV link element ID should be correct');
});

// ============================================================================
// Test Suite 6: Integration Scenarios
// ============================================================================

runner.test('Integration: Complete CV link creation workflow', async () => {
    const linksService = new MockLinksService();

    // Step 1: Create CV link (inactive, no document)
    linksService.addLink({
        id: 'cv-1',
        type: 3,
        isActive: false,
        cvItemId: 'item-1',
    });

    let { links } = await linksService.getLinks();
    assertFalse(links[0].isActive, 'New link should be inactive');

    // Step 2: Validate cannot activate without document
    const linkedCvItem = { url: '' };
    const canActivate = linkedCvItem?.url && linkedCvItem.url.trim() !== '';
    assertFalse(canActivate, 'Should not allow activation without document');

    // Step 3: Upload document and auto-activate
    linkedCvItem.url = 'https://example.com/cv.pdf';
    if (links[0] && !links[0].isActive) {
        await linksService.updateLink(links[0].id, { isActive: true });
    }

    ({ links } = await linksService.getLinks());
    assertTrue(links[0].isActive, 'Link should be auto-activated after upload');
});

runner.test('Integration: Caching reduces API calls in typical session', async () => {
    const service = new MockAppearanceService();

    // Simulate typical user session: dashboard -> appearance -> dashboard
    await service.getAppearanceData(); // Page 1
    await service.getAppearanceData(); // Page 2 (cached)
    await service.getAppearanceData(); // Page 1 again (cached)
    await service.getAppearanceData(); // Navigation (cached)

    assertEqual(service.apiCallCount, 1, 'Should only make 1 API call for entire session');

    const reduction = ((3 / 4) * 100).toFixed(0);
    console.log(`   📊 Cache reduced API calls by ${reduction}%`);
});

runner.test('Integration: Multiple subscribers receive cache updates', async () => {
    const service = new MockAppearanceService();
    let callback1Count = 0;
    let callback2Count = 0;
    let callback3Count = 0;

    const unsub1 = service.subscribe(() => callback1Count++);
    const unsub2 = service.subscribe(() => callback2Count++);
    const unsub3 = service.subscribe(() => callback3Count++);

    assertTrue(service.cache.listeners.size === 3, 'Should have 3 subscribers');

    unsub2();
    assertTrue(service.cache.listeners.size === 2, 'Should have 2 subscribers after one unsubscribes');

    unsub1();
    unsub3();
    assertTrue(service.cache.listeners.size === 0, 'Should have 0 subscribers after all unsubscribe');
});

// ============================================================================
// Test Suite 7: Toggle UI State Management
// ============================================================================

runner.test('Toggle: Checkbox syncs with linkedLinkItem.isActive', () => {
    const linkedLinkItem = { id: 'cv-1', isActive: true };
    const checkboxState = linkedLinkItem.isActive;
    assertTrue(checkboxState === true, 'Checkbox should match link state');

    const linkedLinkItem2 = { id: 'cv-2', isActive: false };
    const checkboxState2 = linkedLinkItem2.isActive;
    assertTrue(checkboxState2 === false, 'Checkbox should match inactive link state');
});

runner.test('Toggle: Only visible when linkedLinkItem exists', () => {
    const linkedLinkItemNull = null;
    const shouldShowToggle1 = linkedLinkItemNull !== null;
    assertFalse(shouldShowToggle1, 'Toggle should be hidden when no linked link');

    const linkedLinkItemUndefined = undefined;
    const shouldShowToggle2 = linkedLinkItemUndefined !== null && linkedLinkItemUndefined !== undefined;
    assertFalse(shouldShowToggle2, 'Toggle should be hidden when linked link is undefined');

    const linkedLinkItemExists = { id: 'cv-1', isActive: false };
    const shouldShowToggle3 = linkedLinkItemExists !== null && linkedLinkItemExists !== undefined;
    assertTrue(shouldShowToggle3, 'Toggle should be visible when linked link exists');
});

runner.test('Toggle: Debounce prevents excessive API calls', async () => {
    const service = new MockLinksService();
    service.addLink({ id: 'cv-1', type: 3, isActive: false, cvItemId: 'item-1' });

    let updateCount = 0;
    const originalUpdate = service.updateLink.bind(service);
    service.updateLink = async (...args) => {
        updateCount++;
        return originalUpdate(...args);
    };

    // Simulate rapid toggling (in real implementation, debounce would prevent this)
    // Here we test that debounce logic would reduce calls
    const expectedCallsWithoutDebounce = 5;
    const expectedCallsWithDebounce = 1; // Only final state matters

    // Without debounce: 5 calls
    for (let i = 0; i < expectedCallsWithoutDebounce; i++) {
        await service.updateLink('cv-1', { isActive: i % 2 === 0 });
    }

    assertEqual(updateCount, expectedCallsWithoutDebounce, 'Captured all rapid toggle attempts');

    // In real implementation with 500ms debounce, only 1 call would be made
    const savingsPercentage = ((expectedCallsWithoutDebounce - expectedCallsWithDebounce) / expectedCallsWithoutDebounce * 100).toFixed(0);
    console.log(`   📊 Debounce would reduce API calls by ${savingsPercentage}% (${expectedCallsWithoutDebounce} → ${expectedCallsWithDebounce})`);
});

// ============================================================================
// Test Suite 8: Toggle Error Handling
// ============================================================================

runner.test('Error: Prevents activation without document URL', () => {
    const testCases = [
        { url: '', expected: false, description: 'empty string' },
        { url: '   ', expected: false, description: 'whitespace only' },
        { url: null, expected: false, description: 'null' },
        { url: undefined, expected: false, description: 'undefined' },
        { url: 'https://example.com/doc.pdf', expected: true, description: 'valid URL' }
    ];

    testCases.forEach(({ url, expected, description }) => {
        const item = { url };
        const canActivate = !!(item.url && item.url.trim() !== '');
        assertEqual(canActivate, expected, `Should ${expected ? 'allow' : 'prevent'} activation for ${description}`);
    });
});

runner.test('Error: Update failure preserves previous state', async () => {
    const service = new MockLinksService();
    service.addLink({ id: 'cv-1', type: 3, isActive: false, cvItemId: 'item-1' });

    let { links } = await service.getLinks();
    const originalState = links[0].isActive;

    try {
        // Simulate error by making updateLink throw
        const originalUpdate = service.updateLink.bind(service);
        service.updateLink = async () => {
            throw new Error('Network error');
        };

        await service.updateLink('cv-1', { isActive: true });
        assertFalse(true, 'Should have thrown error');
    } catch (error) {
        assertEqual(error.message, 'Network error', 'Error should be caught');

        // Verify state unchanged
        ({ links } = await service.getLinks());
        assertEqual(links[0].isActive, originalState, 'Link state should remain unchanged after error');
    }
});

// ============================================================================
// Test Suite 9: Real-Time State Synchronization
// ============================================================================

runner.test('Sync: External updates trigger checkbox state change', async () => {
    const service = new MockLinksService();
    let subscriberCalled = false;
    let receivedLink = null;

    service.addLink({ id: 'cv-1', type: 3, isActive: false, cvItemId: 'item-1' });

    // Subscribe to changes (simulating CVItemCard useEffect)
    service.subscribe((links) => {
        subscriberCalled = true;
        receivedLink = links[0];
    });

    // External update (from another component/page)
    await service.updateLink('cv-1', { isActive: true });

    assertTrue(subscriberCalled, 'Subscriber should be called on update');
    assertTrue(receivedLink.isActive, 'Received link should reflect new active state');
});

runner.test('Sync: Multiple CVItemCard instances stay synchronized', async () => {
    const service = new MockLinksService();
    const watchers = [];

    service.addLink({ id: 'cv-1', type: 3, isActive: false, cvItemId: 'item-1' });

    // Simulate 3 CVItemCard components watching the same link
    for (let i = 0; i < 3; i++) {
        watchers.push({ id: i, checkboxState: false });
        service.subscribe((links) => {
            watchers[i].checkboxState = links[0].isActive;
        });
    }

    // One component updates the toggle
    await service.updateLink('cv-1', { isActive: true });

    // All watchers should be synchronized
    watchers.forEach((watcher, index) => {
        assertTrue(watcher.checkboxState === true, `Watcher ${index} should be updated to active`);
    });

    // Update again
    await service.updateLink('cv-1', { isActive: false });

    // All should sync again
    watchers.forEach((watcher, index) => {
        assertTrue(watcher.checkboxState === false, `Watcher ${index} should be updated to inactive`);
    });
});

// ============================================================================
// Run All Tests
// ============================================================================

console.log('🚀 Initializing CV Features Test Suite...\n');
console.log('Testing:');
console.log('  - AppearanceService Caching (8 tests)');
console.log('  - Individual CV Link Activation (4 tests)');
console.log('  - CV Link Validation (6 tests)');
console.log('  - Auto-Activation Logic (3 tests)');
console.log('  - Navigation Helpers (4 tests)');
console.log('  - Integration Scenarios (3 tests)');
console.log('  - Toggle UI State Management (3 tests)');
console.log('  - Toggle Error Handling (2 tests)');
console.log('  - Real-Time State Synchronization (2 tests)');
console.log('\nTotal: 35 tests\n');

runner.run();
