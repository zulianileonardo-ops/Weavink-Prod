// lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService.js
// Discovers relationships between contacts using multiple methods
// Integrates Neo4j graph with Pinecone semantic similarity

import { neo4jClient } from './neo4jClient.js';
import Neo4jSyncService from './Neo4jSyncService.js';
import { IndexManagementService } from '../indexManagementService.js';
import {
  isPublicEmailDomain,
  extractEmailDomain,
  getCompanyIdentifierFromDomain,
  analyzeEmailDomain
} from '../../config/publicEmailDomains.js';

/**
 * RelationshipDiscoveryService - Discovers and creates relationships in Neo4j
 *
 * Discovery Methods:
 * 1. Company Detection - Same email domain or company field
 * 2. Semantic Similarity - Pinecone vector similarity
 * 3. Tag Overlap - Contacts with similar tags
 * 4. Social Proximity - Same event/location (future)
 */
class RelationshipDiscoveryService {
  // Thresholds
  static SIMILARITY_THRESHOLD = 0.75; // Minimum score for SIMILAR_TO relationship
  static TAG_OVERLAP_THRESHOLD = 2;   // Minimum shared tags for connection
  static MAX_SIMILAR_CONTACTS = 10;   // Max similar contacts per contact

  /**
   * Discover all relationships for a user
   * Master orchestration method
   *
   * @param {string} userId - User ID
   * @param {Array} contacts - User's contacts from Firestore
   * @param {object} options - Discovery options
   * @param {function} options.onProgress - Progress callback (progress: 0-100, step: string)
   * @returns {object} Discovery results
   */
  static async discoverAllRelationships(userId, contacts, options = {}) {
    const { onProgress } = options;

    if (!Neo4jSyncService.isEnabled()) {
      return { success: false, reason: 'Neo4j sync disabled' };
    }

    console.log(`🔍 [RelationshipDiscovery] Starting discovery for user ${userId} with ${contacts.length} contacts`);
    onProgress?.(0, 'Starting discovery...');

    const results = {
      userId,
      totalContacts: contacts.length,
      companiesFound: 0,
      similarityRelationships: 0,
      tagRelationships: 0,
      duration: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      // Step 1: Sync all contacts to Neo4j first (0-30%)
      console.log('📤 [RelationshipDiscovery] Step 1: Syncing contacts to Neo4j...');
      onProgress?.(5, 'Syncing contacts to Neo4j...');

      const syncResult = await Neo4jSyncService.bulkSync(userId, contacts, {
        batchSize: 50,
        onProgress: (p) => {
          const pct = 5 + (p.processed / p.total) * 25;
          onProgress?.(pct, `Syncing contacts: ${p.processed}/${p.total}`);
          console.log(`   Progress: ${p.processed}/${p.total}`);
        }
      });

      if (!syncResult.success) {
        throw new Error('Failed to sync contacts to Neo4j');
      }

      // Step 2: Discover company relationships (30-40%)
      console.log('🏢 [RelationshipDiscovery] Step 2: Discovering company relationships...');
      onProgress?.(32, 'Discovering company relationships...');
      const companyResult = await this.discoverCompanyRelationships(userId, contacts);
      results.companiesFound = companyResult.companiesFound;
      onProgress?.(40, `Found ${companyResult.companiesFound} companies`);

      // Step 3: Discover semantic similarity (40-90%)
      if (options.includeSemantic !== false) {
        console.log('🧠 [RelationshipDiscovery] Step 3: Discovering semantic similarity...');
        onProgress?.(42, 'Analyzing semantic similarity...');

        const similarityResult = await this.discoverSemanticSimilarity(userId, contacts, {
          ...options,
          onSemanticProgress: (processed, total, relationships) => {
            const pct = 42 + (processed / total) * 48;
            onProgress?.(pct, `Semantic analysis: ${processed}/${total} contacts (${relationships} relationships)`);
          }
        });
        results.similarityRelationships = similarityResult.relationshipsCreated;
        onProgress?.(90, `Found ${similarityResult.relationshipsCreated} semantic relationships`);
      } else {
        onProgress?.(90, 'Skipping semantic analysis');
      }

      // Step 4: Discover tag-based relationships (90-100%)
      console.log('🏷️ [RelationshipDiscovery] Step 4: Discovering tag relationships...');
      onProgress?.(92, 'Discovering tag relationships...');
      const tagResult = await this.discoverTagRelationships(userId);
      results.tagRelationships = tagResult.relationshipsCreated;

      results.duration = Date.now() - startTime;
      console.log(`✅ [RelationshipDiscovery] Discovery complete in ${results.duration}ms`);
      onProgress?.(100, 'Discovery complete!');

      return {
        success: true,
        ...results
      };

    } catch (error) {
      console.error(`❌ [RelationshipDiscovery] Error:`, error.message);
      results.errors.push(error.message);
      results.duration = Date.now() - startTime;
      onProgress?.(results.progress || 0, `Error: ${error.message}`);
      return {
        success: false,
        ...results
      };
    }
  }

  /**
   * Discover company relationships from email domains and company fields
   *
   * @param {string} userId - User ID
   * @param {Array} contacts - Contacts array
   */
  static async discoverCompanyRelationships(userId, contacts) {
    const companiesMap = new Map(); // companyName -> [contactIds]

    for (const contact of contacts) {
      let companyName = null;

      // Priority 1: Explicit company field
      if (contact.company || contact.organization) {
        companyName = (contact.company || contact.organization).toLowerCase().trim();
      }
      // Priority 2: Extract from email domain
      else if (contact.email) {
        const domain = extractEmailDomain(contact.email);
        if (domain && !isPublicEmailDomain(domain)) {
          const analysis = analyzeEmailDomain(domain);
          if (analysis.isCompanyDomain) {
            companyName = getCompanyIdentifierFromDomain(domain);
          }
        }
      }

      if (companyName) {
        if (!companiesMap.has(companyName)) {
          companiesMap.set(companyName, []);
        }
        companiesMap.get(companyName).push(contact.id);
      }
    }

    // Companies with 2+ contacts are interesting
    let companiesFound = 0;
    for (const [company, contactIds] of companiesMap) {
      if (contactIds.length >= 2) {
        companiesFound++;
        console.log(`   🏢 ${company}: ${contactIds.length} contacts`);
      }
    }

    return { companiesFound, companiesMap };
  }

  /**
   * Discover semantic similarity using Pinecone vector search
   * Queries Pinecone for similar contacts and creates SIMILAR_TO edges in Neo4j
   *
   * @param {string} userId - User ID
   * @param {Array} contacts - Contacts array
   * @param {object} options - Options including similarityThreshold, topK, onSemanticProgress
   * @returns {object} Discovery results with relationshipsCreated count
   */
  static async discoverSemanticSimilarity(userId, contacts, options = {}) {
    const {
      similarityThreshold = 0.25,  // Lower threshold for vector similarity (cosine)
      topK = 5,                    // Max similar contacts per contact
      onSemanticProgress           // Progress callback (processed, total, relationships)
    } = options;

    console.log(`   🔍 Querying Pinecone for semantic similarity (threshold: ${similarityThreshold}, topK: ${topK})`);

    let relationshipsCreated = 0;
    let contactsProcessed = 0;
    let contactsSkipped = 0;
    const processedPairs = new Set();

    try {
      // Get the namespaced Pinecone index for this user
      const index = await IndexManagementService.getNamespacedIndex(userId);

      // Process contacts in batches to avoid overwhelming Pinecone
      for (const contact of contacts) {
        try {
          // Step 1: Fetch this contact's embedding vector
          const vectorResponse = await index.fetch([contact.id]);
          const contactVector = vectorResponse.records?.[contact.id];

          if (!contactVector || !contactVector.values) {
            contactsSkipped++;
            continue;
          }

          // Step 2: Query for similar vectors
          const queryResults = await index.query({
            vector: contactVector.values,
            topK: topK + 1,  // +1 to account for self-match
            includeMetadata: true,
            includeValues: false
          });

          // Step 3: Create SIMILAR_TO edges for matches above threshold
          for (const match of queryResults.matches || []) {
            // Skip self-match
            if (match.id === contact.id) continue;

            // Skip if below threshold
            if (match.score < similarityThreshold) continue;

            // Avoid duplicate pairs (A->B and B->A)
            const pairKey = [contact.id, match.id].sort().join('|');
            if (processedPairs.has(pairKey)) continue;
            processedPairs.add(pairKey);

            // Create relationship in Neo4j
            await neo4jClient.createSimilarityRelationship(
              userId,
              contact.id,
              match.id,
              match.score,
              'pinecone_embedding'
            );

            relationshipsCreated++;
          }

          contactsProcessed++;

          // Report progress every contact for smooth UI updates
          onSemanticProgress?.(contactsProcessed, contacts.length, relationshipsCreated);

          // Console logging every 10 contacts
          if (contactsProcessed % 10 === 0) {
            console.log(`   📊 Processed ${contactsProcessed}/${contacts.length} contacts, ${relationshipsCreated} relationships found`);
          }

        } catch (contactError) {
          // Log but continue processing other contacts
          console.warn(`   ⚠️ Error processing contact ${contact.id}:`, contactError.message);
          contactsSkipped++;
        }
      }

      console.log(`   ✅ Semantic similarity complete: ${relationshipsCreated} relationships from ${contactsProcessed} contacts (${contactsSkipped} skipped)`);

      return {
        relationshipsCreated,
        contactsProcessed,
        contactsSkipped,
        uniquePairs: processedPairs.size
      };

    } catch (error) {
      console.error(`   ❌ Semantic similarity discovery failed:`, error.message);
      return {
        relationshipsCreated: 0,
        error: error.message
      };
    }
  }

  /**
   * Discover relationships based on tag overlap
   *
   * @param {string} userId - User ID
   */
  static async discoverTagRelationships(userId) {
    // Find contacts with overlapping tags using Neo4j
    const cypher = `
      MATCH (c1:Contact {userId: $userId})-[:HAS_TAG]->(t:Tag)<-[:HAS_TAG]-(c2:Contact {userId: $userId})
      WHERE c1.id < c2.id
      WITH c1, c2, count(t) as sharedTags, collect(t.name) as tags
      WHERE sharedTags >= $threshold
      MERGE (c1)-[r:SIMILAR_TO]-(c2)
      SET r.score = toFloat(sharedTags) / 10.0,
          r.method = 'tags',
          r.sharedTags = tags,
          r.updatedAt = datetime()
      RETURN count(r) as created
    `;

    const result = await neo4jClient.write(cypher, {
      userId,
      threshold: this.TAG_OVERLAP_THRESHOLD
    });

    const created = result.records[0]?.created || 0;
    console.log(`   Created ${created} tag-based relationships`);

    return { relationshipsCreated: created };
  }

  /**
   * Get suggested groups based on discovered relationships
   *
   * @param {string} userId - User ID
   * @param {object} options - Options
   */
  static async getSuggestedGroups(userId, options = {}) {
    const suggestions = [];

    // 1. Company-based groups
    const companyClusters = await neo4jClient.findCompanyClusters(userId);
    for (const cluster of companyClusters) {
      if (cluster.memberCount >= 2) {
        suggestions.push({
          type: 'company',
          name: `${cluster.company} Team`,
          reason: `${cluster.memberCount} contacts work at ${cluster.company}`,
          members: cluster.members,
          confidence: 0.9
        });
      }
    }

    // 2. Similarity-based groups
    const similarityClusters = await neo4jClient.findSimilarityClusters(
      userId,
      options.minSimilarity || this.SIMILARITY_THRESHOLD
    );

    // Group highly connected contacts
    const processedContacts = new Set();
    for (const cluster of similarityClusters) {
      if (processedContacts.has(cluster.contactId)) continue;

      const members = [
        { id: cluster.contactId, name: cluster.contactName },
        ...cluster.similarContacts
      ];

      if (members.length >= 3) {
        suggestions.push({
          type: 'semantic',
          name: 'Similar Contacts',
          reason: `${members.length} contacts with similar profiles`,
          members: members.slice(0, 10), // Limit to 10
          confidence: 0.7
        });

        members.forEach(m => processedContacts.add(m.id));
      }
    }

    return suggestions;
  }

  /**
   * Get graph data for visualization
   *
   * @param {string} userId - User ID
   * @param {object} options - Filter options
   */
  static async getGraphData(userId, options = {}) {
    const graphData = await neo4jClient.getContactGraph(userId);

    // Apply filters if specified
    if (options.nodeTypes) {
      graphData.nodes = graphData.nodes.filter(n =>
        options.nodeTypes.includes(n.type)
      );
    }

    if (options.relationshipTypes) {
      graphData.edges = graphData.edges.filter(e =>
        options.relationshipTypes.includes(e.type)
      );
    }

    // Add styling hints for visualization
    graphData.nodes = graphData.nodes.map(node => ({
      ...node,
      color: this._getNodeColor(node.type),
      size: this._getNodeSize(node.type)
    }));

    graphData.edges = graphData.edges.map(edge => ({
      ...edge,
      color: this._getEdgeColor(edge.type),
      width: edge.score ? edge.score * 3 : 1
    }));

    return graphData;
  }

  /**
   * Get node color based on type
   * @private
   */
  static _getNodeColor(type) {
    const colors = {
      Contact: '#8B5CF6',  // Purple
      Company: '#3B82F6',  // Blue
      Event: '#10B981',    // Green
      Location: '#F59E0B', // Orange
      Tag: '#EC4899'       // Pink
    };
    return colors[type] || '#6B7280'; // Gray default
  }

  /**
   * Get node size based on type
   * @private
   */
  static _getNodeSize(type) {
    const sizes = {
      Contact: 8,
      Company: 12,
      Event: 10,
      Location: 10,
      Tag: 6
    };
    return sizes[type] || 8;
  }

  /**
   * Get edge color based on relationship type
   * @private
   */
  static _getEdgeColor(type) {
    const colors = {
      WORKS_AT: '#3B82F6',    // Blue
      ATTENDED: '#10B981',    // Green
      SIMILAR_TO: '#8B5CF6',  // Purple
      KNOWS: '#EC4899',       // Pink
      HAS_TAG: '#F59E0B',     // Orange
      LOCATED_AT: '#F97316'   // Deep orange
    };
    return colors[type] || '#9CA3AF'; // Gray default
  }

  /**
   * Get discovery statistics
   *
   * @param {string} userId - User ID
   */
  static async getDiscoveryStats(userId) {
    const graphStats = await neo4jClient.getGraphStats(userId);

    // Get relationship counts by type
    const relationshipStats = await neo4jClient.read(`
      MATCH (c:Contact {userId: $userId})-[r]-()
      RETURN type(r) as relType, count(r) as count
      ORDER BY count DESC
    `, { userId });

    return {
      ...graphStats,
      relationships: relationshipStats.reduce((acc, r) => {
        acc[r.relType] = r.count;
        return acc;
      }, {})
    };
  }
}

export default RelationshipDiscoveryService;
