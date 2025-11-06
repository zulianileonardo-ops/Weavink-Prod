/**
 * Third-Party Processor Management Service
 *
 * GDPR Art. 28 - Processor Obligations
 * Manages third-party data processors and compliance tracking
 *
 * Features:
 * - Processor registry and profiles
 * - Data Processing Agreement (DPA) management
 * - Risk assessments and audits
 * - Data flow mapping
 * - Contract renewal tracking
 * - Compliance verification
 */

import { adminDb } from '../../../firebaseAdmin.js';
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Processor risk levels
 */
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Processor statuses
 */
export const PROCESSOR_STATUS = {
  ACTIVE: 'active',
  PENDING_REVIEW: 'pending_review',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
};

/**
 * Data categories processed
 */
export const DATA_CATEGORIES = {
  PERSONAL_INFO: 'personal_information',
  CONTACT_INFO: 'contact_information',
  FINANCIAL: 'financial_data',
  HEALTH: 'health_data',
  BIOMETRIC: 'biometric_data',
  LOCATION: 'location_data',
  BEHAVIORAL: 'behavioral_data',
  TECHNICAL: 'technical_data',
};

/**
 * Processing purposes
 */
export const PROCESSING_PURPOSES = {
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
  CUSTOMER_SUPPORT: 'customer_support',
  PAYMENT_PROCESSING: 'payment_processing',
  CLOUD_STORAGE: 'cloud_storage',
  EMAIL_DELIVERY: 'email_delivery',
  SMS_DELIVERY: 'sms_delivery',
  HOSTING: 'hosting',
};

/**
 * Register a new third-party processor
 * @param {Object} processorData - Processor information
 * @returns {Promise<Object>} Registration result
 */
export async function registerProcessor(processorData) {
  try {
    const {
      name,
      legalName,
      country,
      contactEmail,
      contactPhone,
      dataCategories,
      processingPurposes,
      dataLocation,
      subProcessors = [],
      certifications = [],
    } = processorData;

    // Validate required fields
    if (!name || !legalName || !country || !contactEmail) {
      throw new Error('Missing required processor information');
    }

    // Create processor profile
    const processor = {
      name,
      legalName,
      country,
      contactEmail,
      contactPhone: contactPhone || '',
      dataCategories: dataCategories || [],
      processingPurposes: processingPurposes || [],
      dataLocation: dataLocation || country,
      subProcessors,
      certifications,
      status: PROCESSOR_STATUS.PENDING_REVIEW,
      riskLevel: null, // Will be set by risk assessment
      dpaStatus: 'not_signed',
      dpaSignedDate: null,
      contractStartDate: null,
      contractEndDate: null,
      lastAuditDate: null,
      nextAuditDate: null,
      complianceScore: 0,
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('DataProcessors').add(processor);

    console.log(`[ProcessorMgmt] Registered new processor: ${name} (${docRef.id})`);

    // Log the registration
    await db.collection('ProcessorLogs').add({
      processorId: docRef.id,
      action: 'processor_registered',
      performedBy: 'system',
      details: `Processor ${name} registered for review`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      processorId: docRef.id,
      processor: {
        id: docRef.id,
        ...processor,
      },
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error registering processor:', error);
    throw new Error(`Failed to register processor: ${error.message}`);
  }
}

/**
 * Update processor information
 * @param {string} processorId - Processor ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 */
export async function updateProcessor(processorId, updates) {
  try {
    const processorRef = db.collection('DataProcessors').doc(processorId);
    const processorDoc = await processorRef.get();

    if (!processorDoc.exists) {
      throw new Error('Processor not found');
    }

    // Filter allowed fields
    const allowedFields = [
      'name', 'legalName', 'country', 'contactEmail', 'contactPhone',
      'dataCategories', 'processingPurposes', 'dataLocation',
      'subProcessors', 'certifications', 'status', 'riskLevel',
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    filteredUpdates.updatedAt = FieldValue.serverTimestamp();

    await processorRef.update(filteredUpdates);

    console.log(`[ProcessorMgmt] Updated processor ${processorId}`);

    // Log the update
    await db.collection('ProcessorLogs').add({
      processorId,
      action: 'processor_updated',
      performedBy: updates.updatedBy || 'system',
      details: `Processor information updated: ${Object.keys(filteredUpdates).join(', ')}`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      processorId,
      updated: filteredUpdates,
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error updating processor:', error);
    throw new Error(`Failed to update processor: ${error.message}`);
  }
}

/**
 * Upload or update Data Processing Agreement (DPA)
 * @param {string} processorId - Processor ID
 * @param {Object} dpaData - DPA information
 * @returns {Promise<Object>} DPA result
 */
export async function updateDPA(processorId, dpaData) {
  try {
    const {
      documentUrl,
      signedDate,
      effectiveDate,
      expiryDate,
      version,
      signedBy,
      clauses = [],
    } = dpaData;

    const processorRef = db.collection('DataProcessors').doc(processorId);
    const processorDoc = await processorRef.get();

    if (!processorDoc.exists) {
      throw new Error('Processor not found');
    }

    // Create DPA record
    const dpa = {
      processorId,
      documentUrl,
      signedDate: new Date(signedDate),
      effectiveDate: new Date(effectiveDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      version: version || '1.0',
      signedBy,
      clauses,
      status: 'active',
      uploadedAt: FieldValue.serverTimestamp(),
    };

    const dpaRef = await db.collection('DataProcessingAgreements').add(dpa);

    // Update processor with DPA info
    await processorRef.update({
      dpaStatus: 'signed',
      dpaSignedDate: dpa.signedDate,
      contractStartDate: dpa.effectiveDate,
      contractEndDate: dpa.expiryDate,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[ProcessorMgmt] DPA uploaded for processor ${processorId}`);

    // Log the DPA upload
    await db.collection('ProcessorLogs').add({
      processorId,
      action: 'dpa_uploaded',
      performedBy: signedBy || 'admin',
      details: `DPA v${version} signed and uploaded`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      dpaId: dpaRef.id,
      processorId,
      dpa: {
        id: dpaRef.id,
        ...dpa,
      },
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error updating DPA:', error);
    throw new Error(`Failed to update DPA: ${error.message}`);
  }
}

/**
 * Conduct risk assessment for processor
 * @param {string} processorId - Processor ID
 * @param {Object} assessmentData - Assessment criteria
 * @returns {Promise<Object>} Assessment result
 */
export async function conductRiskAssessment(processorId, assessmentData) {
  try {
    const processorRef = db.collection('DataProcessors').doc(processorId);
    const processorDoc = await processorRef.get();

    if (!processorDoc.exists) {
      throw new Error('Processor not found');
    }

    const processor = processorDoc.data();

    // Calculate risk score based on multiple factors
    let riskScore = 0;
    const factors = [];

    // Factor 1: Data sensitivity (0-30 points)
    const sensitiveCategories = [
      DATA_CATEGORIES.FINANCIAL,
      DATA_CATEGORIES.HEALTH,
      DATA_CATEGORIES.BIOMETRIC,
    ];
    const hasSensitiveData = processor.dataCategories?.some(cat =>
      sensitiveCategories.includes(cat)
    );
    if (hasSensitiveData) {
      riskScore += 25;
      factors.push({ factor: 'Sensitive data processing', score: 25 });
    } else {
      factors.push({ factor: 'Sensitive data processing', score: 0 });
    }

    // Factor 2: Data location (0-25 points)
    const nonEUCountries = ['US', 'CN', 'IN', 'BR'];
    if (nonEUCountries.includes(processor.country)) {
      riskScore += 20;
      factors.push({ factor: 'Non-EU data location', score: 20 });
    } else {
      factors.push({ factor: 'Non-EU data location', score: 0 });
    }

    // Factor 3: Certifications (0-20 points - inverse)
    const certificationScore = Math.max(0, 20 - (processor.certifications?.length || 0) * 5);
    riskScore += certificationScore;
    factors.push({ factor: 'Lack of certifications', score: certificationScore });

    // Factor 4: Sub-processors (0-15 points)
    const subProcessorScore = Math.min(15, (processor.subProcessors?.length || 0) * 3);
    riskScore += subProcessorScore;
    factors.push({ factor: 'Sub-processor complexity', score: subProcessorScore });

    // Factor 5: DPA status (0-10 points)
    if (processor.dpaStatus !== 'signed') {
      riskScore += 10;
      factors.push({ factor: 'No signed DPA', score: 10 });
    } else {
      factors.push({ factor: 'No signed DPA', score: 0 });
    }

    // Determine risk level
    let riskLevel;
    if (riskScore >= 70) {
      riskLevel = RISK_LEVELS.CRITICAL;
    } else if (riskScore >= 50) {
      riskLevel = RISK_LEVELS.HIGH;
    } else if (riskScore >= 30) {
      riskLevel = RISK_LEVELS.MEDIUM;
    } else {
      riskLevel = RISK_LEVELS.LOW;
    }

    // Create assessment record
    const assessment = {
      processorId,
      riskScore,
      riskLevel,
      factors,
      assessedBy: assessmentData.assessedBy || 'system',
      notes: assessmentData.notes || '',
      recommendations: generateRecommendations(riskLevel, factors),
      assessedAt: FieldValue.serverTimestamp(),
    };

    const assessmentRef = await db.collection('ProcessorRiskAssessments').add(assessment);

    // Update processor with risk level
    await processorRef.update({
      riskLevel,
      lastRiskAssessment: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[ProcessorMgmt] Risk assessment completed for ${processorId}: ${riskLevel} (${riskScore}/100)`);

    // Log the assessment
    await db.collection('ProcessorLogs').add({
      processorId,
      action: 'risk_assessed',
      performedBy: assessment.assessedBy,
      details: `Risk assessment: ${riskLevel} (score: ${riskScore})`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      assessmentId: assessmentRef.id,
      processorId,
      riskScore,
      riskLevel,
      factors,
      recommendations: assessment.recommendations,
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error conducting risk assessment:', error);
    throw new Error(`Failed to conduct risk assessment: ${error.message}`);
  }
}

/**
 * Schedule processor audit
 * @param {string} processorId - Processor ID
 * @param {Object} auditData - Audit details
 * @returns {Promise<Object>} Audit result
 */
export async function scheduleAudit(processorId, auditData) {
  try {
    const { scheduledDate, auditType, auditor, scope } = auditData;

    const processorRef = db.collection('DataProcessors').doc(processorId);
    const processorDoc = await processorRef.get();

    if (!processorDoc.exists) {
      throw new Error('Processor not found');
    }

    // Create audit record
    const audit = {
      processorId,
      scheduledDate: new Date(scheduledDate),
      auditType: auditType || 'compliance_check',
      auditor,
      scope: scope || [],
      status: 'scheduled',
      findings: [],
      completedDate: null,
      createdAt: FieldValue.serverTimestamp(),
    };

    const auditRef = await db.collection('ProcessorAudits').add(audit);

    // Update processor
    await processorRef.update({
      nextAuditDate: audit.scheduledDate,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[ProcessorMgmt] Audit scheduled for processor ${processorId}`);

    // Log the scheduling
    await db.collection('ProcessorLogs').add({
      processorId,
      action: 'audit_scheduled',
      performedBy: auditor,
      details: `${auditType} audit scheduled for ${scheduledDate}`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      auditId: auditRef.id,
      processorId,
      audit: {
        id: auditRef.id,
        ...audit,
      },
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error scheduling audit:', error);
    throw new Error(`Failed to schedule audit: ${error.message}`);
  }
}

/**
 * Complete processor audit with findings
 * @param {string} auditId - Audit ID
 * @param {Object} completionData - Audit completion data
 * @returns {Promise<Object>} Completion result
 */
export async function completeAudit(auditId, completionData) {
  try {
    const { findings, passed, notes, completedBy } = completionData;

    const auditRef = db.collection('ProcessorAudits').doc(auditId);
    const auditDoc = await auditRef.get();

    if (!auditDoc.exists) {
      throw new Error('Audit not found');
    }

    const audit = auditDoc.data();

    // Update audit with results
    await auditRef.update({
      status: 'completed',
      findings: findings || [],
      passed: passed || false,
      notes: notes || '',
      completedDate: FieldValue.serverTimestamp(),
      completedBy: completedBy || 'auditor',
    });

    // Update processor
    const processorRef = db.collection('DataProcessors').doc(audit.processorId);
    await processorRef.update({
      lastAuditDate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[ProcessorMgmt] Audit ${auditId} completed for processor ${audit.processorId}`);

    // Log the completion
    await db.collection('ProcessorLogs').add({
      processorId: audit.processorId,
      action: 'audit_completed',
      performedBy: completedBy || 'auditor',
      details: `Audit completed: ${passed ? 'PASSED' : 'FAILED'} (${findings?.length || 0} findings)`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      auditId,
      processorId: audit.processorId,
      passed,
      findings: findings || [],
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error completing audit:', error);
    throw new Error(`Failed to complete audit: ${error.message}`);
  }
}

/**
 * Get all registered processors
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Processors list
 */
export async function getProcessors(filters = {}) {
  try {
    let query = db.collection('DataProcessors');

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.riskLevel) {
      query = query.where('riskLevel', '==', filters.riskLevel);
    }
    if (filters.country) {
      query = query.where('country', '==', filters.country);
    }

    // Order by registration date
    query = query.orderBy('registeredAt', 'desc');

    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    const processors = [];

    snapshot.forEach(doc => {
      processors.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      processors,
      count: processors.length,
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error getting processors:', error);
    throw new Error(`Failed to get processors: ${error.message}`);
  }
}

/**
 * Get processor by ID
 * @param {string} processorId - Processor ID
 * @returns {Promise<Object>} Processor details
 */
export async function getProcessorById(processorId) {
  try {
    const processorDoc = await db.collection('DataProcessors').doc(processorId).get();

    if (!processorDoc.exists) {
      throw new Error('Processor not found');
    }

    // Get related data
    const dpaSnapshot = await db.collection('DataProcessingAgreements')
      .where('processorId', '==', processorId)
      .orderBy('uploadedAt', 'desc')
      .limit(1)
      .get();

    const latestDPA = !dpaSnapshot.empty ? {
      id: dpaSnapshot.docs[0].id,
      ...dpaSnapshot.docs[0].data(),
    } : null;

    const riskSnapshot = await db.collection('ProcessorRiskAssessments')
      .where('processorId', '==', processorId)
      .orderBy('assessedAt', 'desc')
      .limit(1)
      .get();

    const latestRiskAssessment = !riskSnapshot.empty ? {
      id: riskSnapshot.docs[0].id,
      ...riskSnapshot.docs[0].data(),
    } : null;

    return {
      success: true,
      processor: {
        id: processorDoc.id,
        ...processorDoc.data(),
        latestDPA,
        latestRiskAssessment,
      },
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error getting processor:', error);
    throw new Error(`Failed to get processor: ${error.message}`);
  }
}

/**
 * Map data flows between systems and processors
 * @param {Object} flowData - Data flow information
 * @returns {Promise<Object>} Flow mapping result
 */
export async function mapDataFlow(flowData) {
  try {
    const {
      processorId,
      sourceSystem,
      dataCategories,
      purpose,
      frequency,
      securityMeasures,
    } = flowData;

    // Validate processor exists
    const processorDoc = await db.collection('DataProcessors').doc(processorId).get();
    if (!processorDoc.exists) {
      throw new Error('Processor not found');
    }

    const flow = {
      processorId,
      processorName: processorDoc.data().name,
      sourceSystem,
      dataCategories,
      purpose,
      frequency,
      securityMeasures: securityMeasures || [],
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    };

    const flowRef = await db.collection('DataFlows').add(flow);

    console.log(`[ProcessorMgmt] Data flow mapped: ${sourceSystem} -> ${processorDoc.data().name}`);

    return {
      success: true,
      flowId: flowRef.id,
      flow: {
        id: flowRef.id,
        ...flow,
      },
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error mapping data flow:', error);
    throw new Error(`Failed to map data flow: ${error.message}`);
  }
}

/**
 * Get processor statistics
 * @returns {Promise<Object>} Statistics
 */
export async function getProcessorStatistics() {
  try {
    const processorsSnapshot = await db.collection('DataProcessors').get();

    const stats = {
      totalProcessors: processorsSnapshot.size,
      byStatus: {},
      byRiskLevel: {},
      byCountry: {},
      dpaCompliance: {
        signed: 0,
        pending: 0,
        expired: 0,
      },
      upcomingAudits: 0,
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    processorsSnapshot.forEach(doc => {
      const processor = doc.data();

      // Count by status
      stats.byStatus[processor.status] = (stats.byStatus[processor.status] || 0) + 1;

      // Count by risk level
      if (processor.riskLevel) {
        stats.byRiskLevel[processor.riskLevel] = (stats.byRiskLevel[processor.riskLevel] || 0) + 1;
      }

      // Count by country
      stats.byCountry[processor.country] = (stats.byCountry[processor.country] || 0) + 1;

      // DPA compliance
      if (processor.dpaStatus === 'signed') {
        stats.dpaCompliance.signed++;
      } else {
        stats.dpaCompliance.pending++;
      }

      // Upcoming audits
      if (processor.nextAuditDate) {
        const auditDate = processor.nextAuditDate.toDate ? processor.nextAuditDate.toDate() : new Date(processor.nextAuditDate);
        if (auditDate >= now && auditDate <= thirtyDaysFromNow) {
          stats.upcomingAudits++;
        }
      }
    });

    return {
      success: true,
      statistics: stats,
    };
  } catch (error) {
    console.error('[ProcessorMgmt] Error getting statistics:', error);
    throw new Error(`Failed to get statistics: ${error.message}`);
  }
}

/**
 * Generate recommendations based on risk assessment
 * @param {string} riskLevel - Risk level
 * @param {Array} factors - Risk factors
 * @returns {Array} Recommendations
 */
function generateRecommendations(riskLevel, factors) {
  const recommendations = [];

  if (riskLevel === RISK_LEVELS.CRITICAL || riskLevel === RISK_LEVELS.HIGH) {
    recommendations.push('Schedule immediate compliance audit');
    recommendations.push('Review and strengthen DPA clauses');
    recommendations.push('Implement additional security measures');
  }

  // Check specific factors
  factors.forEach(factor => {
    if (factor.factor === 'Sensitive data processing' && factor.score > 0) {
      recommendations.push('Ensure encryption at rest and in transit');
      recommendations.push('Implement strict access controls');
    }
    if (factor.factor === 'Non-EU data location' && factor.score > 0) {
      recommendations.push('Verify Standard Contractual Clauses (SCC) compliance');
      recommendations.push('Document data transfer mechanisms');
    }
    if (factor.factor === 'Lack of certifications' && factor.score > 10) {
      recommendations.push('Request ISO 27001 or SOC 2 certification');
    }
    if (factor.factor === 'No signed DPA' && factor.score > 0) {
      recommendations.push('URGENT: Obtain signed Data Processing Agreement');
    }
  });

  // Always recommend regular reviews
  recommendations.push('Schedule quarterly compliance reviews');

  return [...new Set(recommendations)]; // Remove duplicates
}
