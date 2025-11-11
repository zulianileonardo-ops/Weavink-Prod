// lib/services/serviceAppearance/client/appearanceService.js - Updated with Banner Support
import { ContactApiClient } from '@/lib/services/core/ApiClient';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/important/firebase';
import { auth } from '@/important/firebase';

// ✅ SERVICE-LEVEL CACHE WITH REAL-TIME SYNC
let appearanceCache = {
    data: null,
    expiry: null,
    userId: null,
    listeners: new Set(), // Components that want cache updates
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Global Firestore listener for real-time cache invalidation
let globalFirestoreUnsubscribe = null;
let currentListenedUserId = null;

// Local listener registry for cross-component appearance updates
const appearanceClientListeners = new Set();
let latestLocalAppearanceEvent = null;

function notifyAppearanceClients(event) {
    latestLocalAppearanceEvent = event;

    appearanceClientListeners.forEach(listener => {
        try {
            listener(event);
        } catch (error) {
            console.error('AppearanceService listener error:', error);
        }
    });
}

/**
 * Start the global Firestore listener for real-time cache invalidation
 * @private
 */
function startGlobalFirestoreListener(userId) {
    if (!userId) return;

    // If already listening to this user, do nothing
    if (currentListenedUserId === userId && globalFirestoreUnsubscribe) {
        return;
    }

    // Clean up existing listener if user changed
    if (globalFirestoreUnsubscribe) {
        globalFirestoreUnsubscribe();
        globalFirestoreUnsubscribe = null;
    }

    console.log('🔥 AppearanceService: Starting Firestore listener for cache invalidation');

    const db = getFirestore(app);
    const userRef = doc(db, 'users', userId);

    globalFirestoreUnsubscribe = onSnapshot(
        userRef,
        (docSnapshot) => {
            if (docSnapshot.exists()) {
                console.log('🔄 AppearanceService: Firestore data changed, invalidating cache');

                // Invalidate cache when Firestore data changes
                const previousData = appearanceCache.data;
                appearanceCache.data = null;
                appearanceCache.expiry = null;

                // Notify all cache listeners that data is stale
                appearanceCache.listeners.forEach(callback => {
                    try {
                        callback(null, { invalidated: true });
                    } catch (error) {
                        console.error('Error notifying appearance cache listener:', error);
                    }
                });
            }
        },
        (error) => {
            console.error('AppearanceService: Firestore listener error:', error);
        }
    );

    currentListenedUserId = userId;
}

/**
 * Stop the global Firestore listener
 * @private
 */
function stopGlobalFirestoreListener() {
    if (globalFirestoreUnsubscribe) {
        console.log('🔥 AppearanceService: Stopping Firestore listener');
        globalFirestoreUnsubscribe();
        globalFirestoreUnsubscribe = null;
        currentListenedUserId = null;
    }
}

/**
 * Notify all cache subscribers of updates
 * @private
 */
function notifyCacheListeners(data) {
    appearanceCache.listeners.forEach(callback => {
        try {
            callback(data);
        } catch (error) {
            console.error('Error notifying appearance cache listener:', error);
        }
    });
}

/**
 * Client-side service for appearance operations
 * Updated to include banner functionality and real-time listeners
 */
export class AppearanceService {

    /**
     * Get user's appearance data with caching
     * @param {boolean} forceRefresh - If true, bypasses the cache and fetches fresh data
     * @returns {Promise<Object>} Appearance data
     */
    static async getAppearanceData(forceRefresh = false) {
        const now = Date.now();
        const currentUserId = auth.currentUser?.uid;

        // ✅ CHECK THE CACHE FIRST
        if (!forceRefresh &&
            appearanceCache.data &&
            appearanceCache.userId === currentUserId &&
            appearanceCache.expiry &&
            now < appearanceCache.expiry) {
            console.log('⚡ AppearanceService: Serving appearance from service cache');
            return appearanceCache.data;
        }

        try {
            console.log('📥 AppearanceService: Fetching fresh appearance from API...');
            const data = await ContactApiClient.get('/api/user/appearance/theme');

            // ✅ UPDATE THE CACHE ON SUCCESSFUL FETCH
            appearanceCache = {
                ...appearanceCache, // Preserve listeners
                data,
                expiry: now + CACHE_DURATION,
                userId: currentUserId,
            };

            // ✅ START FIRESTORE LISTENER IF WE HAVE CACHE SUBSCRIBERS
            if (appearanceCache.listeners.size > 0 && currentUserId) {
                startGlobalFirestoreListener(currentUserId);
            }

            // ✅ NOTIFY SUBSCRIBERS OF THE NEW DATA
            notifyCacheListeners(data);

            return data;
        } catch (error) {
            console.error('AppearanceService: Failed to fetch appearance data.', error);
            throw error;
        }
    }

    /**
     * Subscribe to appearance cache updates
     * @param {Function} callback - Function to call when appearance data changes
     * @returns {Function} - Unsubscribe function
     */
    static subscribe(callback) {
        if (typeof callback !== 'function') {
            console.warn('AppearanceService.subscribe: callback must be a function');
            return () => {};
        }

        appearanceCache.listeners.add(callback);

        // Start Firestore listener when first subscriber registers
        if (appearanceCache.listeners.size === 1) {
            const currentUserId = auth.currentUser?.uid;
            if (currentUserId) {
                startGlobalFirestoreListener(currentUserId);
            }
        }

        // Return unsubscribe function
        return () => {
            appearanceCache.listeners.delete(callback);

            // Stop Firestore listener when no more subscribers
            if (appearanceCache.listeners.size === 0) {
                stopGlobalFirestoreListener();
            }
        };
    }

    /**
     * Manually invalidate the appearance cache
     * Useful when you know data has changed and want to force a refresh
     */
    static invalidateCache() {
        console.log('🗑️ AppearanceService: Invalidating appearance cache.');
        appearanceCache = {
            ...appearanceCache, // Preserve listeners
            data: null,
            expiry: null,
        };
    }

    /**
     * Get cached appearance data without making an API call
     * @returns {Object|null} - Cached appearance data or null if not cached
     */
    static getCachedAppearanceData() {
        const now = Date.now();
        const currentUserId = auth.currentUser?.uid;

        if (appearanceCache.data &&
            appearanceCache.userId === currentUserId &&
            appearanceCache.expiry &&
            now < appearanceCache.expiry) {
            return appearanceCache.data;
        }
        return null;
    }

    /**
     * Listen to real-time appearance data changes
     * Returns data in the same format as getAppearanceData() for consistency
     * @param {string} userId - User ID to listen to
     * @param {Function} callback - Callback function that receives updated appearance data
     * @returns {Function} Unsubscribe function to stop listening
     */
    static listenToAppearanceData(userId, callback) {
        if (!userId) {
            console.error('listenToAppearanceData: userId is required');
            return () => {};
        }

        const db = getFirestore(app);
        const userRef = doc(db, 'users', userId);

        const unsubscribe = onSnapshot(
            userRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    const profile = userData.profile || {};
                    const appearance = userData.appearance || {};

                    // Format data to match getAppearance() structure from server
                    const formattedData = {
                        // User profile fields from profile object
                        username: userData.username || '',
                        displayName: profile.displayName || '',
                        bio: profile.bio || '',
                        avatarUrl: profile.avatarUrl || '',
                        location: profile.location || '',

                        // Appearance settings from appearance object
                        selectedTheme: appearance.selectedTheme || 'Lake White',
                        themeFontColor: appearance.themeFontColor || '#000000',
                        fontType: appearance.fontType || 0,
                        backgroundColor: appearance.backgroundColor || '#FFFFFF',
                        backgroundType: appearance.backgroundType || 'Color',
                        btnColor: appearance.btnColor || '#000000',
                        btnFontColor: appearance.btnFontColor || '#FFFFFF',
                        btnShadowColor: appearance.btnShadowColor || '#dcdbdb',
                        btnBorderColor: appearance.btnBorderColor || '#000000',
                        btnOpacity: typeof appearance.btnOpacity === 'number' ? appearance.btnOpacity : 100,
                        btnLuminanceLevel: typeof appearance.btnLuminanceLevel === 'number' ? appearance.btnLuminanceLevel : 50,
                        btnLuminanceRange: typeof appearance.btnLuminanceRange === 'number' ? appearance.btnLuminanceRange : 20,
                        isOpacityEnabled: typeof appearance.isOpacityEnabled === 'boolean' ? appearance.isOpacityEnabled : false,
                        isLuminanceEnabled: typeof appearance.isLuminanceEnabled === 'boolean' ? appearance.isLuminanceEnabled : false,
                        btnType: appearance.btnType || 0,

                        // Background gradient settings
                        gradientDirection: appearance.gradientDirection || 0,
                        gradientColorStart: appearance.gradientColorStart || '#FFFFFF',
                        gradientColorEnd: appearance.gradientColorEnd || '#000000',

                        // Banner settings
                        bannerType: appearance.bannerType || 'None',
                        bannerColor: appearance.bannerColor || '#3B82F6',
                        bannerGradientStart: appearance.bannerGradientStart || '#667eea',
                        bannerGradientEnd: appearance.bannerGradientEnd || '#764ba2',
                        bannerGradientDirection: appearance.bannerGradientDirection || 'to right',
                        bannerImage: appearance.bannerImage || null,
                        bannerVideo: appearance.bannerVideo || null,

                        // Carousel settings
                        carouselEnabled: appearance.carouselEnabled || false,
                        carouselItems: appearance.carouselItems || [],
                        carouselStyle: appearance.carouselStyle || 'modern',

                        // CV settings
                        cvEnabled: appearance.cvEnabled || false,
                        cvItems: appearance.cvItems || [],
                        // Legacy support
                        cvDocument: appearance.cvDocument || null,

                        // Media settings
                        mediaEnabled: appearance.mediaEnabled || false,
                        mediaItems: appearance.mediaItems || []
                    };

                    callback(formattedData);
                } else {
                    console.warn('listenToAppearanceData: User document does not exist');
                    callback({});
                }
            },
            (error) => {
                console.error('listenToAppearanceData: Error listening to appearance data:', error);
            }
        );

        return unsubscribe;
    }

    /**
     * Update appearance data (primary save function)
     * @param {Object} appearanceData - Complete or partial appearance data to update
     * @returns {Promise<Object>} Update result
     */
    static subscribeToLocalChanges(listener) {
        if (typeof listener !== 'function') {
            console.warn('AppearanceService.subscribeToLocalChanges: listener must be a function');
            return () => {};
        }

        appearanceClientListeners.add(listener);

        return () => {
            appearanceClientListeners.delete(listener);
        };
    }

    /**
     * Update appearance data (primary save function)
     * @param {Object} appearanceData - Complete or partial appearance data to update
     * @param {Object} options - Optional configuration
     * @param {boolean} options.silent - Skip notifying local listeners
     * @param {string} options.origin - Identifier for the caller (for debugging/filtering)
     * @returns {Promise<Object>} Update result
     */
    static async updateAppearanceData(appearanceData, options = {}) {
        const response = await ContactApiClient.post('/api/user/appearance/theme', appearanceData);

        // ✅ INVALIDATE CACHE AFTER UPDATE
        console.log('🔄 AppearanceService: Invalidating cache after update');
        this.invalidateCache();

        const shouldNotify = !options?.silent;

        if (shouldNotify) {
            notifyAppearanceClients({
                type: 'appearance:update',
                payload: appearanceData,
                origin: options?.origin || 'unknown',
                timestamp: Date.now(),
                response,
                userId: options?.userId || null
            });
        }

        return response;
    }

    /**
     * Retrieve the most recent locally-broadcast appearance update event.
     * @returns {Object|null}
     */
    static getLatestLocalEvent() {
        return latestLocalAppearanceEvent;
    }

    /**
     * Clear the cached local appearance event.
     */
    static clearLatestLocalEvent() {
        latestLocalAppearanceEvent = null;
    }

    // ===== FILE UPLOAD FUNCTIONS =====
    
    /**
     * Handles file uploads for appearance (profile photo, background, banner, etc.).
     * @param {File} file - The file to upload.
     * @param {string} uploadType - 'profile', 'backgroundImage', 'backgroundVideo', 'bannerImage', 'bannerVideo', or 'cv'.
     * @returns {Promise<object>}
     */
    static async uploadFile(file, uploadType) {
        return this._uploadFile(file, uploadType);
    }

    /**
     * Upload profile image
     * @param {File} file - Image file to upload
     * @returns {Promise<Object>} Upload result
     */
    static async uploadProfileImage(file) {
        return this._uploadFile(file, 'profile');
    }

    /**
     * Upload background image  
     * @param {File} file - Image file to upload
     * @returns {Promise<Object>} Upload result
     */
    static async uploadBackgroundImage(file) {
        return this._uploadFile(file, 'backgroundImage');
    }

    /**
     * Upload background video
     * @param {File} file - Video file to upload
     * @returns {Promise<Object>} Upload result
     */
    static async uploadBackgroundVideo(file) {
        return this._uploadFile(file, 'backgroundVideo');
    }

    /**
     * 🆕 Upload banner image
     * @param {File} file - Image file to upload
     * @returns {Promise<Object>} Upload result
     */
    static async uploadBannerImage(file) {
        return this._uploadFile(file, 'bannerImage');
    }

    /**
     * 🆕 Upload banner video
     * @param {File} file - Video file to upload
     * @returns {Promise<Object>} Upload result
     */
    static async uploadBannerVideo(file) {
        return this._uploadFile(file, 'bannerVideo');
    }

    /**
     * Upload CV document
     * @param {File} file - Document file to upload
     * @returns {Promise<Object>} Upload result
     */
    static async uploadCVDocument(file) {
        return this._uploadFile(file, 'cv');
    }

    // ===== FILE REMOVAL FUNCTIONS =====

    /**
     * Remove profile image
     * @returns {Promise<Object>} Remove result
     */
    static async removeProfileImage() {
        return this._removeFile('profile');
    }

    /**
     * Remove background image
     * @returns {Promise<Object>} Remove result
     */
    static async removeBackgroundImage() {
        return this._removeFile('backgroundImage');
    }

    /**
     * Remove background video
     * @returns {Promise<Object>} Remove result
     */
    static async removeBackgroundVideo() {
        return this._removeFile('backgroundVideo');
    }

    /**
     * 🆕 Remove banner image
     * @returns {Promise<Object>} Remove result
     */
    static async removeBannerImage() {
        return this._removeFile('bannerImage');
    }

    /**
     * 🆕 Remove banner video
     * @returns {Promise<Object>} Remove result
     */
    static async removeBannerVideo() {
        return this._removeFile('bannerVideo');
    }

    /**
     * Remove CV document
     * @returns {Promise<Object>} Remove result
     */
    static async removeCVDocument() {
        return this._removeFile('cv');
    }

    // ===== BANNER-SPECIFIC FUNCTIONS =====

    /**
     * 🆕 Update banner type
     * @param {string} type - Banner type ('None', 'Color', 'Gradient', 'Image', 'Video', etc.)
     * @returns {Promise<Object>} Update result
     */
    static async updateBannerType(type) {
        return this.updateAppearanceData({
            bannerType: type
        });
    }

    /**
     * 🆕 Update banner color
     * @param {string} color - Banner color (hex)
     * @returns {Promise<Object>} Update result
     */
    static async updateBannerColor(color) {
        return this.updateAppearanceData({
            bannerColor: color
        });
    }

    /**
     * 🆕 Update banner gradient settings
     * @param {Object} gradientSettings - Gradient configuration
     * @param {string} gradientSettings.start - Start color
     * @param {string} gradientSettings.end - End color
     * @param {string} gradientSettings.direction - Gradient direction
     * @returns {Promise<Object>} Update result
     */
    static async updateBannerGradient(gradientSettings) {
        return this.updateAppearanceData({
            bannerGradientStart: gradientSettings.start,
            bannerGradientEnd: gradientSettings.end,
            bannerGradientDirection: gradientSettings.direction
        });
    }

    // ===== CAROUSEL-SPECIFIC FUNCTIONS =====

    /**
     * 🆕 Update carousel enabled status
     * @param {boolean} enabled - Whether carousel is enabled
     * @returns {Promise<Object>} Update result
     */
    static async updateCarouselEnabled(enabled) {
        return this.updateAppearanceData({
            carouselEnabled: enabled
        });
    }

    /**
     * 🆕 Update carousel style
     * @param {string} style - Carousel style ('modern', 'minimal', 'bold')
     * @returns {Promise<Object>} Update result
     */
    static async updateCarouselStyle(style) {
        return this.updateAppearanceData({
            carouselStyle: style
        });
    }

    /**
     * 🆕 Update carousel items
     * @param {Array} items - Array of carousel items
     * @returns {Promise<Object>} Update result
     */
    static async updateCarouselItems(items) {
        return this.updateAppearanceData({
            carouselItems: items
        });
    }

    /**
     * 🆕 Upload carousel image
     * @param {File} file - Image file to upload
     * @returns {Promise<Object>} Upload result with downloadURL
     */
    static async uploadCarouselImage(file) {
        return this._uploadFile(file, 'carouselImage');
    }

    /**
     * 🆕 Upload carousel video
     * @param {File} file - Video file to upload
     * @returns {Promise<Object>} Upload result with downloadURL
     */
    static async uploadCarouselVideo(file) {
        return this._uploadFile(file, 'carouselVideo');
    }

    /**
     * Upload carousel background image
     * @param {File} file - Image file to upload
     * @returns {Promise<Object>} Upload result with downloadURL
     */
    static async uploadCarouselBackgroundImage(file) {
        return this._uploadFile(file, 'carouselBackgroundImage');
    }

    /**
     * Upload carousel background video
     * @param {File} file - Video file to upload
     * @returns {Promise<Object>} Upload result with downloadURL
     */
    static async uploadCarouselBackgroundVideo(file) {
        return this._uploadFile(file, 'carouselBackgroundVideo');
    }

    // ===== BACKWARD COMPATIBILITY FUNCTIONS =====
    // These maintain compatibility with existing code but use the new bulk update method

    /**
     * Update theme and theme color
     * @param {string} theme - Theme name
     * @param {string} themeColor - Theme color (hex)
     * @returns {Promise<Object>} Update result
     */
    static async updateTheme(theme, themeColor = '#000') {
        return this.updateAppearanceData({
            selectedTheme: theme,
            themeFontColor: themeColor
        });
    }

    /**
     * Update background type
     * @param {string} type - Background type
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeBackground(type) {
        return this.updateAppearanceData({
            backgroundType: type
        });
    }

    /**
     * Update background color
     * @param {string} color - Background color (hex)
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeBackgroundColor(color) {
        return this.updateAppearanceData({
            backgroundColor: color
        });
    }

    /**
     * Update button type
     * @param {number} btnType - Button type index
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeButton(btnType) {
        return this.updateAppearanceData({
            btnType: btnType
        });
    }

    /**
     * Update button color
     * @param {string} color - Button color (hex)
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeBtnColor(color) {
        return this.updateAppearanceData({
            btnColor: color
        });
    }

    /**
     * Update button font color
     * @param {string} color - Button font color (hex)
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeBtnFontColor(color) {
        return this.updateAppearanceData({
            btnFontColor: color
        });
    }

    /**
     * Update button shadow color
     * @param {string} color - Button shadow color (hex)
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeBtnShadowColor(color) {
        return this.updateAppearanceData({
            btnShadowColor: color
        });
    }

    /**
     * Update text color
     * @param {string} color - Text color (hex)
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeTextColour(color) {
        return this.updateAppearanceData({
            themeTextColour: color
        });
    }

    /**
     * Update gradient direction
     * @param {number} direction - Gradient direction in degrees
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeGradientDirection(direction) {
        return this.updateAppearanceData({
            gradientDirection: direction
        });
    }

    /**
     * Update font type
     * @param {number} fontType - Font type index
     * @returns {Promise<Object>} Update result
     */
    static async updateThemeFont(fontType) {
        return this.updateAppearanceData({
            fontType: fontType
        });
    }

    /**
     * Update Christmas accessory
     * @param {string} accessoryType - Christmas accessory type
     * @returns {Promise<Object>} Update result
     */
    static async updateChristmasAccessory(accessoryType) {
        return this.updateAppearanceData({
            christmasAccessory: accessoryType
        });
    }

    /**
     * Update display name
     * @param {string} displayName - User's display name
     * @returns {Promise<Object>} Update result
     */
    static async updateDisplayName(displayName) {
        return this.updateAppearanceData({
            displayName: displayName
        });
    }

    /**
     * Update bio
     * @param {string} bio - User's bio
     * @returns {Promise<Object>} Update result
     */
    static async updateBio(bio) {
        return this.updateAppearanceData({
            bio: bio
        });
    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Generic file upload function
     * @private
     * @param {File} file - File to upload
     * @param {string} uploadType - Type of upload
     * @returns {Promise<Object>} Upload result
     */
    static async _uploadFile(file, uploadType) {
        try {
            const token = await ContactApiClient.getAuthToken();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('uploadType', uploadType);

            const response = await fetch('/api/user/appearance/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Don't set Content-Type for FormData - let browser set it with boundary
                },
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = 'Upload failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            return response.json();
        } catch (error) {
            console.error(`Upload error (${uploadType}):`, error);
            throw error;
        }
    }

    /**
     * Generic file removal function
     * @private
     * @param {string} deleteType - Type of file to delete
     * @returns {Promise<Object>} Delete result
     */
    static async _removeFile(deleteType) {
        return ContactApiClient.delete('/api/user/appearance/upload', {
            body: { deleteType }
        });
    }
}

// For backward compatibility, also export individual functions
export const {
    getAppearanceData,
    subscribe, // 🆕 Service-level cache subscription
    invalidateCache, // 🆕 Manual cache invalidation
    getCachedAppearanceData, // 🆕 Get cached data without API call
    listenToAppearanceData, // 🆕 Real-time listener
    subscribeToLocalChanges,
    getLatestLocalEvent,
    clearLatestLocalEvent,
    updateAppearanceData,
    uploadProfileImage,
    uploadBackgroundImage,
    uploadBackgroundVideo,
    uploadBannerImage, // 🆕
    uploadBannerVideo, // 🆕
    uploadCVDocument,
    uploadCarouselImage, // 🆕
    uploadCarouselVideo, // 🆕
    uploadCarouselBackgroundImage,
    uploadCarouselBackgroundVideo,
    removeProfileImage,
    removeBackgroundImage,
    removeBackgroundVideo,
    removeBannerImage, // 🆕
    removeBannerVideo, // 🆕
    removeCVDocument,
    updateBannerType, // 🆕
    updateBannerColor, // 🆕
    updateBannerGradient, // 🆕
    updateCarouselEnabled, // 🆕
    updateCarouselStyle, // 🆕
    updateCarouselItems, // 🆕
    updateTheme,
    updateThemeBackground,
    updateThemeBackgroundColor,
    updateThemeButton,
    updateThemeBtnColor,
    updateThemeBtnFontColor,
    updateThemeBtnShadowColor,
    updateThemeTextColour,
    updateThemeGradientDirection,
    updateThemeFont,
    updateChristmasAccessory,
    updateDisplayName,
    updateBio
} = AppearanceService;
