// lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService.js
// Discovers relationships between contacts using multiple methods
// Integrates Neo4j graph with Pinecone semantic similarity
// Implements tiered confidence system for relationship review

import { neo4jClient } from './neo4jClient.js';
import Neo4jSyncService from './Neo4jSyncService.js';
import { IndexManagementService } from '../indexManagementService.js';
import {
  isPublicEmailDomain,
  extractEmailDomain,
  getCompanyIdentifierFromDomain,
  analyzeEmailDomain
} from '../../config/publicEmailDomains.js';
import {
  RELATIONSHIP_CONFIDENCE_TIERS,
  RELATIONSHIP_DISCOVERY_THRESHOLDS,
  getSemanticConfidenceTier,
  getTagConfidenceTier
} from '../../client/constants/contactConstants.js';

/**
 * RelationshipDiscoveryService - Discovers and creates relationships in Neo4j
 *
 * Discovery Methods:
 * 1. Company Detection - Same email domain or company field
 * 2. Semantic Similarity - Pinecone vector similarity
 * 3. Tag Overlap - Contacts with similar tags
 * 4. Social Proximity - Same event/location (future)
 *
 * Tiered Confidence System:
 * - HIGH: Auto-saved to Neo4j (score >= 0.60 or 4+ shared tags)
 * - MEDIUM: Shown for review with optional LLM assessment (0.35-0.59 or 3 tags)
 * - LOW: Shown as potential, not auto-saved (0.20-0.34 or 2 tags)
 */
class RelationshipDiscoveryService {
  // Use constants from contactConstants.js
  static CONFIDENCE_THRESHOLDS = RELATIONSHIP_DISCOVERY_THRESHOLDS;

  // Legacy thresholds (kept for backwards compatibility)
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
      errors: [],
      // Tiered relationship results
      relationships: {
        high: [],    // Auto-saved to Neo4j
        medium: [],  // Pending user review
        low: []      // Potential relationships
      },
      counts: {
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      }
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

        // Merge tiered semantic relationships into results
        if (similarityResult.relationships) {
          results.relationships.high.push(...similarityResult.relationships.high);
          results.relationships.medium.push(...similarityResult.relationships.medium);
          results.relationships.low.push(...similarityResult.relationships.low);
        }

        onProgress?.(90, `Found ${similarityResult.relationshipsCreated} semantic relationships (${similarityResult.relationships?.high?.length || 0} high confidence)`);
      } else {
        onProgress?.(90, 'Skipping semantic analysis');
      }

      // Step 4: Discover tag-based relationships (90-100%)
      console.log('🏷️ [RelationshipDiscovery] Step 4: Discovering tag relationships...');
      onProgress?.(92, 'Discovering tag relationships...');
      const tagResult = await this.discoverTagRelationships(userId, contacts);
      results.tagRelationships = tagResult.relationshipsCreated;

      // Merge tiered tag relationships into results
      if (tagResult.relationships) {
        results.relationships.high.push(...tagResult.relationships.high);
        results.relationships.medium.push(...tagResult.relationships.medium);
        results.relationships.low.push(...tagResult.relationships.low);
      }

      results.duration = Date.now() - startTime;

      // Compute tier counts
      results.counts.high = results.relationships.high.length;
      results.counts.medium = results.relationships.medium.length;
      results.counts.low = results.relationships.low.length;
      results.counts.total = results.counts.high + results.counts.medium + results.counts.low;

      console.log(`✅ [RelationshipDiscovery] Discovery complete in ${results.duration}ms`);
      console.log(`   📊 Tiers: ${results.counts.high} high, ${results.counts.medium} medium, ${results.counts.low} low`);
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
   * Classifies relationships into HIGH/MEDIUM/LOW confidence tiers
   * Only HIGH confidence relationships are auto-saved to Neo4j
   *
   * @param {string} userId - User ID
   * @param {Array} contacts - Contacts array
   * @param {object} options - Options including topK, onSemanticProgress
   * @returns {object} Discovery results with tiered relationships
   */
  static async discoverSemanticSimilarity(userId, contacts, options = {}) {
    const {
      topK = 10,                   // Max similar contacts per contact (increased for more discovery)
      onSemanticProgress           // Progress callback (processed, total, relationships)
    } = options;

    const thresholds = this.CONFIDENCE_THRESHOLDS.semantic;
    console.log(`   🔍 Querying Pinecone for semantic similarity (thresholds: high=${thresholds.high}, medium=${thresholds.medium}, low=${thresholds.low})`);

    // Tiered relationship containers
    const relationships = {
      high: [],
      medium: [],
      low: []
    };

    let relationshipsCreated = 0; // Count of HIGH confidence (auto-saved)
    let contactsProcessed = 0;
    let contactsSkipped = 0;
    const processedPairs = new Set();

    // Build a contact name map for quick lookup
    const contactNameMap = new Map();
    for (const c of contacts) {
      contactNameMap.set(c.id, c.name || c.email || 'Unknown');
    }

    try {
      // Get the namespaced Pinecone index for this user
      const index = await IndexManagementService.getNamespacedIndex(userId);

      // Process contacts
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

          // Step 3: Classify matches into confidence tiers
          for (const match of queryResults.matches || []) {
            // Skip self-match
            if (match.id === contact.id) continue;

            // Get confidence tier (returns null if below minimum threshold)
            const tier = getSemanticConfidenceTier(match.score);
            if (!tier) continue; // Below minimum threshold (< 0.20)

            // Avoid duplicate pairs (A->B and B->A)
            const pairKey = [contact.id, match.id].sort().join('|');
            if (processedPairs.has(pairKey)) continue;
            processedPairs.add(pairKey);

            // Build relationship object
            const relationship = {
              sourceId: contact.id,
              sourceName: contactNameMap.get(contact.id) || 'Unknown',
              targetId: match.id,
              targetName: match.metadata?.name || contactNameMap.get(match.id) || 'Unknown',
              type: 'SIMILAR_TO',
              method: 'pinecone_embedding',
              score: match.score,
              confidence: tier,
              savedToNeo4j: false,
              llmAssessment: null
            };

            // Only auto-save HIGH confidence relationships
            if (tier === RELATIONSHIP_CONFIDENCE_TIERS.HIGH) {
              await neo4jClient.createSimilarityRelationship(
                userId,
                contact.id,
                match.id,
                match.score,
                'pinecone_embedding'
              );
              relationship.savedToNeo4j = true;
              relationshipsCreated++;
            }

            // Add to appropriate tier
            relationships[tier].push(relationship);
          }

          contactsProcessed++;

          // Report progress every contact for smooth UI updates
          const totalRelationships = relationships.high.length + relationships.medium.length + relationships.low.length;
          onSemanticProgress?.(contactsProcessed, contacts.length, totalRelationships);

          // Console logging every 10 contacts
          if (contactsProcessed % 10 === 0) {
            console.log(`   📊 Processed ${contactsProcessed}/${contacts.length} contacts, ${totalRelationships} relationships found (${relationshipsCreated} high)`);
          }

        } catch (contactError) {
          // Log but continue processing other contacts
          console.warn(`   ⚠️ Error processing contact ${contact.id}:`, contactError.message);
          contactsSkipped++;
        }
      }

      console.log(`   ✅ Semantic similarity complete:`);
      console.log(`      - HIGH: ${relationships.high.length} (auto-saved)`);
      console.log(`      - MEDIUM: ${relationships.medium.length} (pending review)`);
      console.log(`      - LOW: ${relationships.low.length} (potential)`);
      console.log(`      - Contacts: ${contactsProcessed} processed, ${contactsSkipped} skipped`);

      return {
        relationshipsCreated,  // Only HIGH confidence count
        contactsProcessed,
        contactsSkipped,
        uniquePairs: processedPairs.size,
        relationships  // Tiered structure
      };

    } catch (error) {
      console.error(`   ❌ Semantic similarity discovery failed:`, error.message);
      return {
        relationshipsCreated: 0,
        relationships: { high: [], medium: [], low: [] },
        error: error.message
      };
    }
  }

  /**
   * Discover relationships based on tag overlap
   * Classifies into HIGH/MEDIUM/LOW tiers based on shared tag count
   * Only HIGH confidence (4+ tags) is auto-saved to Neo4j
   *
   * @param {string} userId - User ID
   * @param {Array} contacts - Contacts array (for name lookup)
   */
  static async discoverTagRelationships(userId, contacts = []) {
    const thresholds = this.CONFIDENCE_THRESHOLDS.tags;
    console.log(`   🏷️ Finding tag relationships (thresholds: high=${thresholds.high}, medium=${thresholds.medium}, low=${thresholds.low})`);

    // Build contact name map
    const contactNameMap = new Map();
    for (const c of contacts) {
      contactNameMap.set(c.id, c.name || c.email || 'Unknown');
    }

    // Tiered relationship containers
    const relationships = {
      high: [],
      medium: [],
      low: []
    };

    let relationshipsCreated = 0;

    try {
      // Step 1: Find ALL tag overlaps (minimum 2 shared tags)
      const findCypher = `
        MATCH (c1:Contact {userId: $userId})-[:HAS_TAG]->(t:Tag)<-[:HAS_TAG]-(c2:Contact {userId: $userId})
        WHERE c1.id < c2.id
        WITH c1, c2, count(t) as sharedTags, collect(t.name) as tags
        WHERE sharedTags >= $minThreshold
        RETURN c1.id as sourceId, c1.name as sourceName,
               c2.id as targetId, c2.name as targetName,
               sharedTags, tags
      `;

      const result = await neo4jClient.read(findCypher, {
        userId,
        minThreshold: thresholds.low  // Get all from low threshold up
      });

      // Step 2: Classify each pair into tiers
      for (const record of result) {
        const sharedTags = typeof record.sharedTags === 'object' && 'low' in record.sharedTags
          ? record.sharedTags.low
          : Number(record.sharedTags);

        const tier = getTagConfidenceTier(sharedTags);
        if (!tier) continue;

        const relationship = {
          sourceId: record.sourceId,
          sourceName: record.sourceName || contactNameMap.get(record.sourceId) || 'Unknown',
          targetId: record.targetId,
          targetName: record.targetName || contactNameMap.get(record.targetId) || 'Unknown',
          type: 'SIMILAR_TO',
          method: 'tags',
          score: sharedTags / 10.0,
          sharedTags: record.tags,
          sharedTagCount: sharedTags,
          confidence: tier,
          savedToNeo4j: false,
          llmAssessment: null
        };

        // Only auto-save HIGH confidence
        if (tier === RELATIONSHIP_CONFIDENCE_TIERS.HIGH) {
          await neo4jClient.write(`
            MATCH (c1:Contact {id: $sourceId, userId: $userId})
            MATCH (c2:Contact {id: $targetId, userId: $userId})
            MERGE (c1)-[r:SIMILAR_TO]-(c2)
            SET r.score = $score,
                r.method = 'tags',
                r.sharedTags = $sharedTags,
                r.confidence = 'high',
                r.reviewStatus = 'auto_approved',
                r.updatedAt = datetime()
          `, {
            sourceId: record.sourceId,
            targetId: record.targetId,
            userId,
            score: sharedTags / 10.0,
            sharedTags: record.tags
          });

          relationship.savedToNeo4j = true;
          relationshipsCreated++;
        }

        relationships[tier].push(relationship);
      }

      console.log(`   ✅ Tag relationships complete:`);
      console.log(`      - HIGH: ${relationships.high.length} (auto-saved)`);
      console.log(`      - MEDIUM: ${relationships.medium.length} (pending review)`);
      console.log(`      - LOW: ${relationships.low.length} (potential)`);

      return {
        relationshipsCreated,
        relationships
      };

    } catch (error) {
      console.error(`   ❌ Tag relationship discovery failed:`, error.message);
      return {
        relationshipsCreated: 0,
        relationships: { high: [], medium: [], low: [] },
        error: error.message
      };
    }
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

  /**
   * Generate LLM assessment for a medium-confidence relationship
   * Uses Gemini Flash to explain WHY these contacts might be related
   *
   * @param {object} source - Source contact
   * @param {object} target - Target contact
   * @param {object} relationship - Relationship data with score/method
   * @returns {Promise<object>} Assessment with explanation
   */
  static async assessMediumConfidenceRelationship(source, target, relationship) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const prompt = `Analyze why these two professional contacts might be related.

SOURCE CONTACT:
- Name: ${source.name || 'Unknown'}
- Company: ${source.company || source.organization || 'Unknown'}
- Job Title: ${source.jobTitle || source.title || 'Unknown'}
- Tags: ${(source.tags || []).slice(0, 10).join(', ') || 'None'}
- Notes: ${(source.notes || '').slice(0, 300) || 'None'}

TARGET CONTACT:
- Name: ${target.name || 'Unknown'}
- Company: ${target.company || target.organization || 'Unknown'}
- Job Title: ${target.jobTitle || target.title || 'Unknown'}
- Tags: ${(target.tags || []).slice(0, 10).join(', ') || 'None'}
- Notes: ${(target.notes || '').slice(0, 300) || 'None'}

RELATIONSHIP CONTEXT:
- Discovery Method: ${relationship.method === 'pinecone_embedding' ? 'Semantic similarity (AI-detected similar profiles)' : relationship.method === 'tags' ? `Shared tags: ${relationship.sharedTags?.join(', ') || 'N/A'}` : relationship.method}
- Similarity Score: ${(relationship.score * 100).toFixed(1)}%

Provide a brief (2-3 sentence) explanation of why these contacts might be professionally related, and rate your confidence that this is a meaningful connection (1-10).

Respond ONLY with valid JSON in this exact format:
{
  "explanation": "Brief explanation of the connection",
  "connectionType": "colleague|industry|interest|geography|event|other",
  "confidence": 7,
  "suggestedAction": "approve|review|skip"
}`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const assessment = JSON.parse(jsonMatch[0]);
        console.log(`   🤖 LLM Assessment for ${source.name} <-> ${target.name}: confidence=${assessment.confidence}, action=${assessment.suggestedAction}`);
        return assessment;
      }

      // Fallback if JSON parsing fails
      return {
        explanation: text.slice(0, 200),
        connectionType: 'unknown',
        confidence: 5,
        suggestedAction: 'review'
      };

    } catch (error) {
      console.error(`   ❌ LLM assessment failed:`, error.message);
      return {
        explanation: 'Unable to generate assessment',
        connectionType: 'unknown',
        confidence: 5,
        suggestedAction: 'review',
        error: error.message
      };
    }
  }
}

export default RelationshipDiscoveryService;
