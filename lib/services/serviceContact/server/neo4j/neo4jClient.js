// lib/services/serviceContact/server/neo4j/neo4jClient.js
// Neo4j client for intelligent group relationship graph
// Provides connection management and helper methods for Cypher queries

import neo4j from 'neo4j-driver';

/**
 * Neo4jClient - Singleton Neo4j connection manager
 *
 * Features:
 * - Automatic reconnection
 * - Session management
 * - Error handling
 * - Helper methods for common graph operations
 *
 * Graph Schema:
 * - Nodes: Contact, Company, Event, Location, Tag
 * - Relationships: WORKS_AT, ATTENDS, LOCATED_AT, HAS_TAG, SIMILAR_TO, KNOWS, MATCHED_AT
 */
class Neo4jClient {
  constructor() {
    this.driver = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Initialize and connect to Neo4j AuraDB
   */
  async connect() {
    if (this.isConnected && this.driver) {
      console.log('✅ [Neo4j] Already connected');
      return this.driver;
    }

    if (this.isConnecting) {
      console.log('⏳ [Neo4j] Connection in progress, waiting...');
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.driver;
    }

    try {
      this.isConnecting = true;
      console.log('🔌 [Neo4j] Connecting to Neo4j AuraDB...');

      const uri = process.env.NEO4J_URI;
      const username = process.env.NEO4J_USERNAME || 'neo4j';
      const password = process.env.NEO4J_PASSWORD;

      if (!uri || !password) {
        throw new Error('NEO4J_URI and NEO4J_PASSWORD environment variables are required');
      }

      this.driver = neo4j.driver(
        uri,
        neo4j.auth.basic(username, password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 30000, // 30 seconds
          connectionTimeout: 20000, // 20 seconds
          maxTransactionRetryTime: 30000, // 30 seconds
          logging: {
            level: 'warn',
            logger: (level, message) => {
              if (level === 'error') {
                console.error(`❌ [Neo4j] ${message}`);
              } else if (level === 'warn') {
                console.warn(`⚠️ [Neo4j] ${message}`);
              }
            }
          }
        }
      );

      // Verify connectivity
      const serverInfo = await this.driver.getServerInfo();

      this.isConnected = true;
      this.isConnecting = false;

      console.log(`✅ [Neo4j] Successfully connected to ${serverInfo.address}`);
      console.log(`   Protocol version: ${serverInfo.protocolVersion}`);

      return this.driver;

    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      console.error('❌ [Neo4j] Connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get Neo4j driver (connect if not connected)
   */
  async getDriver() {
    if (!this.isConnected || !this.driver) {
      await this.connect();
    }
    return this.driver;
  }

  /**
   * Get a new session for read operations
   * @param {string} database - Database name (default: 'neo4j')
   */
  async getReadSession(database = 'neo4j') {
    const driver = await this.getDriver();
    return driver.session({
      database,
      defaultAccessMode: neo4j.session.READ
    });
  }

  /**
   * Get a new session for write operations
   * @param {string} database - Database name (default: 'neo4j')
   */
  async getWriteSession(database = 'neo4j') {
    const driver = await this.getDriver();
    return driver.session({
      database,
      defaultAccessMode: neo4j.session.WRITE
    });
  }

  /**
   * Execute a read query
   * @param {string} cypher - Cypher query string
   * @param {object} params - Query parameters
   * @returns {Array} Array of records
   */
  async read(cypher, params = {}) {
    const session = await this.getReadSession();
    try {
      const result = await session.run(cypher, params);
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('❌ [Neo4j] Read query error:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query
   * @param {string} cypher - Cypher query string
   * @param {object} params - Query parameters
   * @returns {object} Query result summary
   */
  async write(cypher, params = {}) {
    const session = await this.getWriteSession();
    try {
      const result = await session.run(cypher, params);
      // neo4j-driver v5+ uses properties instead of methods for counters
      const counters = result.summary.counters._stats || result.summary.counters;
      return {
        records: result.records.map(record => record.toObject()),
        summary: {
          nodesCreated: counters.nodesCreated || 0,
          nodesDeleted: counters.nodesDeleted || 0,
          relationshipsCreated: counters.relationshipsCreated || 0,
          relationshipsDeleted: counters.relationshipsDeleted || 0,
          propertiesSet: counters.propertiesSet || 0,
          labelsAdded: counters.labelsAdded || 0,
          labelsRemoved: counters.labelsRemoved || 0
        }
      };
    } catch (error) {
      console.error('❌ [Neo4j] Write query error:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a transaction with multiple operations
   * @param {Function} txFunction - Function receiving transaction object
   * @returns {any} Transaction result
   */
  async writeTransaction(txFunction) {
    const session = await this.getWriteSession();
    try {
      return await session.executeWrite(txFunction);
    } catch (error) {
      console.error('❌ [Neo4j] Transaction error:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a read transaction
   * @param {Function} txFunction - Function receiving transaction object
   * @returns {any} Transaction result
   */
  async readTransaction(txFunction) {
    const session = await this.getReadSession();
    try {
      return await session.executeRead(txFunction);
    } catch (error) {
      console.error('❌ [Neo4j] Read transaction error:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  // ==========================================
  // Graph-specific helper methods
  // ==========================================

  /**
   * Create or update a Contact node
   * @param {string} userId - User ID (for multi-tenancy)
   * @param {object} contact - Contact data
   */
  async upsertContact(userId, contact) {
    const cypher = `
      MERGE (c:Contact {id: $contactId, userId: $userId})
      SET c.name = $name,
          c.email = $email,
          c.company = $company,
          c.jobTitle = $jobTitle,
          c.tags = $tags,
          c.updatedAt = datetime()
      RETURN c
    `;

    return this.write(cypher, {
      contactId: contact.id,
      userId,
      name: contact.name || contact.displayName || '',
      email: contact.email || '',
      company: contact.company || contact.organization || '',
      jobTitle: contact.jobTitle || contact.title || '',
      tags: contact.tags || []
    });
  }

  /**
   * Delete a Contact node and all its relationships
   * @param {string} userId - User ID
   * @param {string} contactId - Contact ID
   */
  async deleteContact(userId, contactId) {
    const cypher = `
      MATCH (c:Contact {id: $contactId, userId: $userId})
      DETACH DELETE c
    `;

    return this.write(cypher, { contactId, userId });
  }

  /**
   * Create or update a Company node and link to contact
   * @param {string} userId - User ID
   * @param {string} contactId - Contact ID
   * @param {object} company - Company data
   */
  async upsertCompanyRelationship(userId, contactId, company) {
    const cypher = `
      MATCH (c:Contact {id: $contactId, userId: $userId})
      MERGE (co:Company {name: $companyName, userId: $userId})
      SET co.domain = $domain,
          co.industry = $industry,
          co.updatedAt = datetime()
      MERGE (c)-[r:WORKS_AT]->(co)
      SET r.confidence = $confidence,
          r.updatedAt = datetime()
      RETURN c, co, r
    `;

    return this.write(cypher, {
      contactId,
      userId,
      companyName: company.name,
      domain: company.domain || '',
      industry: company.industry || '',
      confidence: company.confidence || 1.0
    });
  }

  /**
   * Create SIMILAR_TO relationship between contacts
   * @param {string} userId - User ID
   * @param {string} contactId1 - First contact ID
   * @param {string} contactId2 - Second contact ID
   * @param {number} score - Similarity score
   * @param {string} method - Similarity method (e.g., 'semantic', 'tags')
   */
  async createSimilarityRelationship(userId, contactId1, contactId2, score, method = 'semantic') {
    const cypher = `
      MATCH (c1:Contact {id: $contactId1, userId: $userId})
      MATCH (c2:Contact {id: $contactId2, userId: $userId})
      MERGE (c1)-[r:SIMILAR_TO]-(c2)
      SET r.score = $score,
          r.method = $method,
          r.updatedAt = datetime()
      RETURN c1, c2, r
    `;

    return this.write(cypher, {
      contactId1,
      contactId2,
      userId,
      score,
      method
    });
  }

  /**
   * Create KNOWS relationship between contacts
   * @param {string} userId - User ID
   * @param {string} contactId1 - First contact ID
   * @param {string} contactId2 - Second contact ID
   * @param {number} strength - Relationship strength (0-1)
   * @param {string} source - How the relationship was discovered (e.g., 'same_company', 'shared_tags')
   */
  async createKnowsRelationship(userId, contactId1, contactId2, strength = 0.5, source = 'inferred') {
    const cypher = `
      MATCH (c1:Contact {id: $contactId1, userId: $userId})
      MATCH (c2:Contact {id: $contactId2, userId: $userId})
      MERGE (c1)-[r:KNOWS]-(c2)
      SET r.strength = $strength,
          r.source = $source,
          r.updatedAt = datetime()
      RETURN c1, c2, r
    `;

    return this.write(cypher, {
      contactId1,
      contactId2,
      userId,
      strength,
      source
    });
  }

  /**
   * Bulk create KNOWS relationships between contacts in a company cluster
   * @param {string} userId - User ID
   * @param {Array} contactIds - Array of contact IDs in the same company
   * @param {string} company - Company name (for source tracking)
   */
  async createCompanyKnowsRelationships(userId, contactIds, company) {
    if (contactIds.length < 2) return { created: 0 };

    // Create KNOWS edges between all pairs (limited to first 10 to avoid O(n²) explosion)
    const limitedIds = contactIds.slice(0, 10);
    const cypher = `
      UNWIND $contactIds as id1
      UNWIND $contactIds as id2
      WITH id1, id2
      WHERE id1 < id2
      MATCH (c1:Contact {id: id1, userId: $userId})
      MATCH (c2:Contact {id: id2, userId: $userId})
      MERGE (c1)-[r:KNOWS]-(c2)
      SET r.strength = 0.7,
          r.source = 'same_company',
          r.company = $company,
          r.updatedAt = datetime()
      RETURN count(r) as created
    `;

    const result = await this.write(cypher, {
      contactIds: limitedIds,
      userId,
      company
    });

    return {
      created: result.records[0]?.created || 0
    };
  }

  /**
   * Get all contacts with their relationships for a user
   * @param {string} userId - User ID
   * @returns {object} Graph data with nodes and edges
   */
  async getContactGraph(userId) {
    const cypher = `
      MATCH (c:Contact {userId: $userId})
      OPTIONAL MATCH (c)-[r]-(other)
      WHERE other:Contact OR other:Company OR other:Event OR other:Location OR other:Tag
      RETURN c, collect(DISTINCT {rel: r, node: other}) as connections
    `;

    const results = await this.read(cypher, { userId });

    // Transform to graph format
    const nodes = new Map();
    const edges = [];

    for (const record of results) {
      const contact = record.c;
      if (contact && !nodes.has(contact.properties.id)) {
        nodes.set(contact.properties.id, {
          id: contact.properties.id,
          type: 'Contact',
          ...contact.properties
        });
      }

      for (const conn of record.connections || []) {
        if (conn.node && conn.rel) {
          const nodeId = conn.node.properties.id || conn.node.properties.name;
          if (!nodes.has(nodeId)) {
            nodes.set(nodeId, {
              id: nodeId,
              type: conn.node.labels[0],
              ...conn.node.properties
            });
          }

          edges.push({
            source: contact.properties.id,
            target: nodeId,
            type: conn.rel.type,
            ...conn.rel.properties
          });
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges
    };
  }

  /**
   * Find company clusters (contacts working at same company)
   * @param {string} userId - User ID
   * @returns {Array} Array of company clusters
   */
  async findCompanyClusters(userId) {
    const cypher = `
      MATCH (c:Contact {userId: $userId})-[:WORKS_AT]->(co:Company)
      WITH co, collect(c) as contacts
      WHERE size(contacts) > 1
      RETURN co.name as company,
             co.domain as domain,
             [c IN contacts | {id: c.id, name: c.name, email: c.email, jobTitle: c.jobTitle}] as members,
             size(contacts) as memberCount
      ORDER BY memberCount DESC
    `;

    return this.read(cypher, { userId });
  }

  /**
   * Find similar contact clusters
   * @param {string} userId - User ID
   * @param {number} minScore - Minimum similarity score
   * @returns {Array} Array of similarity clusters
   */
  async findSimilarityClusters(userId, minScore = 0.75) {
    const cypher = `
      MATCH (c1:Contact {userId: $userId})-[r:SIMILAR_TO]-(c2:Contact)
      WHERE r.score >= $minScore
      WITH c1, collect({contact: c2, score: r.score}) as similar
      RETURN c1.id as contactId,
             c1.name as contactName,
             [s IN similar | {id: s.contact.id, name: s.contact.name, score: s.score}] as similarContacts
      ORDER BY size(similar) DESC
    `;

    return this.read(cypher, { userId, minScore });
  }

  /**
   * Find tag-based clusters (contacts sharing the same tag)
   * @param {string} userId - User ID
   * @returns {Array} Array of tag clusters with members
   */
  async findTagClusters(userId) {
    const cypher = `
      MATCH (c:Contact {userId: $userId})-[:HAS_TAG]->(t:Tag)
      WITH t, collect(c) as contacts
      WHERE size(contacts) >= 2
      RETURN t.name as tag,
             [c IN contacts | {id: c.id, name: c.name, email: c.email, jobTitle: c.jobTitle}] as members,
             size(contacts) as memberCount
      ORDER BY memberCount DESC
      LIMIT 20
    `;

    return this.read(cypher, { userId });
  }

  /**
   * Find knows-based clusters (contacts with KNOWS relationships)
   * @param {string} userId - User ID
   * @returns {Array} Array of social connection clusters
   */
  async findKnowsClusters(userId) {
    const cypher = `
      MATCH (c1:Contact {userId: $userId})-[r:KNOWS]-(c2:Contact)
      WITH c1, collect({contact: c2, strength: r.strength}) as connections
      WHERE size(connections) >= 2
      RETURN c1.id as contactId,
             c1.name as contactName,
             [conn IN connections | {id: conn.contact.id, name: conn.contact.name, strength: conn.strength}] as connections
      ORDER BY size(connections) DESC
    `;

    return this.read(cypher, { userId });
  }

  /**
   * Get graph statistics for a user
   * @param {string} userId - User ID
   */
  async getGraphStats(userId) {
    const cypher = `
      MATCH (c:Contact {userId: $userId})
      OPTIONAL MATCH (c)-[:WORKS_AT]->(co:Company)
      OPTIONAL MATCH (c)-[sim:SIMILAR_TO]-()
      OPTIONAL MATCH (c)-[:HAS_TAG]->(t:Tag)
      RETURN
        count(DISTINCT c) as contactCount,
        count(DISTINCT co) as companyCount,
        count(DISTINCT sim) as similarityCount,
        count(DISTINCT t) as tagCount
    `;

    const results = await this.read(cypher, { userId });
    return results[0] || {
      contactCount: 0,
      companyCount: 0,
      similarityCount: 0,
      tagCount: 0
    };
  }

  // ==========================================
  // Event Social Intelligence methods
  // ==========================================

  /**
   * Create or update an Event node
   * @param {string} userId - User ID (for multi-tenancy)
   * @param {object} event - Event data
   * @param {string} event.id - Event unique identifier
   * @param {string} event.name - Event name/title
   * @param {string} event.description - Event description
   * @param {Date} event.startDate - Event start date
   * @param {Date} event.endDate - Event end date
   * @param {object} event.location - Location with lat, lng, address
   * @param {string} event.source - Event source ('google_calendar', 'manual', etc.)
   */
  async upsertEvent(userId, event) {
    const cypher = `
      MERGE (e:Event {id: $eventId, userId: $userId})
      SET e.name = $name,
          e.description = $description,
          e.startDate = datetime($startDate),
          e.endDate = datetime($endDate),
          e.address = $address,
          e.latitude = $latitude,
          e.longitude = $longitude,
          e.source = $source,
          e.updatedAt = datetime()
      RETURN e
    `;

    return this.write(cypher, {
      eventId: event.id,
      userId,
      name: event.name || '',
      description: event.description || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString() : new Date().toISOString(),
      endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
      address: event.location?.address || '',
      latitude: event.location?.lat || event.location?.latitude || null,
      longitude: event.location?.lng || event.location?.longitude || null,
      source: event.source || 'manual'
    });
  }

  /**
   * Delete an Event node and all its relationships
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   */
  async deleteEvent(userId, eventId) {
    const cypher = `
      MATCH (e:Event {id: $eventId, userId: $userId})
      DETACH DELETE e
    `;

    return this.write(cypher, { eventId, userId });
  }

  /**
   * Create ATTENDS relationship between a contact and an event
   * @param {string} userId - User ID
   * @param {string} contactId - Contact ID
   * @param {string} eventId - Event ID
   * @param {object} participation - Participation details
   * @param {string} participation.visibility - Visibility mode (public, friends, private, ghost)
   * @param {string} participation.intent - Participation intent (networking, recruiting, etc.)
   * @param {Array<string>} participation.lookingFor - What they're looking for
   * @param {Array<string>} participation.offering - What they're offering
   * @param {string} participation.status - Attendance status (confirmed, maybe, declined)
   */
  async createAttendsRelationship(userId, contactId, eventId, participation = {}) {
    const cypher = `
      MATCH (c:Contact {id: $contactId, userId: $userId})
      MATCH (e:Event {id: $eventId, userId: $userId})
      MERGE (c)-[r:ATTENDS]->(e)
      SET r.visibility = $visibility,
          r.intent = $intent,
          r.lookingFor = $lookingFor,
          r.offering = $offering,
          r.status = $status,
          r.updatedAt = datetime()
      RETURN c, e, r
    `;

    return this.write(cypher, {
      contactId,
      eventId,
      userId,
      visibility: participation.visibility || 'private',
      intent: participation.intent || 'networking',
      lookingFor: participation.lookingFor || [],
      offering: participation.offering || [],
      status: participation.status || 'confirmed'
    });
  }

  /**
   * Update ATTENDS relationship visibility (for Ghost Mode)
   * @param {string} userId - User ID
   * @param {string} contactId - Contact ID
   * @param {string} eventId - Event ID
   * @param {string} visibility - New visibility mode
   */
  async updateAttendanceVisibility(userId, contactId, eventId, visibility) {
    const cypher = `
      MATCH (c:Contact {id: $contactId, userId: $userId})-[r:ATTENDS]->(e:Event {id: $eventId})
      SET r.visibility = $visibility,
          r.updatedAt = datetime()
      RETURN r
    `;

    return this.write(cypher, { contactId, eventId, userId, visibility });
  }

  /**
   * Create MATCHED_AT relationship for AI-powered introductions
   * Tracks when two contacts were matched by AI at an event
   * @param {string} userId - User ID
   * @param {string} contactId1 - First contact ID
   * @param {string} contactId2 - Second contact ID
   * @param {string} eventId - Event ID where match occurred
   * @param {object} matchData - Match details
   * @param {number} matchData.compatibilityScore - AI compatibility score (0-1)
   * @param {Array<string>} matchData.reasons - Why they were matched
   * @param {string} matchData.status - Match status (pending, accepted, declined)
   */
  async createMatchedAtRelationship(userId, contactId1, contactId2, eventId, matchData = {}) {
    const cypher = `
      MATCH (c1:Contact {id: $contactId1, userId: $userId})
      MATCH (c2:Contact {id: $contactId2, userId: $userId})
      MATCH (e:Event {id: $eventId, userId: $userId})
      MERGE (c1)-[r:MATCHED_AT {eventId: $eventId}]-(c2)
      SET r.compatibilityScore = $compatibilityScore,
          r.reasons = $reasons,
          r.status = $status,
          r.contact1Accepted = $contact1Accepted,
          r.contact2Accepted = $contact2Accepted,
          r.createdAt = COALESCE(r.createdAt, datetime()),
          r.updatedAt = datetime()
      RETURN c1, c2, r, e
    `;

    return this.write(cypher, {
      contactId1,
      contactId2,
      eventId,
      userId,
      compatibilityScore: matchData.compatibilityScore || 0,
      reasons: matchData.reasons || [],
      status: matchData.status || 'pending',
      contact1Accepted: matchData.contact1Accepted || false,
      contact2Accepted: matchData.contact2Accepted || false
    });
  }

  /**
   * Update match status when a contact accepts/declines
   * @param {string} userId - User ID
   * @param {string} contactId - Contact accepting/declining
   * @param {string} matchedContactId - The other contact in the match
   * @param {string} eventId - Event ID
   * @param {boolean} accepted - Whether they accepted
   */
  async updateMatchStatus(userId, contactId, matchedContactId, eventId, accepted) {
    // Determine which side of the relationship to update
    const cypher = `
      MATCH (c1:Contact {userId: $userId})-[r:MATCHED_AT {eventId: $eventId}]-(c2:Contact {userId: $userId})
      WHERE (c1.id = $contactId AND c2.id = $matchedContactId)
         OR (c1.id = $matchedContactId AND c2.id = $contactId)
      SET r.contact1Accepted = CASE WHEN c1.id = $contactId THEN $accepted ELSE r.contact1Accepted END,
          r.contact2Accepted = CASE WHEN c2.id = $contactId THEN $accepted ELSE r.contact2Accepted END,
          r.status = CASE
            WHEN (CASE WHEN c1.id = $contactId THEN $accepted ELSE r.contact1Accepted END) = true
             AND (CASE WHEN c2.id = $contactId THEN $accepted ELSE r.contact2Accepted END) = true
            THEN 'accepted'
            WHEN $accepted = false THEN 'declined'
            ELSE 'pending'
          END,
          r.updatedAt = datetime()
      RETURN r
    `;

    return this.write(cypher, {
      contactId,
      matchedContactId,
      eventId,
      userId,
      accepted
    });
  }

  /**
   * Get all attendees for an event respecting visibility rules
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @param {string} requesterId - Contact ID requesting the list (for visibility filtering)
   * @param {Array<string>} requesterFriendIds - IDs of requester's friends
   */
  async getEventAttendees(userId, eventId, requesterId = null, requesterFriendIds = []) {
    const cypher = `
      MATCH (c:Contact {userId: $userId})-[r:ATTENDS]->(e:Event {id: $eventId, userId: $userId})
      WHERE r.visibility = 'public'
         OR (r.visibility = 'friends' AND c.id IN $friendIds)
         OR c.id = $requesterId
      RETURN c, r
      ORDER BY c.name
    `;

    return this.read(cypher, {
      eventId,
      userId,
      requesterId: requesterId || '',
      friendIds: requesterFriendIds || []
    });
  }

  /**
   * Get ghost mode attendees for AI matching (excludes human-visible attendees)
   * Only returns contacts in ghost mode for AI processing
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   */
  async getGhostModeAttendees(userId, eventId) {
    const cypher = `
      MATCH (c:Contact {userId: $userId})-[r:ATTENDS]->(e:Event {id: $eventId, userId: $userId})
      WHERE r.visibility = 'ghost'
      RETURN c, r
    `;

    return this.read(cypher, { eventId, userId });
  }

  /**
   * Find potential matches at an event based on looking_for/offering compatibility
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @param {number} minScore - Minimum compatibility score (0-1)
   */
  async findEventMatches(userId, eventId, minScore = 0.5) {
    // This query finds pairs of attendees where one's lookingFor matches another's offering
    const cypher = `
      MATCH (c1:Contact {userId: $userId})-[r1:ATTENDS]->(e:Event {id: $eventId, userId: $userId})<-[r2:ATTENDS]-(c2:Contact {userId: $userId})
      WHERE c1.id < c2.id
        AND (r1.visibility IN ['public', 'friends', 'ghost'] OR r2.visibility IN ['public', 'friends', 'ghost'])
        AND (ANY(item IN r1.lookingFor WHERE item IN r2.offering)
             OR ANY(item IN r2.lookingFor WHERE item IN r1.offering))
      WITH c1, c2, r1, r2, e,
           size([x IN r1.lookingFor WHERE x IN r2.offering]) as matches1,
           size([x IN r2.lookingFor WHERE x IN r1.offering]) as matches2,
           size(r1.lookingFor) + size(r2.lookingFor) as totalLookingFor
      WITH c1, c2, r1, r2, e,
           CASE WHEN totalLookingFor > 0
                THEN toFloat(matches1 + matches2) / totalLookingFor
                ELSE 0
           END as compatibilityScore
      WHERE compatibilityScore >= $minScore
      RETURN c1, c2, r1, r2, compatibilityScore
      ORDER BY compatibilityScore DESC
      LIMIT 50
    `;

    return this.read(cypher, { eventId, userId, minScore });
  }

  /**
   * Get upcoming events for a user with attendee counts
   * @param {string} userId - User ID
   * @param {number} limit - Maximum events to return
   */
  async getUpcomingEvents(userId, limit = 20) {
    const cypher = `
      MATCH (e:Event {userId: $userId})
      WHERE e.startDate >= datetime()
      OPTIONAL MATCH (c:Contact)-[r:ATTENDS]->(e)
      WITH e, count(c) as attendeeCount
      RETURN e, attendeeCount
      ORDER BY e.startDate ASC
      LIMIT $limit
    `;

    return this.read(cypher, { userId, limit: neo4j.int(limit) });
  }

  /**
   * Get event statistics for a user
   * @param {string} userId - User ID
   */
  async getEventStats(userId) {
    const cypher = `
      MATCH (e:Event {userId: $userId})
      OPTIONAL MATCH (c:Contact)-[r:ATTENDS]->(e)
      OPTIONAL MATCH ()-[m:MATCHED_AT]-()
      WHERE m.eventId IN collect(e.id)
      RETURN
        count(DISTINCT e) as totalEvents,
        count(DISTINCT CASE WHEN e.startDate >= datetime() THEN e END) as upcomingEvents,
        count(DISTINCT r) as totalAttendances,
        count(DISTINCT m) as totalMatches,
        count(DISTINCT CASE WHEN m.status = 'accepted' THEN m END) as acceptedMatches
    `;

    const results = await this.read(cypher, { userId });
    return results[0] || {
      totalEvents: 0,
      upcomingEvents: 0,
      totalAttendances: 0,
      totalMatches: 0,
      acceptedMatches: 0
    };
  }

  /**
   * Verify connection is healthy
   */
  async healthCheck() {
    try {
      const result = await this.read('RETURN 1 as health');
      return {
        healthy: true,
        connected: this.isConnected,
        result: result[0]
      };
    } catch (error) {
      return {
        healthy: false,
        connected: this.isConnected,
        error: error.message
      };
    }
  }

  /**
   * Close the connection
   */
  async disconnect() {
    try {
      if (this.driver) {
        await this.driver.close();
        console.log('👋 [Neo4j] Disconnected gracefully');
      }
      this.isConnected = false;
      this.driver = null;
    } catch (error) {
      console.error('❌ [Neo4j] Disconnect error:', error.message);
    }
  }
}

// Export singleton instance
export const neo4jClient = new Neo4jClient();

// Helper function to convert Neo4j Integer to JS number
export function toNumber(value) {
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  return value;
}

// Helper function to format Neo4j DateTime
export function toDate(value) {
  if (value && typeof value.toStandardDate === 'function') {
    return value.toStandardDate();
  }
  return value;
}
