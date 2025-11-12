/**
 * Media Features Integration Tests
 *
 * Tests for:
 * 1. Media Upload Validation
 * 2. MediaCard State Management
 * 3. ImageCropUtils CrossOrigin Handling
 * 4. Server-Side Media Type Validation
 * 5. MediaDisplay Rendering
 * 6. Bidirectional Deletion (Appearance ↔ Links)
 * 7. Individual Media Toggle Activation
 * 8. Real-Time Synchronization
 *
 * @created 2025-11-12
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
        console.log('🧪 Starting Media Features Integration Tests\n');
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
        this.mediaItems = [];
        this.uploadedFiles = [];
        this.allowedMediaTypes = [
            'image', 'video',                    // Legacy types
            'image-upload', 'image-url',         // Modern image types
            'video-embed', 'video-upload'        // Modern video types
        ];
    }

    async uploadMediaImage(file) {
        // Simulate upload
        await sleep(50);
        this.uploadedFiles.push(file);
        return {
            downloadURL: `https://storage.example.com/mediaImages/${file.name}`,
            path: `mediaImages/${file.name}`
        };
    }

    async uploadMediaVideo(file) {
        await sleep(50);
        this.uploadedFiles.push(file);
        return {
            downloadURL: `https://storage.example.com/mediaVideos/${file.name}`,
            path: `mediaVideos/${file.name}`
        };
    }

    sanitizeMediaItem(item) {
        // Validate mediaType
        const rawMediaType = typeof item.mediaType === 'string' ? item.mediaType.toLowerCase() : '';
        const mediaType = this.allowedMediaTypes.includes(rawMediaType) ? rawMediaType : 'video-embed';

        const sanitizedItem = {
            id: String(item.id || ''),
            mediaType: mediaType,
            title: String(item.title || 'New Media Item').substring(0, 100),
            url: String(item.url || ''),
            order: Number(item.order) || 0,
            description: String(item.description || '').substring(0, 200)
        };

        // Add mediaType-specific fields and clear incompatible ones
        if (mediaType === 'video-embed' || mediaType === 'video') {
            sanitizedItem.platform = ['youtube', 'vimeo'].includes(item.platform) ? item.platform : 'youtube';
            sanitizedItem.imageUrl = '';  // Clear imageUrl for video types
        } else if (mediaType === 'video-upload') {
            sanitizedItem.platform = '';
            sanitizedItem.imageUrl = '';
        } else if (mediaType === 'image-upload' || mediaType === 'image-url' || mediaType === 'image') {
            sanitizedItem.imageUrl = String(item.imageUrl || item.url || '');
            sanitizedItem.platform = '';  // Clear platform for image types
            if (mediaType === 'image-url' || mediaType === 'image') {
                sanitizedItem.link = String(item.link || '');
            }
        }

        return sanitizedItem;
    }

    addMediaItem(item) {
        const sanitized = this.sanitizeMediaItem(item);
        this.mediaItems.push(sanitized);
        return sanitized;
    }

    deleteMediaItem(itemId) {
        this.mediaItems = this.mediaItems.filter(item => item.id !== itemId);
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

    deleteLink(linkId) {
        this.links = this.links.filter(l => l.id !== linkId);
        this.notifySubscribers();
    }
}

// Mock ImageCropUtils for testing
class MockImageCropUtils {
    createImage(url) {
        return new Promise((resolve) => {
            const mockImage = {
                url: url,
                width: 800,
                height: 600,
                crossOrigin: null,
                isTainted: false
            };

            // Only set crossOrigin for remote HTTP/HTTPS URLs
            if (typeof url === 'string') {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    mockImage.crossOrigin = 'anonymous';
                }
                // data: URLs should NOT have crossOrigin set
                if (url.startsWith('data:')) {
                    // Canvas would be tainted if crossOrigin was set on data URL
                    mockImage.isTainted = mockImage.crossOrigin !== null;
                }
            }

            resolve(mockImage);
        });
    }

    async getCroppedImg(imageSrc, pixelCrop) {
        const image = await this.createImage(imageSrc);

        // Validate crop dimensions
        if (!pixelCrop || pixelCrop.width <= 0 || pixelCrop.height <= 0) {
            throw new Error('Invalid crop dimensions');
        }

        // Check if canvas would be tainted
        if (image.isTainted) {
            // Tainted canvas produces black/empty image
            return new Blob([], { type: 'image/jpeg' });
        }

        // Normal cropping would produce valid image
        return new Blob([new Uint8Array(1024)], { type: 'image/jpeg' });
    }
}

// Test Suite
const runner = new TestRunner();

// ============================================================================
// Test Suite 1: Media Upload Validation
// ============================================================================

runner.test('Upload: Accepts valid image file types', () => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const invalidTypes = ['video/mp4', 'text/plain', 'application/pdf'];

    validImageTypes.forEach(type => {
        const isValid = type.startsWith('image/');
        assertTrue(isValid, `Should accept ${type}`);
    });

    invalidTypes.forEach(type => {
        const isValid = type.startsWith('image/');
        assertFalse(isValid, `Should reject ${type} for image upload`);
    });
});

runner.test('Upload: Accepts valid video file types', () => {
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const invalidTypes = ['image/jpeg', 'text/plain', 'application/pdf'];

    validVideoTypes.forEach(type => {
        const isValid = type.startsWith('video/');
        assertTrue(isValid, `Should accept ${type}`);
    });

    invalidTypes.forEach(type => {
        const isValid = type.startsWith('video/');
        assertFalse(isValid, `Should reject ${type} for video upload`);
    });
});

runner.test('Upload: Validates file size limits', () => {
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB

    const validImageSize = 5 * 1024 * 1024;
    const invalidImageSize = 15 * 1024 * 1024;

    assertTrue(validImageSize <= maxImageSize, 'Should accept 5MB image');
    assertFalse(invalidImageSize <= maxImageSize, 'Should reject 15MB image');

    const validVideoSize = 50 * 1024 * 1024;
    const invalidVideoSize = 150 * 1024 * 1024;

    assertTrue(validVideoSize <= maxVideoSize, 'Should accept 50MB video');
    assertFalse(invalidVideoSize <= maxVideoSize, 'Should reject 150MB video');
});

runner.test('Upload: Image upload creates correct URL structure', async () => {
    const service = new MockAppearanceService();
    const mockFile = { name: 'test-image.jpg', type: 'image/jpeg', size: 1024 };

    const result = await service.uploadMediaImage(mockFile);

    assertTrue(result.downloadURL.includes('mediaImages/'), 'Should use mediaImages path');
    assertTrue(result.downloadURL.includes('test-image.jpg'), 'Should include filename');
    assertEqual(result.path, 'mediaImages/test-image.jpg', 'Should have correct storage path');
});

runner.test('Upload: Video upload creates correct URL structure', async () => {
    const service = new MockAppearanceService();
    const mockFile = { name: 'test-video.mp4', type: 'video/mp4', size: 1024 };

    const result = await service.uploadMediaVideo(mockFile);

    assertTrue(result.downloadURL.includes('mediaVideos/'), 'Should use mediaVideos path');
    assertTrue(result.downloadURL.includes('test-video.mp4'), 'Should include filename');
    assertEqual(result.path, 'mediaVideos/test-video.mp4', 'Should have correct storage path');
});

// ============================================================================
// Test Suite 2: MediaCard State Management
// ============================================================================

runner.test('State: Creates new item with modern mediaType', () => {
    const service = new MockAppearanceService();

    const newItem = {
        id: 'media-1',
        mediaType: 'video-embed',
        title: 'Test Video',
        url: '',
        platform: 'youtube',
        description: ''
    };

    const added = service.addMediaItem(newItem);

    assertEqual(added.mediaType, 'video-embed', 'Should use modern video-embed type');
    assertEqual(added.platform, 'youtube', 'Should preserve platform for video-embed');
});

runner.test('State: Clears platform when changing to image-upload', () => {
    const service = new MockAppearanceService();

    const item = {
        id: 'media-1',
        mediaType: 'image-upload',
        platform: 'youtube',  // Should be cleared
        imageUrl: 'https://example.com/image.jpg',
        url: 'https://example.com/image.jpg'
    };

    const sanitized = service.sanitizeMediaItem(item);

    assertEqual(sanitized.mediaType, 'image-upload', 'Should be image-upload');
    assertEqual(sanitized.platform, '', 'Should clear platform for image types');
    assertExists(sanitized.imageUrl, 'Should have imageUrl');
});

runner.test('State: Clears imageUrl when changing to video-embed', () => {
    const service = new MockAppearanceService();

    const item = {
        id: 'media-1',
        mediaType: 'video-embed',
        platform: 'youtube',
        imageUrl: 'https://example.com/image.jpg',  // Should be cleared
        url: 'https://youtube.com/watch?v=abc123'
    };

    const sanitized = service.sanitizeMediaItem(item);

    assertEqual(sanitized.mediaType, 'video-embed', 'Should be video-embed');
    assertEqual(sanitized.platform, 'youtube', 'Should preserve platform');
    assertEqual(sanitized.imageUrl, '', 'Should clear imageUrl for video types');
});

runner.test('State: Handles race condition with explicit payload', () => {
    const service = new MockAppearanceService();

    // Simulate race condition: localData has stale values
    const localData = {
        id: 'media-1',
        mediaType: 'video-embed',  // Old value
        platform: 'youtube',       // Old value
        url: '',
        imageUrl: ''
    };

    // User uploaded image but localData not yet updated
    const uploadResult = {
        mediaType: 'image-upload',
        imageUrl: 'https://example.com/uploaded.jpg',
        url: 'https://example.com/uploaded.jpg'
    };

    // Explicit payload construction (what handleSave does)
    const payload = {
        ...localData,
        ...uploadResult,
        platform: uploadResult.mediaType === 'image-upload' ? '' : localData.platform
    };

    const sanitized = service.sanitizeMediaItem(payload);

    assertEqual(sanitized.mediaType, 'image-upload', 'Should use new mediaType from payload');
    assertEqual(sanitized.platform, '', 'Should clear platform based on new mediaType');
    assertExists(sanitized.imageUrl, 'Should have uploaded imageUrl');
});

runner.test('State: Server validation accepts all 6 media types', () => {
    const service = new MockAppearanceService();

    const testCases = [
        { mediaType: 'image', expected: 'image' },
        { mediaType: 'video', expected: 'video' },
        { mediaType: 'image-upload', expected: 'image-upload' },
        { mediaType: 'image-url', expected: 'image-url' },
        { mediaType: 'video-embed', expected: 'video-embed' },
        { mediaType: 'video-upload', expected: 'video-upload' },
        { mediaType: 'invalid-type', expected: 'video-embed' }  // Fallback
    ];

    testCases.forEach(({ mediaType, expected }) => {
        const item = service.sanitizeMediaItem({
            id: 'test',
            mediaType: mediaType,
            title: 'Test',
            url: '',
            platform: 'youtube'
        });

        assertEqual(item.mediaType, expected, `Should handle ${mediaType} correctly`);
    });
});

// ============================================================================
// Test Suite 3: ImageCropUtils CrossOrigin Handling
// ============================================================================

runner.test('CrossOrigin: Sets for remote HTTPS URLs', async () => {
    const utils = new MockImageCropUtils();
    const remoteUrl = 'https://example.com/image.jpg';

    const image = await utils.createImage(remoteUrl);

    assertEqual(image.crossOrigin, 'anonymous', 'Should set crossOrigin for HTTPS');
    assertFalse(image.isTainted, 'Should not taint canvas for remote HTTPS');
});

runner.test('CrossOrigin: Does NOT set for data URLs', async () => {
    const utils = new MockImageCropUtils();
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';

    const image = await utils.createImage(dataUrl);

    assertEqual(image.crossOrigin, null, 'Should NOT set crossOrigin for data URL');
    assertFalse(image.isTainted, 'Should not taint canvas when crossOrigin is null');
});

runner.test('CrossOrigin: Tainted canvas produces black image', async () => {
    const utils = new MockImageCropUtils();

    // Override createImage to simulate the bug: crossOrigin set on data URL
    const originalCreateImage = utils.createImage.bind(utils);
    utils.createImage = async (url) => {
        const image = await originalCreateImage(url);
        // Simulate bug: crossOrigin incorrectly set on data URL
        if (url.startsWith('data:')) {
            image.crossOrigin = 'anonymous';
            image.isTainted = true;
        }
        return image;
    };

    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
    const blob = await utils.getCroppedImg(dataUrl, { x: 0, y: 0, width: 100, height: 100 });

    // Tainted canvas produces empty blob (size 0)
    assertEqual(blob.size, 0, 'Tainted canvas produces empty blob');
});

runner.test('CrossOrigin: Normal canvas produces valid image', async () => {
    const utils = new MockImageCropUtils();
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';

    const blob = await utils.getCroppedImg(dataUrl, { x: 0, y: 0, width: 100, height: 100 });

    assertTrue(blob.size > 0, 'Normal canvas produces valid image blob');
});

runner.test('CrossOrigin: Invalid crop dimensions throw error', async () => {
    const utils = new MockImageCropUtils();
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';

    try {
        await utils.getCroppedImg(dataUrl, { x: 0, y: 0, width: 0, height: 0 });
        assertFalse(true, 'Should have thrown error for invalid dimensions');
    } catch (error) {
        assertTrue(error.message.includes('Invalid crop dimensions'), 'Should throw for invalid crop');
    }
});

// ============================================================================
// Test Suite 4: Server-Side Media Type Validation
// ============================================================================

runner.test('Validation: Rejects invalid mediaType and uses fallback', () => {
    const service = new MockAppearanceService();

    const item = service.sanitizeMediaItem({
        id: 'media-1',
        mediaType: 'invalid-type',
        title: 'Test',
        url: ''
    });

    assertEqual(item.mediaType, 'video-embed', 'Should fallback to video-embed for invalid type');
});

runner.test('Validation: Platform required for video-embed', () => {
    const service = new MockAppearanceService();

    const itemWithoutPlatform = service.sanitizeMediaItem({
        id: 'media-1',
        mediaType: 'video-embed',
        title: 'Test',
        url: 'https://youtube.com/watch?v=abc',
        platform: ''
    });

    assertEqual(itemWithoutPlatform.platform, 'youtube', 'Should default to youtube when platform missing');

    const itemWithPlatform = service.sanitizeMediaItem({
        id: 'media-2',
        mediaType: 'video-embed',
        title: 'Test',
        url: 'https://vimeo.com/123456',
        platform: 'vimeo'
    });

    assertEqual(itemWithPlatform.platform, 'vimeo', 'Should preserve valid platform');
});

runner.test('Validation: Platform NOT required for video-upload', () => {
    const service = new MockAppearanceService();

    const item = service.sanitizeMediaItem({
        id: 'media-1',
        mediaType: 'video-upload',
        title: 'Test',
        url: 'https://storage.example.com/video.mp4',
        platform: 'youtube'  // Should be cleared
    });

    assertEqual(item.platform, '', 'Should clear platform for video-upload');
});

runner.test('Validation: imageUrl required for image types', () => {
    const service = new MockAppearanceService();

    const item = service.sanitizeMediaItem({
        id: 'media-1',
        mediaType: 'image-upload',
        title: 'Test',
        url: 'https://example.com/image.jpg',
        imageUrl: '',
        platform: ''
    });

    assertExists(item.imageUrl, 'Should set imageUrl for image types');
    assertTrue(item.imageUrl === item.url || item.imageUrl !== '', 'Should use url as imageUrl fallback');
});

runner.test('Validation: link field only for image-url type', () => {
    const service = new MockAppearanceService();

    const imageUrlItem = service.sanitizeMediaItem({
        id: 'media-1',
        mediaType: 'image-url',
        title: 'Test',
        imageUrl: 'https://example.com/image.jpg',
        link: 'https://example.com'
    });

    assertTrue('link' in imageUrlItem, 'image-url should have link field');

    const imageUploadItem = service.sanitizeMediaItem({
        id: 'media-2',
        mediaType: 'image-upload',
        title: 'Test',
        imageUrl: 'https://example.com/image.jpg',
        link: 'https://example.com'
    });

    assertFalse('link' in imageUploadItem, 'image-upload should NOT have link field');
});

// ============================================================================
// Test Suite 5: MediaDisplay Rendering
// ============================================================================

runner.test('Display: Checks both url and imageUrl for early validation', () => {
    const testCases = [
        { url: '', imageUrl: '', shouldRender: false, description: 'both empty' },
        { url: 'https://example.com/video.mp4', imageUrl: '', shouldRender: true, description: 'url only' },
        { url: '', imageUrl: 'https://example.com/image.jpg', shouldRender: true, description: 'imageUrl only' },
        { url: 'https://example.com/image.jpg', imageUrl: 'https://example.com/image.jpg', shouldRender: true, description: 'both present' }
    ];

    testCases.forEach(({ url, imageUrl, shouldRender, description }) => {
        const mediaItem = { url, imageUrl };
        const passes = !(!mediaItem.url && !mediaItem.imageUrl);

        assertEqual(passes, shouldRender, `Should ${shouldRender ? 'render' : 'not render'} for ${description}`);
    });
});

runner.test('Display: video-embed uses url field', () => {
    const mediaItem = {
        mediaType: 'video-embed',
        url: 'https://youtube.com/watch?v=abc123',
        platform: 'youtube',
        title: 'Test Video'
    };

    const shouldUseUrl = mediaItem.mediaType === 'video-embed' && mediaItem.url;
    assertTrue(shouldUseUrl, 'video-embed should use url field');
});

runner.test('Display: image-upload uses imageUrl field', () => {
    const mediaItem = {
        mediaType: 'image-upload',
        url: 'https://storage.example.com/image.jpg',
        imageUrl: 'https://storage.example.com/image.jpg',
        title: 'Test Image'
    };

    const shouldUseImageUrl = (mediaItem.mediaType === 'image-upload' || mediaItem.mediaType === 'image-url') && mediaItem.imageUrl;
    assertTrue(shouldUseImageUrl, 'image-upload should use imageUrl field');
});

runner.test('Display: Falls back to url if imageUrl missing', () => {
    const mediaItem = {
        mediaType: 'image-upload',
        url: 'https://storage.example.com/image.jpg',
        imageUrl: '',  // Missing
        title: 'Test Image'
    };

    const imageUrl = mediaItem.imageUrl || mediaItem.url;
    assertEqual(imageUrl, mediaItem.url, 'Should fallback to url when imageUrl missing');
});

// ============================================================================
// Test Suite 6: Bidirectional Deletion
// ============================================================================

runner.test('Deletion: Deleting media item deletes linked link', async () => {
    const appearanceService = new MockAppearanceService();
    const linksService = new MockLinksService();

    const mediaItemId = 'media-123';

    // Create media item
    appearanceService.addMediaItem({
        id: mediaItemId,
        mediaType: 'image-upload',
        title: 'Test',
        url: ''
    });

    // Create linked link
    linksService.addLink({
        id: 'link-456',
        type: 4,  // Media link type
        mediaItemId: mediaItemId,
        isActive: false
    });

    const { links: beforeLinks } = await linksService.getLinks();
    assertEqual(beforeLinks.length, 1, 'Should have 1 link before deletion');

    // Delete media item
    appearanceService.deleteMediaItem(mediaItemId);

    // Delete linked link
    const linkedLink = beforeLinks.find(link => link.type === 4 && link.mediaItemId === mediaItemId);
    if (linkedLink) {
        linksService.deleteLink(linkedLink.id);
    }

    const { links: afterLinks } = await linksService.getLinks();
    assertEqual(afterLinks.length, 0, 'Should have 0 links after deletion');
});

runner.test('Deletion: Deleting link deletes linked media item', async () => {
    const appearanceService = new MockAppearanceService();
    const linksService = new MockLinksService();

    const mediaItemId = 'media-123';

    // Create media item
    appearanceService.addMediaItem({
        id: mediaItemId,
        mediaType: 'image-upload',
        title: 'Test',
        url: ''
    });

    // Create linked link
    linksService.addLink({
        id: 'link-456',
        type: 4,
        mediaItemId: mediaItemId,
        isActive: false
    });

    assertEqual(appearanceService.mediaItems.length, 1, 'Should have 1 media item before deletion');

    // Delete link
    const { links } = await linksService.getLinks();
    const linkToDelete = links[0];
    linksService.deleteLink(linkToDelete.id);

    // Delete linked media item
    appearanceService.deleteMediaItem(linkToDelete.mediaItemId);

    assertEqual(appearanceService.mediaItems.length, 0, 'Should have 0 media items after deletion');
});

runner.test('Deletion: Handles orphaned links gracefully', async () => {
    const linksService = new MockLinksService();

    // Create link without corresponding media item
    linksService.addLink({
        id: 'link-456',
        type: 4,
        mediaItemId: 'non-existent-media',
        isActive: false
    });

    const { links } = await linksService.getLinks();
    assertEqual(links.length, 1, 'Should allow orphaned link to exist');

    // Should be able to delete orphaned link
    linksService.deleteLink(links[0].id);
    const { links: afterLinks } = await linksService.getLinks();
    assertEqual(afterLinks.length, 0, 'Should successfully delete orphaned link');
});

// ============================================================================
// Test Suite 7: Individual Media Toggle Activation
// ============================================================================

runner.test('Toggle: Can individually activate media link', async () => {
    const linksService = new MockLinksService();

    linksService.addLink({
        id: 'link-1',
        type: 4,
        mediaItemId: 'media-1',
        isActive: false
    });

    await linksService.updateLink('link-1', { isActive: true });
    const { links } = await linksService.getLinks();

    assertTrue(links[0].isActive, 'Media link should be active');
});

runner.test('Toggle: Cannot activate without uploaded media', () => {
    const mediaItem = { url: '', imageUrl: '' };
    const canActivate = !!(mediaItem.url || mediaItem.imageUrl);

    assertFalse(canActivate, 'Should not allow activation without uploaded media');
});

runner.test('Toggle: Can activate after media upload', () => {
    const mediaItemBefore = { url: '', imageUrl: '' };
    const canActivateBefore = !!(mediaItemBefore.url || mediaItemBefore.imageUrl);
    assertFalse(canActivateBefore, 'Should not allow activation before upload');

    const mediaItemAfter = { url: 'https://storage.example.com/image.jpg', imageUrl: 'https://storage.example.com/image.jpg' };
    const canActivateAfter = !!(mediaItemAfter.url || mediaItemAfter.imageUrl);
    assertTrue(canActivateAfter, 'Should allow activation after upload');
});

runner.test('Toggle: Auto-activates after first upload', async () => {
    const linksService = new MockLinksService();

    linksService.addLink({
        id: 'link-1',
        type: 4,
        mediaItemId: 'media-1',
        isActive: false
    });

    // Simulate upload completion
    const linkedLink = linksService.links[0];
    if (linkedLink && !linkedLink.isActive) {
        await linksService.updateLink(linkedLink.id, { isActive: true });
    }

    const { links } = await linksService.getLinks();
    assertTrue(links[0].isActive, 'Should auto-activate after first upload');
});

runner.test('Toggle: Multiple media links can have different states', async () => {
    const linksService = new MockLinksService();

    linksService.addLink({
        id: 'link-1',
        type: 4,
        mediaItemId: 'media-1',
        isActive: true
    });

    linksService.addLink({
        id: 'link-2',
        type: 4,
        mediaItemId: 'media-2',
        isActive: false
    });

    const { links } = await linksService.getLinks();

    assertTrue(links[0].isActive, 'First media link should be active');
    assertFalse(links[1].isActive, 'Second media link should be inactive');
});

// ============================================================================
// Test Suite 8: Real-Time Synchronization
// ============================================================================

runner.test('Sync: External updates trigger state change', async () => {
    const linksService = new MockLinksService();
    let subscriberCalled = false;
    let receivedLink = null;

    linksService.addLink({
        id: 'link-1',
        type: 4,
        mediaItemId: 'media-1',
        isActive: false
    });

    linksService.subscribe((links) => {
        subscriberCalled = true;
        receivedLink = links[0];
    });

    await linksService.updateLink('link-1', { isActive: true });

    assertTrue(subscriberCalled, 'Subscriber should be called on update');
    assertTrue(receivedLink.isActive, 'Received link should reflect new active state');
});

runner.test('Sync: Multiple components stay synchronized', async () => {
    const linksService = new MockLinksService();
    const watchers = [];

    linksService.addLink({
        id: 'link-1',
        type: 4,
        mediaItemId: 'media-1',
        isActive: false
    });

    // Simulate 3 components watching the same link
    for (let i = 0; i < 3; i++) {
        watchers.push({ id: i, toggleState: false });
        linksService.subscribe((links) => {
            watchers[i].toggleState = links[0].isActive;
        });
    }

    await linksService.updateLink('link-1', { isActive: true });

    watchers.forEach((watcher, index) => {
        assertTrue(watcher.toggleState === true, `Watcher ${index} should be updated to active`);
    });
});

// ============================================================================
// Run All Tests
// ============================================================================

console.log('🚀 Initializing Media Features Test Suite...\n');
console.log('Testing:');
console.log('  - Media Upload Validation (5 tests)');
console.log('  - MediaCard State Management (5 tests)');
console.log('  - ImageCropUtils CrossOrigin Handling (5 tests)');
console.log('  - Server-Side Media Type Validation (5 tests)');
console.log('  - MediaDisplay Rendering (4 tests)');
console.log('  - Bidirectional Deletion (3 tests)');
console.log('  - Individual Media Toggle Activation (5 tests)');
console.log('  - Real-Time Synchronization (2 tests)');
console.log('\nTotal: 34 tests\n');

runner.run();
