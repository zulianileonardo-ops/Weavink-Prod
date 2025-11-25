// lib/services/serviceContact/server/neo4j/Neo4jSyncService.js
// Handles Firestore → Neo4j synchronization for contact graph
// Uses fire-and-forget pattern (like VectorStorageService)

import { neo4jClient } from './neo4jClient.js';
import {
  isPublicEmailDomain,
  extractEmailDomain,
  getCompanyIdentifierFromDomain,
  analyzeEmailDomain
} from '../../config/publicEmailDomains.js';

/**
 * Neo4jSyncService - Synchronizes contact data to Neo4j graph database
 *
 * Responsibilities:
 * - Sync contact CRUD operations to Neo4j
 * - Extract and create company relationships
 * - Manage tag nodes and relationships
 * - Fire-and-forget pattern (non-blocking)
 *
 * Schema:
 * - Nodes: Contact, Company, Tag
 * - Relationships: WORKS_AT, HAS_TAG
 */
class Neo4jSyncService {
  /**
   * Check if Neo4j sync is enabled
   * @returns {boolean}
   */
  static isEnabled() {
    return !!(
      process.env.NEO4J_URI &&
      process.env.NEO4J_PASSWORD &&
      process.env.ENABLE_NEO4J_SYNC !== 'false'
    );
  }

  /**
   * Sync a contact to Neo4j (create or update)
   * Fire-and-forget - does not block caller
   *
   * @param {string} userId - User ID
   * @param {object} contact - Contact data from Firestore
   */
  static async syncContact(userId, contact) {
    if (!this.isEnabled()) {
      return { success: false, reason: 'Neo4j sync disabled' };
    }

    try {
      console.log(`🔄 [Neo4jSync] Syncing contact ${contact.id} for user ${userId}`);

      // 1. Upsert the contact node
      await neo4jClient.upsertContact(userId, contact);

      // 2. Extract and create company relationship
      await this._syncCompanyRelationship(userId, contact);

      // 3. Sync tags
      await this._syncTags(userId, contact);

      console.log(`✅ [Neo4jSync] Contact ${contact.id} synced successfully`);

      return { success: true, contactId: contact.id };

    } catch (error) {
      console.error(`❌ [Neo4jSync] Error syncing contact ${contact.id}:`, error.message);
      // Fire-and-forget: don't throw, just log
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync contact (fire-and-forget wrapper)
   * Use this in CRUD operations to avoid blocking
   *
   * @param {string} userId - User ID
   * @param {object} contact - Contact data
   */
  static syncContactAsync(userId, contact) {
    // Fire and forget - don't await
    this.syncContact(userId, contact).catch(err => {
      console.error(`❌ [Neo4jSync] Async sync failed for ${contact.id}:`, err.message);
    });
  }

  /**
   * Delete a contact from Neo4j
   *
   * @param {string} userId - User ID
   * @param {string} contactId - Contact ID
   */
  static async deleteContact(userId, contactId) {
    if (!this.isEnabled()) {
      return { success: false, reason: 'Neo4j sync disabled' };
    }

    try {
      console.log(`🗑️ [Neo4jSync] Deleting contact ${contactId} for user ${userId}`);

      await neo4jClient.deleteContact(userId, contactId);

      // Clean up orphaned companies and tags
      await this._cleanupOrphanedNodes(userId);

      console.log(`✅ [Neo4jSync] Contact ${contactId} deleted successfully`);

      return { success: true, contactId };

    } catch (error) {
      console.error(`❌ [Neo4jSync] Error deleting contact ${contactId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete contact (fire-and-forget wrapper)
   *
   * @param {string} userId - User ID
   * @param {string} contactId - Contact ID
   */
  static deleteContactAsync(userId, contactId) {
    this.deleteContact(userId, contactId).catch(err => {
      console.error(`❌ [Neo4jSync] Async delete failed for ${contactId}:`, err.message);
    });
  }

  /**
   * Bulk sync all contacts for a user
   * Used for initial migration or re-sync
   *
   * @param {string} userId - User ID
   * @param {Array} contacts - Array of contact documents
   * @param {object} options - Sync options
   */
  static async bulkSync(userId, contacts, options = {}) {
    if (!this.isEnabled()) {
      return { success: false, reason: 'Neo4j sync disabled' };
    }

    const { batchSize = 50, onProgress } = options;
    const results = {
      total: contacts.length,
      synced: 0,
      failed: 0,
      errors: []
    };

    console.log(`🔄 [Neo4jSync] Starting bulk sync of ${contacts.length} contacts for user ${userId}`);

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (contact) => {
          const result = await this.syncContact(userId, contact);
          if (result.success) {
            results.synced++;
          } else {
            results.failed++;
            results.errors.push({ contactId: contact.id, error: result.error });
          }
        })
      );

      // Report progress
      if (onProgress) {
        onProgress({
          processed: Math.min(i + batchSize, contacts.length),
          total: contacts.length,
          synced: results.synced,
          failed: results.failed
        });
      }

      console.log(`📊 [Neo4jSync] Progress: ${Math.min(i + batchSize, contacts.length)}/${contacts.length}`);
    }

    console.log(`✅ [Neo4jSync] Bulk sync complete: ${results.synced} synced, ${results.failed} failed`);

    return {
      success: true,
      ...results
    };
  }

  /**
   * Extract and sync company relationship from contact
   * @private
   */
  static async _syncCompanyRelationship(userId, contact) {
    // Try to get company from contact's company field first
    let companyName = contact.company || contact.organization;
    let domain = null;
    let confidence = 1.0;

    // If no company field, try to extract from email
    if (!companyName && contact.email) {
      domain = extractEmailDomain(contact.email);

      if (domain && !isPublicEmailDomain(domain)) {
        const analysis = analyzeEmailDomain(domain);

        if (analysis.isCompanyDomain) {
          companyName = getCompanyIdentifierFromDomain(domain);
          confidence = analysis.confidence;
        }
      }
    }

    // Create company relationship if we have a company name
    if (companyName) {
      await neo4jClient.upsertCompanyRelationship(userId, contact.id, {
        name: this._formatCompanyName(companyName),
        domain: domain || this._extractDomainFromCompanyName(companyName),
        confidence
      });
    }
  }

  /**
   * Sync contact tags to Neo4j
   * @private
   */
  static async _syncTags(userId, contact) {
    const tags = contact.tags || [];

    if (tags.length === 0) {
      return;
    }

    // Create/update tags and relationships
    const cypher = `
      MATCH (c:Contact {id: $contactId, userId: $userId})
      UNWIND $tags as tagName
      MERGE (t:Tag {name: tagName, userId: $userId})
      MERGE (c)-[r:HAS_TAG]->(t)
      SET r.updatedAt = datetime()
      RETURN count(r) as tagsLinked
    `;

    await neo4jClient.write(cypher, {
      contactId: contact.id,
      userId,
      tags
    });
  }

  /**
   * Clean up orphaned Company and Tag nodes
   * @private
   */
  static async _cleanupOrphanedNodes(userId) {
    // Delete companies with no contacts
    const cleanupCompanies = `
      MATCH (co:Company {userId: $userId})
      WHERE NOT (co)<-[:WORKS_AT]-()
      DELETE co
    `;

    // Delete tags with no contacts
    const cleanupTags = `
      MATCH (t:Tag {userId: $userId})
      WHERE NOT (t)<-[:HAS_TAG]-()
      DELETE t
    `;

    await Promise.all([
      neo4jClient.write(cleanupCompanies, { userId }),
      neo4jClient.write(cleanupTags, { userId })
    ]);
  }

  /**
   * Format company name for consistency
   * @private
   */
  static _formatCompanyName(name) {
    if (!name) return '';

    // Capitalize first letter of each word
    return name
      .toLowerCase()
      .split(/[\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  /**
   * Extract domain from company name (best guess)
   * @private
   */
  static _extractDomainFromCompanyName(name) {
    if (!name) return '';

    // Simple conversion: "Acme Corp" -> "acmecorp.com"
    const cleanName = name
      .toLowerCase()
      .replace(/\s+(inc\.?|corp\.?|llc\.?|ltd\.?|co\.?)$/i, '')
      .replace(/[^a-z0-9]/g, '');

    return cleanName ? `${cleanName}.com` : '';
  }

  /**
   * Get sync statistics for a user
   *
   * @param {string} userId - User ID
   */
  static async getSyncStats(userId) {
    if (!this.isEnabled()) {
      return { enabled: false };
    }

    try {
      const stats = await neo4jClient.getGraphStats(userId);
      return {
        enabled: true,
        ...stats
      };
    } catch (error) {
      console.error(`❌ [Neo4jSync] Error getting stats:`, error.message);
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Verify Neo4j connection health
   */
  static async healthCheck() {
    if (!this.isEnabled()) {
      return { enabled: false, healthy: false, reason: 'Neo4j sync disabled' };
    }

    return neo4jClient.healthCheck();
  }
}

export default Neo4jSyncService;
