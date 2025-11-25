// lib/services/serviceContact/server/vectorStorageService.js
// Server-side service for storing and managing vectors in Pinecone
// ✅ FIXED: document → documentText typo

import { adminDb } from '@/lib/firebaseAdmin';
import { IndexManagementService } from './indexManagementService';
import { EmbeddingService } from './embeddingService';
import { DocumentBuilderService } from './documentBuilderService';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
import { SessionTrackingService } from './costTracking/sessionService';
import { API_COSTS } from '@/lib/services/constants/apiCosts';
import { CostTrackingService } from './costTrackingService';

/**
 * VectorStorageService
 *
 * Architecture:
 * - Server-side only (Pinecone operations require API key)
 * - Coordinates document building, embedding generation, and Pinecone storage
 * - Handles batch operations with rate limiting
 * - Graceful error handling (doesn't break contact operations)
 */
export class VectorStorageService {
  /**
   * Check if a subscription tier is eligible for vector storage
   * @param {string} subscriptionLevel - Subscription level to check
   * @returns {boolean} - True if eligible for vector storage
   */
  static isEligibleForVectorStorage(subscriptionLevel) {
    const eligibleTiers = ['premium', 'business', 'enterprise'];
    return eligibleTiers.includes(subscriptionLevel);
  }

  /**
   * Upsert contact vector to Pinecone
   * Orchestrates the full pipeline: document → embedding → storage
   *
   * @param {object} contact - Contact object
   * @param {string} ownerSubscriptionLevel - Owner's subscription level
   * @param {string} sessionId - Optional session ID for tracking enrichment
   * @returns {Promise<void>}
   */
  static async upsertContactVector(contact, ownerSubscriptionLevel, sessionId = null) {
    const totalStartTime = Date.now();

    try {
      // Validate input
      if (!contact?.id || !ownerSubscriptionLevel) {
        console.error(`[VECTOR] ❌ Invalid input:`, {
          hasContact: !!contact,
          hasId: !!contact?.id,
          hasSubscriptionLevel: !!ownerSubscriptionLevel
        });
        return;
      }

      console.log(`[VECTOR] 📤 Starting vector upsert for contact: ${contact.name} (${ownerSubscriptionLevel})`, {
        contactId: contact.id,
        tier: ownerSubscriptionLevel
      });

      // Check eligibility
      const eligibleTiers = ['premium', 'business', 'enterprise'];
      if (!eligibleTiers.includes(ownerSubscriptionLevel)) {
        console.log(`[VECTOR] ⏭️ Tier not eligible for vector storage: ${ownerSubscriptionLevel}`);
        return;
      }

      console.log(`[VECTOR] ✅ Tier eligible for vector storage`, {
        tier: ownerSubscriptionLevel,
        contactId: contact.id
      });

      // Step 1: Build document
      console.log(`   - Step 1: Building document...`);
      const documentText = DocumentBuilderService.buildContactDocument(contact, ownerSubscriptionLevel);

      // ✅ FIXED: Changed document → documentText
      console.log('📝 FULL DOCUMENT TO EMBED:');
      console.log('═══════════════════════════════════════');
      console.log(documentText);
      console.log('═══════════════════════════════════════');

      // Budget Pre-flight Check for Step 4: Vector Embedding
      const userId = contact.userId || contact.createdBy || contact.generatedForUser;
      const estimatedTokens = Math.ceil(documentText.length / 4); // Rough token estimate
      const estimatedCost = (estimatedTokens / 1000000) * API_COSTS.PINECONE_INFERENCE.EMBEDDING.PER_MILLION;

      console.log(`[VECTOR] 💰 Budget pre-flight check for embedding:`, {
        textLength: documentText.length,
        estimatedTokens,
        estimatedCost: estimatedCost.toFixed(6)
      });

      const budgetCheck = await CostTrackingService.canAffordGeneric(
        userId,
        'ApiUsage',
        estimatedCost,
        true  // Vector embedding counts as billable run
      );

      console.log(`[VECTOR] 💰 Budget check result:`, budgetCheck);

      if (!budgetCheck.canAfford) {
        console.warn(`[VECTOR] ⚠️ Budget exceeded for embedding - skipping vector storage`, {
          reason: budgetCheck.reason,
          remainingBudget: budgetCheck.remainingBudget
        });
        return; // Exit gracefully without embedding
      }

      // Step 2: Generate embedding (with session tracking if part of enrichment)
      console.log(`[VECTOR]    - Step 2: Generating embedding for contact ${contact.id}...`);
      const embedding = await EmbeddingService.generateEmbedding(documentText, {
        sessionId: sessionId,
        userId: userId,
        trackSteps: true,
        feature: 'contact_vector_embedding',
        stepLabel: 'Vector Embedding',
        budgetCheck: budgetCheck  // Pass budget check result
      });
      console.log(`[VECTOR]    ✅ Embedding generated (dimension: ${embedding.length})`);

      // Step 3: Get Pinecone index
      console.log(`[VECTOR]    - Step 3: Getting Pinecone index...`);
      const index = await IndexManagementService.getOrCreateIndex();
      console.log(`[VECTOR]    ✅ Pinecone index retrieved`);

      // Step 4: Prepare and upsert to Pinecone
      console.log(`   - Step 4: Upserting to Pinecone...`);

      // Validate userId (already extracted above for budget check)
      if (!userId) {
        console.error(`❌ [VectorStorage] No userId found for contact:`, {
          contactId: contact.id,
          contactName: contact.name,
          hasUserId: !!contact.userId,
          hasCreatedBy: !!contact.createdBy,
          hasGeneratedForUser: !!contact.generatedForUser,
          availableFields: Object.keys(contact)
        });
        throw new Error(`Contact ${contact.id} must have userId, createdBy, or generatedForUser field`);
      }

      const namespace = `user_${userId}`;
      console.log(`[VECTOR]    📍 Using namespace: ${namespace} for contact ${contact.id}`);

      const namespacedIndex = index.namespace(namespace);

      // Helper: Truncate text fields to Pinecone's metadata limits
      const truncateField = (value, maxLength = 500) => {
        if (!value) return value;
        const str = String(value);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
      };

      // Helper: Extract job title from details array or direct field
      const extractJobTitle = () => {
        if (contact.jobTitle) return contact.jobTitle;
        if (contact.details && Array.isArray(contact.details)) {
          const jobTitleDetail = contact.details.find(d =>
            d.label?.toLowerCase().includes('job') ||
            d.label?.toLowerCase().includes('title') ||
            d.label?.toLowerCase().includes('position')
          );
          return jobTitleDetail?.value || null;
        }
        return null;
      };

      // Helper: Extract important custom fields from details array
      const extractCustomFields = () => {
        const customFields = {};
        if (contact.details && Array.isArray(contact.details)) {
          contact.details.forEach(detail => {
            if (detail.label && detail.value) {
              // Extract specific useful fields
              const label = detail.label.toLowerCase();
              if (label.includes('linkedin')) {
                customFields.linkedin = truncateField(detail.value, 200);
              } else if (label.includes('website')) {
                customFields.website = truncateField(detail.value, 200);
              } else if (label.includes('department')) {
                customFields.department = truncateField(detail.value, 100);
              } else if (label.includes('industry')) {
                customFields.industry = truncateField(detail.value, 100);
              } else if (label.includes('specialty') || label.includes('specialization')) {
                customFields.specialty = truncateField(detail.value, 200);
              }
            }
          });
        }
        return customFields;
      };

      // Flatten dynamic fields to include them in metadata
      const dynamicMetadata = {};
      if (contact.dynamicFields && Array.isArray(contact.dynamicFields)) {
        contact.dynamicFields.forEach(field => {
          if (field.label && field.value) {
            // Create a clean key, e.g., "Company Tagline" -> "companyTagline"
            const key = field.label.replace(/\s+/g, '')
              .replace(/^(.)/, char => char.toLowerCase());
            dynamicMetadata[key] = truncateField(field.value);
          }
        });
      }

      // Extract all metadata
      const jobTitle = extractJobTitle();
      const customFields = extractCustomFields();

      // Build comprehensive metadata object
      const metadata = {
        // Core identification
        userId: userId, // Use the validated userId from above
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        company: contact.company || null,

        // Professional info
        jobTitle: jobTitle || null,

        // Status
        status: contact.status || 'new',

        // Rich content (truncated)
        notes: truncateField(contact.notes),
        message: truncateField(contact.message),
        noteLength: contact.notes ? contact.notes.length : 0,

        // 🎯 PHASE 5: AI Auto-Tagging - Store tags as comma-separated string
        tags: contact.tags && contact.tags.length > 0
          ? contact.tags.join(",")
          : null,

        // 🎯 PHASE 4: Location Services - Store location data
        city: contact.location?.city || null,
        country: contact.location?.country || null,
        venueName: contact.venue?.name || null,

        // Generated by marker (useful for admin tracking)
        generatedBy: contact.generatedBy || null,

        // Custom fields from details array
        ...customFields,

        // Dynamic fields
        ...dynamicMetadata
      };

      // Remove null/undefined values to keep metadata clean
      Object.keys(metadata).forEach(key => {
        if (metadata[key] === null || metadata[key] === undefined) {
          delete metadata[key];
        }
      });

      console.log(`   📦 Preparing metadata for Pinecone:`, {
        hasJobTitle: !!metadata.jobTitle,
        hasPhone: !!metadata.phone,
        hasNotes: !!metadata.notes,
        hasMessage: !!metadata.message,
        hasTags: !!metadata.tags,
        hasCity: !!metadata.city,
        hasCountry: !!metadata.country,
        hasVenue: !!metadata.venueName,
        customFieldsCount: Object.keys(customFields).length,
        totalMetadataFields: Object.keys(metadata).length
      });

      const upsertPayload = {
        id: contact.id,
        values: embedding,
        metadata
      };

      try {
        console.log(`[VECTOR]    - Step 4: Upserting to Pinecone namespace ${namespace}...`);
        await namespacedIndex.upsert([upsertPayload]);

        const totalDuration = Date.now() - totalStartTime;

        // Count metadata fields for logging
        const metadataFieldCount = Object.keys(metadata).length;
        const metadataFields = Object.keys(metadata).join(', ');

        console.log(`[VECTOR] ✅ Upsert complete (${totalDuration}ms):`, {
          contactId: contact.id,
          namespace,
          embeddingDimension: embedding.length,
          metadataFields: metadataFieldCount
        });

        console.log(`[VECTOR]    📋 Stored metadata fields (${metadataFieldCount}): ${metadataFields}`);

        // Finalize enrichment session if provided
        if (sessionId && contact.userId) {
          try {
            await SessionTrackingService.finalizeSession({
              userId: contact.userId || contact.createdBy || contact.generatedForUser,
              sessionId: sessionId
            });
            console.log(`[VECTOR] 🏁 Session finalized: ${sessionId}`);
          } catch (sessionError) {
            console.error('[VECTOR] Failed to finalize session:', sessionError);
          }
        }

      } catch (upsertError) {
        // Handle index not ready error gracefully
        if (upsertError.message?.includes('not ready') || upsertError.message?.includes('initializing')) {
          console.log(`[VECTOR] ⏳ Index still initializing, vector will be queued`);
          return;
        }
        throw upsertError;
      }

    } catch (error) {
      console.error(`[VECTOR] ❌ Upsert failed:`, {
        message: error.message,
        contactId: contact?.id
      });

      // For new index creation, don't treat as error
      if (error.message?.includes('not ready') || error.message?.includes('initializing')) {
        console.log(`[VECTOR] ⏳ Index initializing, operation will complete later`);
        return;
      }

      // Don't throw - vector operations should not break contact creation
      console.warn(`[VECTOR] ⚠️ Vector operation failed, but contact operation will continue`);
    }
  }

  /**
   * Delete contact vector from Pinecone
   *
   * @param {string} contactId - Contact ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async deleteContactVector(contactId, userId) {
    try {
      console.log(`🗑️ [VectorStorage] Deleting vector: ${contactId} (user: ${userId})`);

      const index = await IndexManagementService.getOrCreateIndex();
      const namespace = `user_${userId}`;
      const namespacedIndex = index.namespace(namespace);

      await namespacedIndex.deleteOne(contactId);

      console.log(`✅ [VectorStorage] Vector deleted successfully:`, {
        contactId,
        namespace
      });

    } catch (error) {
      console.error(`❌ [VectorStorage] Delete failed:`, {
        message: error.message,
        contactId
      });

      // Don't throw - vector operations should not break contact deletion
      console.warn(`⚠️ [VectorStorage] Vector deletion failed, but contact deletion will continue`);
    }
  }

  /**
   * Batch upsert contact vectors
   * Processes multiple contacts with rate limiting
   *
   * @param {Array<object>} contacts - Array of contacts
   * @param {string} subscriptionLevel - Subscription level
   * @param {object} options - Options for batch processing
   * @returns {Promise<object>} Results summary
   */
  static async batchUpsertVectors(contacts, subscriptionLevel, options = {}) {
    const {
      batchSize = SEMANTIC_SEARCH_CONFIG.BATCH_SIZE,
      delayMs = SEMANTIC_SEARCH_CONFIG.BATCH_DELAY_MS,
      onProgress = null
    } = options;

    console.log(`📦 [VectorStorage] Batch upserting ${contacts.length} contacts...`);

    let succeeded = 0;
    let failed = 0;
    const errors = [];

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(contacts.length / batchSize);

      console.log(`📦 [VectorStorage] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts)`);

      await Promise.all(
        batch.map(async (contact) => {
          try {
            await this.upsertContactVector(contact, subscriptionLevel);
            succeeded++;
          } catch (error) {
            failed++;
            errors.push({
              contactId: contact.id,
              error: error.message
            });
          }
        })
      );

      // Call progress callback
      if (onProgress) {
        onProgress({
          processed: i + batch.length,
          total: contacts.length,
          succeeded,
          failed,
          batchNumber,
          totalBatches
        });
      }

      // Delay between batches (except for last batch)
      if (i + batchSize < contacts.length) {
        console.log(`⏳ [VectorStorage] Waiting ${delayMs}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log(`✅ [VectorStorage] Batch complete:`, {
      total: contacts.length,
      succeeded,
      failed
    });

    return {
      total: contacts.length,
      succeeded,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Rebuild all vectors for a user
   * Useful when subscription changes or to refresh embeddings
   *
   * @param {string} userId - User ID
   * @param {string} newSubscriptionLevel - New subscription level
   * @returns {Promise<object>} Results summary
   */
  static async rebuildUserVectors(userId, newSubscriptionLevel) {
    const startTime = Date.now();

    console.log(`🔄 [VectorStorage] Rebuilding vectors for user: ${userId} (${newSubscriptionLevel})`);

    try {
      // Get all user's contacts from Firestore
      const contactsDoc = await adminDb.collection('Contacts').doc(userId).get();

      if (!contactsDoc.exists) {
        console.log(`⏭️ [VectorStorage] No contacts found for user: ${userId}`);
        return { rebuilt: 0, total: 0 };
      }

      const contacts = contactsDoc.data().contacts || [];
      console.log(`📊 [VectorStorage] Found ${contacts.length} contacts to rebuild`);

      // Batch upsert all contacts
      const result = await this.batchUpsertVectors(contacts, newSubscriptionLevel, {
        onProgress: (progress) => {
          console.log(`📊 [VectorStorage] Progress: ${progress.processed}/${progress.total} (${progress.succeeded} succeeded, ${progress.failed} failed)`);
        }
      });

      const totalDuration = Date.now() - startTime;
      console.log(`✅ [VectorStorage] Rebuild complete in ${totalDuration}ms:`, result);

      return {
        rebuilt: result.succeeded,
        total: result.total,
        failed: result.failed,
        duration: totalDuration
      };

    } catch (error) {
      console.error(`❌ [VectorStorage] Rebuild failed:`, {
        message: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Anonymize vector metadata for deleted user contact
   * Preserves semantic search functionality while removing PII
   *
   * Called when User A deletes their account - anonymizes their contact
   * data in User B's Pinecone vectors while keeping the embedding intact.
   *
   * GDPR Article 17 (Right to be Forgotten) compliance:
   * - Removes all PII from vector metadata
   * - Keeps business context (company, jobTitle, department)
   * - Preserves vector embeddings for semantic search
   *
   * @param {string} userId - User B's ID (contact list owner)
   * @param {string} contactId - Contact ID to anonymize
   * @param {object} anonymizedContact - Anonymized contact object from ContactAnonymizationService
   * @returns {Promise<void>}
   */
  static async anonymizeVectorMetadata(userId, contactId, anonymizedContact) {
    try {
      console.log(`[ANONYMIZATION] Anonymizing vector metadata: ${userId}_${contactId}`);

      // Get Pinecone index and namespace
      const index = await IndexManagementService.getOrCreateIndex();
      const namespace = `user_${userId}`;
      const namespacedIndex = index.namespace(namespace);

      const vectorId = contactId;  // Just contactId, namespace already includes userId

      // Fetch existing vector
      const fetchResponse = await namespacedIndex.fetch([vectorId]);
      const existingVector = fetchResponse.vectors?.[vectorId];

      if (!existingVector) {
        console.warn(`[ANONYMIZATION] Vector not found: ${vectorId} (may not exist or already deleted)`);
        return; // Graceful exit - vector doesn't exist
      }

      // Build anonymized metadata (only non-PII fields)
      const anonymizedMetadata = {
        userId: userId,
        contactId: contactId,

        // Anonymized placeholder
        name: "[Contact Deleted]",

        // Business context (preserved)
        company: anonymizedContact.company || "",
        jobTitle: anonymizedContact.jobTitle || "",

        // Dynamic fields (only non-PII)
        department: anonymizedContact.dynamicFields?.department || "",
        industry: anonymizedContact.dynamicFields?.industry || "",
        specialty: anonymizedContact.dynamicFields?.specialty || "",
        businessCategory: anonymizedContact.dynamicFields?.businessCategory || "",

        // User B's data (preserved)
        notes: anonymizedContact.notes
          ? anonymizedContact.notes.substring(0, 500)  // Truncate for Pinecone metadata limits
          : "",
        tags: anonymizedContact.tags
          ? anonymizedContact.tags.join(",")
          : "",

        // Anonymization tracking
        timestamp: Date.now(),
        isAnonymized: true,
        anonymizedDate: new Date().toISOString().split('T')[0]

        // All PII fields OMITTED:
        // - email, phone, phoneNumbers, linkedin, twitter, facebook
        // - website, message, personalEmail, officePhone, etc.
        // - GPS coordinates, IP address, userAgent, etc.
      };

      // Upsert vector with same embeddings but anonymized metadata
      await namespacedIndex.upsert([{
        id: vectorId,
        values: existingVector.values,  // KEEP ORIGINAL VECTOR EMBEDDINGS
        metadata: anonymizedMetadata     // ANONYMIZED METADATA ONLY
      }]);

      console.log(`[ANONYMIZATION] ✅ Vector metadata anonymized: ${vectorId}`);

    } catch (error) {
      console.error(`[ANONYMIZATION] ❌ Error anonymizing vector metadata:`, {
        message: error.message,
        userId,
        contactId
      });
      // Don't throw - vector anonymization failure shouldn't block account deletion
    }
  }
}