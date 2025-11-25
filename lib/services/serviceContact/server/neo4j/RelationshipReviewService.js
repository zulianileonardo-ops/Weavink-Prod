// lib/services/serviceContact/server/neo4j/RelationshipReviewService.js
// Handles review, approval, and rejection of discovered relationships
// Integrates with DiscoveryJobManager for pending relationships

import { neo4jClient } from './neo4jClient.js';
import { DiscoveryJobManager } from '../DiscoveryJobManager.js';
import { RELATIONSHIP_CONFIDENCE_TIERS } from '../../client/constants/contactConstants.js';

/**
 * RelationshipReviewService - Manages relationship review workflow
 *
 * Features:
 * - Get pending relationships for user review
 * - Approve relationships (save to Neo4j)
 * - Reject relationships (mark as rejected)
 * - Batch approve/reject operations
 * - LLM assessment for medium-confidence relationships
 */
class RelationshipReviewService {
  /**
   * Get pending relationships for a specific tier
   * @param {string} userId - User ID
   * @param {string} jobId - Discovery job ID
   * @param {string} tier - Confidence tier ('medium' or 'low')
   * @returns {object} { success, relationships, total, reviewed, tier }
   */
  static async getPendingRelationships(userId, jobId, tier = 'medium') {
    // Verify job ownership
    const job = DiscoveryJobManager.getJobForUser(jobId, userId);
    if (!job) {
      return {
        success: false,
        error: 'Job not found or unauthorized',
        relationships: [],
        total: 0,
        reviewed: 0
      };
    }

    const result = DiscoveryJobManager.getPendingRelationships(jobId, tier);
    return {
      success: true,
      ...result,
      tier
    };
  }

  /**
   * Approve a single relationship and save to Neo4j
   * @param {string} userId - User ID
   * @param {object} relationshipData - Relationship to approve
   * @param {string} jobId - Discovery job ID
   * @returns {object} { success, savedToNeo4j }
   */
  static async approveRelationship(userId, relationshipData, jobId) {
    const { sourceId, targetId, score, method, sharedTags } = relationshipData;

    try {
      // Save to Neo4j with user_approved status
      const cypher = `
        MATCH (c1:Contact {id: $sourceId, userId: $userId})
        MATCH (c2:Contact {id: $targetId, userId: $userId})
        MERGE (c1)-[r:SIMILAR_TO]-(c2)
        SET r.score = $score,
            r.method = $method,
            r.confidence = 'medium',
            r.reviewStatus = 'user_approved',
            r.reviewedAt = datetime(),
            r.updatedAt = datetime()
            ${sharedTags ? ', r.sharedTags = $sharedTags' : ''}
        RETURN r
      `;

      const result = await neo4jClient.write(cypher, {
        sourceId,
        targetId,
        userId,
        score: score || 0,
        method: method || 'unknown',
        ...(sharedTags && { sharedTags })
      });

      // Mark as reviewed in job
      DiscoveryJobManager.markRelationshipReviewed(jobId, sourceId, targetId, 'approved');

      console.log(`✅ [RelationshipReview] Approved: ${sourceId} <-> ${targetId}`);

      return {
        success: true,
        savedToNeo4j: true,
        relationshipsCreated: result.summary?.relationshipsCreated || 0
      };

    } catch (error) {
      console.error(`❌ [RelationshipReview] Approve failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reject a single relationship
   * @param {string} userId - User ID
   * @param {object} relationshipData - Relationship to reject
   * @param {string} jobId - Discovery job ID
   * @returns {object} { success }
   */
  static async rejectRelationship(userId, relationshipData, jobId) {
    const { sourceId, targetId } = relationshipData;

    try {
      // Just mark as rejected in job (don't save to Neo4j)
      const marked = DiscoveryJobManager.markRelationshipReviewed(jobId, sourceId, targetId, 'rejected');

      if (!marked) {
        return {
          success: false,
          error: 'Relationship not found in job'
        };
      }

      console.log(`🚫 [RelationshipReview] Rejected: ${sourceId} <-> ${targetId}`);

      return { success: true };

    } catch (error) {
      console.error(`❌ [RelationshipReview] Reject failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch approve multiple relationships
   * @param {string} userId - User ID
   * @param {Array} relationships - Array of relationships to approve
   * @param {string} jobId - Discovery job ID
   * @returns {object} { success, approved, failed }
   */
  static async batchApprove(userId, relationships, jobId) {
    console.log(`📦 [RelationshipReview] Batch approving ${relationships.length} relationships`);

    let approved = 0;
    let failed = 0;
    const errors = [];

    for (const rel of relationships) {
      const result = await this.approveRelationship(userId, rel, jobId);
      if (result.success) {
        approved++;
      } else {
        failed++;
        errors.push({ relationship: rel, error: result.error });
      }
    }

    console.log(`✅ [RelationshipReview] Batch complete: ${approved} approved, ${failed} failed`);

    return {
      success: failed === 0,
      approved,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Batch reject multiple relationships
   * @param {string} userId - User ID
   * @param {Array} relationships - Array of relationships to reject
   * @param {string} jobId - Discovery job ID
   * @returns {object} { success, rejected, failed }
   */
  static async batchReject(userId, relationships, jobId) {
    console.log(`📦 [RelationshipReview] Batch rejecting ${relationships.length} relationships`);

    let rejected = 0;
    let failed = 0;
    const errors = [];

    for (const rel of relationships) {
      const result = await this.rejectRelationship(userId, rel, jobId);
      if (result.success) {
        rejected++;
      } else {
        failed++;
        errors.push({ relationship: rel, error: result.error });
      }
    }

    console.log(`🚫 [RelationshipReview] Batch complete: ${rejected} rejected, ${failed} failed`);

    return {
      success: failed === 0,
      rejected,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get LLM assessment for a medium-confidence relationship
   * Uses Gemini Flash to explain why contacts might be related
   *
   * @param {string} userId - User ID
   * @param {string} sourceId - Source contact ID
   * @param {string} targetId - Target contact ID
   * @param {string} jobId - Discovery job ID
   * @param {object} contactData - Optional pre-fetched contact data
   * @returns {object} { success, assessment, cached }
   */
  static async assessRelationship(userId, sourceId, targetId, jobId, contactData = null) {
    console.log(`🤖 [RelationshipReview] Assessing relationship: ${sourceId} <-> ${targetId}`);

    // Check for cached assessment first
    const existingRel = DiscoveryJobManager.getRelationship(jobId, sourceId, targetId);
    if (existingRel?.llmAssessment) {
      console.log(`   ✅ Using cached assessment`);
      return {
        success: true,
        assessment: existingRel.llmAssessment,
        cached: true
      };
    }

    try {
      // Fetch contact data from Neo4j if not provided
      let sourceContact, targetContact;

      if (contactData) {
        sourceContact = contactData.source;
        targetContact = contactData.target;
      } else {
        const contacts = await neo4jClient.read(`
          MATCH (c:Contact {userId: $userId})
          WHERE c.id IN [$sourceId, $targetId]
          OPTIONAL MATCH (c)-[:HAS_TAG]->(t:Tag)
          RETURN c.id as id, c.name as name, c.email as email,
                 c.company as company, c.jobTitle as jobTitle,
                 c.notes as notes, collect(t.name) as tags
        `, { userId, sourceId, targetId });

        sourceContact = contacts.find(c => c.id === sourceId);
        targetContact = contacts.find(c => c.id === targetId);
      }

      if (!sourceContact || !targetContact) {
        return {
          success: false,
          error: 'Contact(s) not found'
        };
      }

      // Get relationship context
      const relationship = existingRel || { method: 'unknown', score: 0 };

      // Call Gemini Flash for assessment
      const assessment = await this.callGeminiForAssessment(
        sourceContact,
        targetContact,
        relationship
      );

      // Store assessment in job
      DiscoveryJobManager.storeAssessment(jobId, sourceId, targetId, assessment);

      return {
        success: true,
        assessment,
        cached: false
      };

    } catch (error) {
      console.error(`❌ [RelationshipReview] Assessment failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Call Gemini Flash to assess a relationship
   * @private
   */
  static async callGeminiForAssessment(sourceContact, targetContact, relationship) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `Analyze why these two professional contacts might be related.

SOURCE CONTACT:
- Name: ${sourceContact.name || 'Unknown'}
- Company: ${sourceContact.company || 'Not specified'}
- Job Title: ${sourceContact.jobTitle || 'Not specified'}
- Tags: ${(sourceContact.tags || []).join(', ') || 'None'}
- Notes: ${(sourceContact.notes || '').substring(0, 200) || 'None'}

TARGET CONTACT:
- Name: ${targetContact.name || 'Unknown'}
- Company: ${targetContact.company || 'Not specified'}
- Job Title: ${targetContact.jobTitle || 'Not specified'}
- Tags: ${(targetContact.tags || []).join(', ') || 'None'}
- Notes: ${(targetContact.notes || '').substring(0, 200) || 'None'}

RELATIONSHIP CONTEXT:
- Discovery Method: ${relationship.method === 'pinecone_embedding' ? 'Semantic Similarity' : relationship.method === 'tags' ? 'Shared Tags' : relationship.method}
- Similarity Score: ${Math.round((relationship.score || 0) * 100)}%
${relationship.sharedTags ? `- Shared Tags: ${relationship.sharedTags.join(', ')}` : ''}

Provide a brief (2-3 sentence) explanation of why these contacts might be professionally related, and rate your confidence (1-10).

Respond ONLY in valid JSON format:
{
  "explanation": "Brief explanation here...",
  "connectionType": "colleague|industry|interest|geography|other",
  "confidence": 7,
  "suggestedAction": "approve|review|skip"
}`;

    console.log(`   🔮 Calling Gemini Flash for assessment...`);

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    if (responseText.includes('```json')) {
      jsonStr = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonStr = responseText.split('```')[1].split('```')[0].trim();
    }

    const assessment = JSON.parse(jsonStr);

    // Validate and sanitize
    return {
      explanation: String(assessment.explanation || '').substring(0, 500),
      connectionType: ['colleague', 'industry', 'interest', 'geography', 'other'].includes(assessment.connectionType)
        ? assessment.connectionType
        : 'other',
      confidence: Math.min(10, Math.max(1, parseInt(assessment.confidence) || 5)),
      suggestedAction: ['approve', 'review', 'skip'].includes(assessment.suggestedAction)
        ? assessment.suggestedAction
        : 'review'
    };
  }

  /**
   * Get review summary for a job
   * @param {string} userId - User ID
   * @param {string} jobId - Discovery job ID
   * @returns {object} { success, summary }
   */
  static async getReviewSummary(userId, jobId) {
    const job = DiscoveryJobManager.getJobForUser(jobId, userId);
    if (!job) {
      return {
        success: false,
        error: 'Job not found or unauthorized'
      };
    }

    const summary = DiscoveryJobManager.getReviewSummary(jobId);
    return {
      success: true,
      summary,
      counts: job.relationshipCounts || { high: 0, medium: 0, low: 0, total: 0 }
    };
  }
}

export default RelationshipReviewService;
export { RelationshipReviewService };
