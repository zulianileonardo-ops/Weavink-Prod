/**
 * THIS FILE HAS BEEN REFACTORED
 */
// lib/services/serviceSettings/server/settingsService.js
import { adminDb } from '@/lib/firebaseAdmin';
import { LOCATION_FEATURES_BY_TIER } from '@/lib/services/serviceContact/client/constants/contactConstants.js';
import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';

export class SettingsService {
    /**
     * Get user settings
     */
    static async getUserSettings({ session }) {
        if (!session?.userId) {
            throw new Error('Authorization failed: No user session');
        }

        try {
            const userDoc = await adminDb
                .collection('users')  // ✅ Changed from 'AccountData' to 'users'
                .doc(session.userId)
                .get();

            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();

            // Based on your Firestore structure, settings are nested under 'settings'
            const settingsData = userData.settings || {};
            const profile = userData.profile || {};

            // Return settings-related data matching your structure
            return {
                // Settings from the settings object
                allowMessages: settingsData.allowMessages ?? true,
                isPublic: settingsData.isPublic ?? true,
                theme: settingsData.theme || 'light',
                notifications: settingsData.notifications || {
                    email: true,
                    push: true
                },

                // Contact download settings
                downloadContactEnabled: settingsData.downloadContactEnabled ?? true,
                downloadContactFields: settingsData.downloadContactFields || {
                    displayName: true,
                    email: true,
                    bio: true,
                    location: true,
                    website: true,
                    photo: true,
                    linkedin: true,
                    twitter: true,
                    instagram: true,
                    facebook: true
                },

                // Language preference
                defaultLanguage: settingsData.defaultLanguage || 'en',

                // Profile-related settings
                bio: profile.bio || '',
                location: profile.location || '',
                displayName: profile.displayName || '',

                // Socials (from root level based on your structure)
                socials: userData.socials || [],

                // Additional settings you might have
                socialPosition: userData.socialPosition || 0,
                supportBanner: userData.supportBanner || 0,
                supportBannerStatus: userData.supportBannerStatus || false,
                sensitiveStatus: userData.sensitiveStatus || false,
                sensitivetype: userData.sensitivetype || 3,
                metaData: userData.metaData || { title: '', description: '' },

                // Location Services settings (from settings object)
                locationServicesEnabled: settingsData.locationServicesEnabled ?? false,
                locationFeatures: settingsData.locationFeatures || {
                    autoVenueEnrichment: false,
                    eventDetection: false,
                    autoTagging: false
                },
            };
        } catch (error) {
            console.error('❌ SettingsService.getUserSettings error:', error);
            throw error;
        }
    }

    /**
     * Update user settings
     * Supports both bulk updates and action-based updates
     */
    static async updateUserSettings({ settingsData, session }) {
        if (!session?.userId) {
            throw new Error('Authorization failed: No user session');
        }

        try {
            const userDocRef = adminDb.collection('users').doc(session.userId);  // ✅ Changed collection
            
            // Check if this is a bulk update or action-based update
            const isBulkUpdate = !settingsData.action && !settingsData.data;
            let updateData = {};

            if (isBulkUpdate) {
                // ✅ BULK UPDATE: Handle direct settings data
                console.log('Processing bulk settings update for user:', session.userId);

                const allowedFields = [
                    'socials', 'socialPosition', 'supportBanner', 'supportBannerStatus',
                    'sensitiveStatus', 'sensitivetype', 'metaData',
                    // Settings nested fields
                    'settings.allowMessages', 'settings.isPublic', 'settings.theme',
                    'settings.notifications',
                    'settings.locationServicesEnabled', 'settings.locationFeatures',
                    // Profile fields
                    'profile.bio', 'profile.location', 'profile.displayName'
                ];

                for (const [key, value] of Object.entries(settingsData)) {
                    // Handle nested settings
                    if (key === 'settings' && typeof value === 'object') {
                        for (const [settingKey, settingValue] of Object.entries(value)) {
                            // Validate location features if being updated
                            if (settingKey === 'locationFeatures' && settingValue) {
                                const validation = await this._validateLocationFeaturesTier(session.userId, settingValue);
                                if (!validation.valid) {
                                    throw new Error(`Permission denied: ${validation.errors.join(', ')}`);
                                }
                                console.log('✅ Location features validated for tier:', validation.subscriptionLevel);
                            }
                            updateData[`settings.${settingKey}`] = settingValue;
                        }
                    }
                    // Handle nested profile
                    else if (key === 'profile' && typeof value === 'object') {
                        for (const [profileKey, profileValue] of Object.entries(value)) {
                            updateData[`profile.${profileKey}`] = profileValue;
                        }
                    }
                    // Handle location settings (store under settings object)
                    else if (key === 'locationServicesEnabled' || key === 'locationFeatures') {
                        // Validate location features if being updated
                        if (key === 'locationFeatures' && value) {
                            const validation = await this._validateLocationFeaturesTier(session.userId, value);
                            if (!validation.valid) {
                                throw new Error(`Permission denied: ${validation.errors.join(', ')}`);
                            }
                            console.log('✅ Location features validated for tier:', validation.subscriptionLevel);
                        }
                        updateData[`settings.${key}`] = value;
                    }
                    // Handle root-level fields
                    else if (allowedFields.includes(key)) {
                        updateData[key] = value;
                    }
                }

                if (Object.keys(updateData).length === 0) {
                    throw new Error('No valid fields to update');
                }
            } else {
                // ✅ ACTION-BASED UPDATE
                const { action, data } = settingsData;

                if (!action || !data) {
                    throw new Error('Missing action or data');
                }

                console.log(`Processing settings action: ${action} for user:`, session.userId);

                updateData = this._buildUpdateDataFromAction(action, data);
            }

            // Perform the update
            await userDocRef.update(updateData);

            return {
                updatedFields: Object.keys(updateData),
                updateType: isBulkUpdate ? 'bulk' : 'action',
                isBulkUpdate
            };
        } catch (error) {
            console.error('❌ SettingsService.updateUserSettings error:', error);
            
            // Re-throw with specific error messages
            if (error.code === 'not-found') {
                throw new Error('User document not found');
            }
            
            throw error;
        }
    }

    /**
     * Validate location features based on subscription tier
     * @param {string} userId - User ID
     * @param {Object} locationFeatures - Location features to validate
     * @returns {Promise<{valid: boolean, errors: string[]}>}
     */
    static async _validateLocationFeaturesTier(userId, locationFeatures) {
        try {
            // Get user's subscription level
            const userDoc = await adminDb.collection('users').doc(userId).get();

            if (!userDoc.exists) {
                return { valid: false, errors: ['User not found'] };
            }

            const userData = userDoc.data();
            const subscriptionLevel = (userData.accountType || 'base').toLowerCase();

            // Get allowed features for this tier
            let allowedFeatures = LOCATION_FEATURES_BY_TIER[subscriptionLevel];

            if (!allowedFeatures) {
                console.warn(`Unknown subscription level: ${subscriptionLevel}, defaulting to BASE`);
                allowedFeatures = LOCATION_FEATURES_BY_TIER[SUBSCRIPTION_LEVELS.BASE];
            }

            const errors = [];

            // Validate geocoding
            if (locationFeatures.geocoding === true && !allowedFeatures.geocoding) {
                errors.push('Geocoding requires Pro subscription or higher');
            }

            // Validate venue enrichment
            if (locationFeatures.autoVenueEnrichment === true && !allowedFeatures.autoVenueEnrichment) {
                errors.push('Auto Venue Enrichment requires Premium subscription or higher');
            }

            return {
                valid: errors.length === 0,
                errors,
                subscriptionLevel,
                allowedFeatures
            };
        } catch (error) {
            console.error('Error validating location features tier:', error);
            return { valid: false, errors: ['Error validating subscription tier'] };
        }
    }

    /**
     * Build update data based on action type
     */
    static _buildUpdateDataFromAction(action, data) {
        switch (action) {
            case 'updateSocials':
                if (!Array.isArray(data.socials)) {
                    throw new Error('Socials must be an array');
                }
                return { socials: data.socials };

            case 'updateSocialPosition':
                if (typeof data.position !== 'number') {
                    throw new Error('Position must be a number');
                }
                return { socialPosition: data.position };

            case 'updateSupportBanner':
                const bannerUpdate = {};
                if (data.supportBanner !== undefined) {
                    bannerUpdate.supportBanner = data.supportBanner;
                }
                if (data.supportBannerStatus !== undefined) {
                    bannerUpdate.supportBannerStatus = data.supportBannerStatus;
                }
                return bannerUpdate;

            case 'updateSensitiveStatus':
                return { sensitiveStatus: !!data.status };

            case 'updateSensitiveType':
                if (typeof data.type !== 'number') {
                    throw new Error('Sensitive type must be a number');
                }
                return { sensitivetype: data.type };

            case 'updateMetaData':
                if (typeof data.title !== 'string' || typeof data.description !== 'string') {
                    throw new Error('Title and description must be strings');
                }
                return {
                    metaData: {
                        title: data.title.trim(),
                        description: data.description.trim()
                    }
                };

            // New actions for nested settings
            case 'updateTheme':
                return { 'settings.theme': data.theme };

            case 'updateNotifications':
                return { 'settings.notifications': data.notifications };

            case 'updatePrivacy':
                const privacyUpdate = {};
                if (data.allowMessages !== undefined) {
                    privacyUpdate['settings.allowMessages'] = data.allowMessages;
                }
                if (data.isPublic !== undefined) {
                    privacyUpdate['settings.isPublic'] = data.isPublic;
                }
                return privacyUpdate;

            case 'updateProfile':
                const profileUpdate = {};
                if (data.bio !== undefined) {
                    profileUpdate['profile.bio'] = data.bio;
                }
                if (data.location !== undefined) {
                    profileUpdate['profile.location'] = data.location;
                }
                if (data.displayName !== undefined) {
                    profileUpdate['profile.displayName'] = data.displayName;
                }
                return profileUpdate;

            case 'updateContactDownload':
                const contactDownloadUpdate = {};
                if (data.downloadContactEnabled !== undefined) {
                    contactDownloadUpdate['settings.downloadContactEnabled'] = data.downloadContactEnabled;
                }
                if (data.downloadContactFields !== undefined) {
                    if (typeof data.downloadContactFields !== 'object') {
                        throw new Error('downloadContactFields must be an object');
                    }
                    contactDownloadUpdate['settings.downloadContactFields'] = data.downloadContactFields;
                }
                return contactDownloadUpdate;

            case 'updateLanguage':
                if (typeof data.defaultLanguage !== 'string') {
                    throw new Error('defaultLanguage must be a string');
                }
                const validLanguages = ['en', 'fr', 'es', 'vm', 'zh'];
                if (!validLanguages.includes(data.defaultLanguage)) {
                    throw new Error('Invalid language code');
                }
                return { 'settings.defaultLanguage': data.defaultLanguage };

            default:
                throw new Error('Invalid action');
        }
    }

    /**
     * Complete user onboarding
     * Updates onboardingCompleted flag and saves onboarding answers
     */
    static async completeOnboarding({ answers, session }) {
        if (!session?.userId) {
            throw new Error('Authorization failed: No user session');
        }

        try {
            const userDocRef = adminDb.collection('users').doc(session.userId);

            // Build update data
            const updateData = {
                onboardingCompleted: true,
                onboardingCompletedAt: new Date().toISOString(),
            };

            // Save language preference if provided
            if (answers?.language) {
                const validLanguages = ['en', 'fr', 'es', 'vm', 'zh'];
                if (validLanguages.includes(answers.language)) {
                    updateData['settings.defaultLanguage'] = answers.language;
                }
            }

            // Future: Save other onboarding answers
            // if (answers?.interests) {
            //     updateData['onboardingAnswers.interests'] = answers.interests;
            // }

            // Perform the update
            await userDocRef.update(updateData);

            console.log('✅ Onboarding completed for user:', session.userId);

            return {
                success: true,
                completedAt: updateData.onboardingCompletedAt
            };
        } catch (error) {
            console.error('❌ SettingsService.completeOnboarding error:', error);

            if (error.code === 'not-found') {
                throw new Error('User document not found');
            }

            throw error;
        }
    }

    /**
     * Complete user tutorial
     * Updates tutorialCompleted flag and saves completion timestamp
     */
    static async completeTutorial({ completedSteps, session }) {
        if (!session?.userId) {
            throw new Error('Authorization failed: No user session');
        }

        try {
            const userDocRef = adminDb.collection('users').doc(session.userId);

            const completedAt = new Date().toISOString();

            // Build update data
            const updateData = {
                tutorialCompleted: true,
                'tutorialProgress.completedAt': completedAt,
                'tutorialProgress.completedSteps': completedSteps || [],
                'tutorialProgress.skipped': false,
                'tutorialProgress.lastUpdatedAt': completedAt,
            };

            // Perform the update
            await userDocRef.update(updateData);

            console.log('✅ Tutorial completed for user:', session.userId);

            return {
                success: true,
                completedAt,
            };
        } catch (error) {
            console.error('❌ SettingsService.completeTutorial error:', error);

            if (error.code === 'not-found') {
                throw new Error('User document not found');
            }

            throw error;
        }
    }

    /**
     * Update tutorial progress
     * Saves current step and completed steps (called after each step)
     */
    static async updateTutorialProgress({ currentStep, completedSteps, session }) {
        if (!session?.userId) {
            throw new Error('Authorization failed: No user session');
        }

        try {
            const userDocRef = adminDb.collection('users').doc(session.userId);

            const updatedAt = new Date().toISOString();

            // Build update data
            const updateData = {
                'tutorialProgress.currentStep': currentStep,
                'tutorialProgress.completedSteps': completedSteps || [],
                'tutorialProgress.lastUpdatedAt': updatedAt,
            };

            // Set startedAt timestamp if this is the first step
            if (currentStep === 0 || (completedSteps && completedSteps.length === 0)) {
                updateData['tutorialProgress.startedAt'] = updatedAt;
            }

            // Perform the update
            await userDocRef.update(updateData);

            console.log('📝 Tutorial progress updated for user:', session.userId, {
                currentStep,
                completedSteps: completedSteps?.length || 0,
            });

            return {
                success: true,
                currentStep,
                updatedAt,
            };
        } catch (error) {
            console.error('❌ SettingsService.updateTutorialProgress error:', error);

            if (error.code === 'not-found') {
                throw new Error('User document not found');
            }

            throw error;
        }
    }

    /**
     * Skip tutorial
     * Marks tutorial as skipped so it won't show again
     */
    static async skipTutorial({ session }) {
        if (!session?.userId) {
            throw new Error('Authorization failed: No user session');
        }

        try {
            const userDocRef = adminDb.collection('users').doc(session.userId);

            const skippedAt = new Date().toISOString();

            // Build update data
            const updateData = {
                tutorialCompleted: true, // Mark as complete to prevent showing again
                'tutorialProgress.skipped': true,
                'tutorialProgress.skippedAt': skippedAt,
                'tutorialProgress.lastUpdatedAt': skippedAt,
            };

            // Perform the update
            await userDocRef.update(updateData);

            console.log('⏭️ Tutorial skipped for user:', session.userId);

            return {
                success: true,
                skipped: true,
                skippedAt,
            };
        } catch (error) {
            console.error('❌ SettingsService.skipTutorial error:', error);

            if (error.code === 'not-found') {
                throw new Error('User document not found');
            }

            throw error;
        }
    }
}