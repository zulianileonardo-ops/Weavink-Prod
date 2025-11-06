/**
 * Data Protection Impact Assessment (DPIA) Service
 *
 * GDPR Art. 35 - Data Protection Impact Assessment
 * Required when processing is likely to result in high risk to
 * the rights and freedoms of individuals
 *
 * Features:
 * - DPIA template and workflow
 * - Risk assessment questionnaire
 * - Automated risk scoring
 * - DPIA tracking and approval
 * - Review and monitoring
 */

import { adminDb } from '../../../firebaseAdmin.js';
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';

/**
 * DPIA Risk Assessment Questions
 */
export const DPIA_QUESTIONS = {
  dataTypes: {
    question: 'What types of personal data will be processed?',
    options: [
      { value: 'basic', label: 'Basic data (name, email)', risk: 1 },
      { value: 'financial', label: 'Financial data', risk: 3 },
      { value: 'health', label: 'Health data', risk: 4 },
      { value: 'biometric', label: 'Biometric data', risk: 5 },
      { value: 'location', label: 'Location data', risk: 2 },
      { value: 'behavioral', label: 'Behavioral data', risk: 2 },
    ],
    required: true,
  },

  dataVolume: {
    question: 'How many individuals will be affected?',
    options: [
      { value: 'small', label: 'Less than 1,000', risk: 1 },
      { value: 'medium', label: '1,000 - 10,000', risk: 2 },
      { value: 'large', label: '10,000 - 100,000', risk: 3 },
      { value: 'massive', label: 'More than 100,000', risk: 4 },
    ],
    required: true,
  },

  automatedDecisions: {
    question: 'Will automated decision-making be used?',
    options: [
      { value: 'no', label: 'No automated decisions', risk: 0 },
      { value: 'limited', label: 'Limited automation', risk: 2 },
      { value: 'significant', label: 'Significant automation', risk: 4 },
      { value: 'profiling', label: 'Profiling or scoring', risk: 5 },
    ],
    required: true,
  },

  dataMinimization: {
    question: 'Is data minimization applied?',
    options: [
      { value: 'yes', label: 'Only necessary data collected', risk: 0 },
      { value: 'partial', label: 'Some unnecessary data', risk: 2 },
      { value: 'no', label: 'Excessive data collection', risk: 4 },
    ],
    required: true,
  },

  thirdPartySharing: {
    question: 'Will data be shared with third parties?',
    options: [
      { value: 'no', label: 'No sharing', risk: 0 },
      { value: 'processors', label: 'Only with processors', risk: 1 },
      { value: 'partners', label: 'With business partners', risk: 3 },
      { value: 'public', label: 'Publicly available', risk: 5 },
    ],
    required: true,
  },

  internationalTransfer: {
    question: 'Will data be transferred internationally?',
    options: [
      { value: 'no', label: 'No international transfer', risk: 0 },
      { value: 'eea', label: 'Within EEA only', risk: 0 },
      { value: 'adequate', label: 'To adequate countries', risk: 1 },
      { value: 'other', label: 'To non-adequate countries', risk: 4 },
    ],
    required: true,
  },
};

/**
 * Create new DPIA
 * @param {Object} dpiaData - DPIA information
 * @returns {Promise<Object>} Created DPIA
 */
export async function createDPIA(dpiaData) {
  try {
    const {
      projectName,
      projectDescription,
      dataController,
      processingPurpose,
      legalBasis,
      createdBy,
    } = dpiaData;

    const dpia = {
      projectName,
      projectDescription,
      dataController,
      processingPurpose,
      legalBasis,
      createdBy,
      status: 'draft',
      riskScore: null,
      riskLevel: null,
      assessment: null,
      mitigations: [],
      approvals: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastReviewDate: null,
      nextReviewDate: null,
    };

    const docRef = await db.collection('DPIAs').add(dpia);

    console.log(`[DPIA] Created DPIA: ${docRef.id} for project: ${projectName}`);

    return {
      success: true,
      dpiaId: docRef.id,
      dpia: {
        id: docRef.id,
        ...dpia,
      },
    };
  } catch (error) {
    console.error('[DPIA] Error creating DPIA:', error);
    throw new Error(`Failed to create DPIA: ${error.message}`);
  }
}

/**
 * Submit DPIA assessment
 * @param {string} dpiaId - DPIA ID
 * @param {Object} answers - Assessment answers
 * @returns {Promise<Object>} Assessment results
 */
export async function submitDPIAAssessment(dpiaId, answers) {
  try {
    // Calculate risk score
    const { riskScore, riskLevel, breakdown } = calculateRiskScore(answers);

    // Update DPIA
    await db.collection('DPIAs').doc(dpiaId).update({
      assessment: answers,
      riskScore,
      riskLevel,
      riskBreakdown: breakdown,
      status: riskLevel === 'high' || riskLevel === 'very_high' ? 'requires_review' : 'assessed',
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[DPIA] Assessment submitted for DPIA ${dpiaId}. Risk level: ${riskLevel}`);

    return {
      success: true,
      dpiaId,
      riskScore,
      riskLevel,
      requiresDPO: riskLevel === 'high' || riskLevel === 'very_high',
    };
  } catch (error) {
    console.error('[DPIA] Error submitting assessment:', error);
    throw new Error(`Failed to submit DPIA assessment: ${error.message}`);
  }
}

/**
 * Calculate risk score from assessment answers
 * @param {Object} answers - Assessment answers
 * @returns {Object} Risk score and level
 */
function calculateRiskScore(answers) {
  let totalScore = 0;
  let maxScore = 0;
  const breakdown = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    const question = DPIA_QUESTIONS[questionId];
    if (!question) continue;

    const option = question.options.find(opt => opt.value === answer);
    if (option) {
      totalScore += option.risk;
      breakdown[questionId] = {
        question: question.question,
        answer: option.label,
        risk: option.risk,
      };
    }

    maxScore += Math.max(...question.options.map(opt => opt.risk));
  }

  const percentageScore = (totalScore / maxScore) * 100;

  let riskLevel;
  if (percentageScore < 20) {
    riskLevel = 'low';
  } else if (percentageScore < 40) {
    riskLevel = 'medium';
  } else if (percentageScore < 60) {
    riskLevel = 'high';
  } else {
    riskLevel = 'very_high';
  }

  return {
    riskScore: Math.round(percentageScore),
    riskLevel,
    breakdown,
  };
}

/**
 * Add mitigation measure to DPIA
 * @param {string} dpiaId - DPIA ID
 * @param {Object} mitigation - Mitigation measure
 * @returns {Promise<Object>} Updated DPIA
 */
export async function addMitigationMeasure(dpiaId, mitigation) {
  try {
    const { measure, description, responsible, deadline } = mitigation;

    const mitigationRecord = {
      id: `mitigation_${Date.now()}`,
      measure,
      description,
      responsible,
      deadline,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await db.collection('DPIAs').doc(dpiaId).update({
      mitigations: FieldValue.arrayUnion(mitigationRecord),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[DPIA] Mitigation added to DPIA ${dpiaId}`);

    return {
      success: true,
      mitigation: mitigationRecord,
    };
  } catch (error) {
    console.error('[DPIA] Error adding mitigation:', error);
    throw new Error(`Failed to add mitigation measure: ${error.message}`);
  }
}

/**
 * Request DPIA approval
 * @param {string} dpiaId - DPIA ID
 * @param {string} approverId - Approver ID
 * @returns {Promise<Object>} Approval request
 */
export async function requestDPIAApproval(dpiaId, approverId) {
  try {
    const approval = {
      id: `approval_${Date.now()}`,
      approverId,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      decidedAt: null,
      comments: null,
    };

    await db.collection('DPIAs').doc(dpiaId).update({
      approvals: FieldValue.arrayUnion(approval),
      status: 'pending_approval',
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[DPIA] Approval requested from ${approverId} for DPIA ${dpiaId}`);

    return {
      success: true,
      approval,
    };
  } catch (error) {
    console.error('[DPIA] Error requesting approval:', error);
    throw new Error(`Failed to request DPIA approval: ${error.message}`);
  }
}

/**
 * Approve/reject DPIA
 * @param {string} dpiaId - DPIA ID
 * @param {string} approvalId - Approval ID
 * @param {boolean} approved - Approval decision
 * @param {string} comments - Comments
 * @returns {Promise<Object>} Approval result
 */
export async function approveDPIA(dpiaId, approvalId, approved, comments = '') {
  try {
    const dpiaDoc = await db.collection('DPIAs').doc(dpiaId).get();
    const dpia = dpiaDoc.data();

    const updatedApprovals = dpia.approvals.map(approval => {
      if (approval.id === approvalId) {
        return {
          ...approval,
          status: approved ? 'approved' : 'rejected',
          decidedAt: new Date().toISOString(),
          comments,
        };
      }
      return approval;
    });

    const allApproved = updatedApprovals.every(a => a.status === 'approved');
    const anyRejected = updatedApprovals.some(a => a.status === 'rejected');

    await db.collection('DPIAs').doc(dpiaId).update({
      approvals: updatedApprovals,
      status: anyRejected ? 'rejected' : (allApproved ? 'approved' : 'pending_approval'),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[DPIA] DPIA ${dpiaId} ${approved ? 'approved' : 'rejected'}`);

    return {
      success: true,
      approved,
      dpiaStatus: anyRejected ? 'rejected' : (allApproved ? 'approved' : 'pending_approval'),
    };
  } catch (error) {
    console.error('[DPIA] Error approving DPIA:', error);
    throw new Error(`Failed to approve DPIA: ${error.message}`);
  }
}

/**
 * Get DPIA by ID
 * @param {string} dpiaId - DPIA ID
 * @returns {Promise<Object>} DPIA data
 */
export async function getDPIA(dpiaId) {
  try {
    const doc = await db.collection('DPIAs').doc(dpiaId).get();

    if (!doc.exists) {
      throw new Error('DPIA not found');
    }

    return {
      success: true,
      dpia: {
        id: doc.id,
        ...doc.data(),
      },
    };
  } catch (error) {
    console.error('[DPIA] Error getting DPIA:', error);
    throw new Error(`Failed to get DPIA: ${error.message}`);
  }
}

/**
 * List all DPIAs
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} List of DPIAs
 */
export async function listDPIAs(filters = {}) {
  try {
    const { status, riskLevel, limit = 50 } = filters;

    let query = db.collection('DPIAs').orderBy('createdAt', 'desc').limit(limit);

    if (status) {
      query = query.where('status', '==', status);
    }

    if (riskLevel) {
      query = query.where('riskLevel', '==', riskLevel);
    }

    const snapshot = await query.get();

    const dpias = [];
    snapshot.forEach(doc => {
      dpias.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      dpias,
      count: dpias.length,
    };
  } catch (error) {
    console.error('[DPIA] Error listing DPIAs:', error);
    throw new Error(`Failed to list DPIAs: ${error.message}`);
  }
}

/**
 * Get DPIA statistics
 * @returns {Promise<Object>} DPIA statistics
 */
export async function getDPIAStatistics() {
  try {
    const snapshot = await db.collection('DPIAs').get();

    const stats = {
      total: snapshot.size,
      byStatus: {},
      byRiskLevel: {},
      requiresReview: 0,
    };

    snapshot.forEach(doc => {
      const data = doc.data();

      // Count by status
      stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;

      // Count by risk level
      if (data.riskLevel) {
        stats.byRiskLevel[data.riskLevel] = (stats.byRiskLevel[data.riskLevel] || 0) + 1;
      }

      // Count high risk
      if (data.riskLevel === 'high' || data.riskLevel === 'very_high') {
        stats.requiresReview++;
      }
    });

    return {
      success: true,
      statistics: stats,
    };
  } catch (error) {
    console.error('[DPIA] Error getting statistics:', error);
    throw new Error(`Failed to get DPIA statistics: ${error.message}`);
  }
}
