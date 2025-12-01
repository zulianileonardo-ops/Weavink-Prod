const {onSchedule} = require("firebase-functions/v2/scheduler");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getApp} = require("firebase-admin/app");

/**
 * Scheduled Cloud Function to clean up expired data export requests
 *
 * GDPR Compliance: Article 5(1)(c) - Data Minimization
 * - Export request metadata contains personal data (IP addresses, user agents)
 * - Must be deleted after serving its purpose (24 hours post-export)
 *
 * Schedule: Runs daily at 2 AM UTC
 * Retention: Deletes PrivacyRequests where expiresAt <= 25 hours ago
 *
 * Testing: See ACCOUNT_PRIVACY_TESTING_GUIDE.md (lines 563-597)
 * Documentation: See RGPD_COMPLIANCE_MATRIX.md
 */
exports.cleanupExpiredExports = onSchedule({
  schedule: "0 2 * * *", // Cron: Every day at 2:00 AM UTC
  timeZone: "UTC",
  memory: "256MiB",
  timeoutSeconds: 540, // 9 minutes max execution time
  retryConfig: {
    retryCount: 3,
    maxRetryDuration: "600s",
  },
}, async (event) => {
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
  const db = getFirestore(getApp(), databaseId);
  const startTime = Date.now();

  console.log("🧹 [Cleanup] Starting scheduled cleanup of expired export requests");

  try {
    // Calculate expiration cutoff: 24 hours + 1 hour buffer = 25 hours
    const expirationCutoff = new Date(Date.now() - 25 * 60 * 60 * 1000);

    console.log(`🔍 [Cleanup] Searching for exports expired before: ${expirationCutoff.toISOString()}`);

    // Query for expired export requests
    // Requires composite index: type + status + expiresAt
    const snapshot = await db
        .collection("PrivacyRequests")
        .where("type", "==", "export")
        .where("status", "==", "completed")
        .where("expiresAt", "<=", expirationCutoff)
        .limit(100) // Process in batches to prevent quota exhaustion
        .get();

    if (snapshot.empty) {
      console.log("✅ [Cleanup] No expired export requests found");
      return {
        success: true,
        deletedCount: 0,
        executionTimeMs: Date.now() - startTime,
      };
    }

    console.log(`📋 [Cleanup] Found ${snapshot.size} expired export request(s)`);

    // Delete expired requests in a batch
    let deletedCount = 0;
    const batch = db.batch();
    const auditLogPromises = [];
    const deletedRequestIds = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      batch.delete(doc.ref);
      deletedRequestIds.push(doc.id);
      deletedCount++;

      console.log(`🗑️  [Cleanup] Deleting export request: ${doc.id} (userId: ${data.userId}, expiresAt: ${data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt})`);

      // Create individual audit log for EACH expired export (GDPR requirement)
      auditLogPromises.push(
          db.collection("AuditLogs").add({
            category: "data_export", // ✅ Correct category for GDPR audit
            action: "export_expired", // ✅ Correct action per RGPD_COMPLIANCE_MATRIX.md
            userId: data.userId, // ✅ Individual userId for each export
            targetUserId: null,
            resourceType: "data_export",
            resourceId: doc.id, // ✅ Individual requestId
            details: "Data export expired and deleted (24-hour retention policy)",
            severity: "info",
            ipAddress: "SYSTEM_SCHEDULED",
            userAgent: "Cloud Functions/scheduledCleanup",
            metadata: {
              requestId: doc.id,
              expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt,
              deletedAt: new Date().toISOString(),
              retentionPolicy: "24_hours",
            },
            timestamp: FieldValue.serverTimestamp(),
            eventHash: `export_expired_${doc.id}_${Date.now()}`,
            verified: true,
            expireAt: new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000), // 5 years from now
          }),
      );
    });

    // Commit all deletions
    await batch.commit();

    console.log(`✅ [Cleanup] Successfully deleted ${deletedCount} expired export request(s)`);

    // Create all individual audit logs
    await Promise.all(auditLogPromises);

    console.log(`📝 [Cleanup] Created ${auditLogPromises.length} individual audit logs for expired exports`);

    const executionTime = Date.now() - startTime;
    console.log(`⏱️  [Cleanup] Execution completed in ${executionTime}ms`);

    return {
      success: true,
      deletedCount,
      auditLogsCreated: auditLogPromises.length,
      expirationCutoff: expirationCutoff.toISOString(),
      executionTimeMs: executionTime,
    };
  } catch (error) {
    console.error("❌ [Cleanup] Error during scheduled cleanup:", error);

    // Log error to audit logs for monitoring
    try {
      await db.collection("AuditLogs").add({
        category: "retention_policy",
        action: "export_cleanup_error",
        userId: null,
        resourceType: "export_request",
        details: `Cleanup failed: ${error.message}`,
        severity: "error",
        ipAddress: "SYSTEM_SCHEDULED",
        userAgent: "Cloud Functions/scheduledCleanup",
        metadata: {
          error: error.message,
          stack: error.stack,
          executionTimeMs: Date.now() - startTime,
        },
        timestamp: FieldValue.serverTimestamp(),
        eventHash: `cleanup_error_${Date.now()}`,
        verified: true,
      });
    } catch (auditError) {
      console.error("❌ [Cleanup] Failed to log error to AuditLogs:", auditError);
    }

    throw error; // Re-throw to trigger Cloud Functions retry
  }
});
