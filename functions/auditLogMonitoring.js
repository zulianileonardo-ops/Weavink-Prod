const {onSchedule} = require("firebase-functions/v2/scheduler");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getApp} = require("firebase-admin/app");

/**
 * Monthly Audit Log Retention Monitoring Function
 *
 * GDPR Compliance: Article 5(2) - Accountability
 * - Demonstrates that 5-year retention policy is being enforced
 * - Creates audit trail of TTL effectiveness
 * - Alerts if TTL policy fails (>100 old logs found)
 *
 * Schedule: Runs monthly on the 1st at 4:00 AM UTC
 * Purpose: Monitor Firestore TTL policy effectiveness
 *
 * Documentation: See FIREBASE_SCHEDULED_CLEANUP.md
 */
exports.monitorAuditLogRetention = onSchedule({
  schedule: "0 4 1 * *", // Cron: 1st of every month at 4:00 AM UTC
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

  console.log("📊 [AuditMonitor] Starting monthly audit log retention monitoring");

  try {
    // Calculate 5-year cutoff date
    const fiveYearsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000);

    console.log(`🔍 [AuditMonitor] Searching for audit logs older than: ${fiveYearsAgo.toISOString()}`);

    // Count total audit logs
    const totalSnapshot = await db
        .collection("AuditLogs")
        .count()
        .get();

    const totalLogs = totalSnapshot.data().count;

    console.log(`📋 [AuditMonitor] Total audit logs in database: ${totalLogs}`);

    // Query for audit logs older than 5 years
    // Note: We check expireAt field to find logs that should have been deleted
    const expiredSnapshot = await db
        .collection("AuditLogs")
        .where("expireAt", "<=", fiveYearsAgo)
        .limit(101) // Limit to 101 to detect if threshold exceeded
        .get();

    const expiredCount = expiredSnapshot.size;

    console.log(`🗑️  [AuditMonitor] Found ${expiredCount} audit logs older than 5 years`);

    // Determine severity based on expired count
    let severity = "info";
    let status = "healthy";
    let message = "TTL policy working correctly - minimal old logs found";

    if (expiredCount > 100) {
      severity = "error";
      status = "unhealthy";
      message = `TTL policy may not be working - ${expiredCount}+ logs older than 5 years found`;
      console.error(`❌ [AuditMonitor] ALERT: ${message}`);
    } else if (expiredCount > 50) {
      severity = "warning";
      status = "degraded";
      message = `TTL policy working but ${expiredCount} old logs still present`;
      console.warn(`⚠️  [AuditMonitor] WARNING: ${message}`);
    } else {
      console.log(`✅ [AuditMonitor] ${message}`);
    }

    // Calculate statistics by category for old logs
    const categoryStats = {};
    expiredSnapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category || "unknown";
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    // Create summary audit log
    const summaryLog = {
      category: "retention_policy",
      action: "audit_log_retention_check",
      userId: null,
      targetUserId: null,
      resourceType: "audit_logs",
      resourceId: null,
      details: message,
      severity: severity,
      ipAddress: "SYSTEM_SCHEDULED",
      userAgent: "Cloud Functions/auditLogMonitoring",
      metadata: {
        checkDate: new Date().toISOString(),
        totalAuditLogs: totalLogs,
        expiredLogsFound: expiredCount,
        retentionPeriod: "5_years",
        fiveYearCutoff: fiveYearsAgo.toISOString(),
        ttlStatus: status,
        categoryBreakdown: categoryStats,
        executionTimeMs: Date.now() - startTime,
      },
      timestamp: FieldValue.serverTimestamp(),
      eventHash: `audit_retention_check_${new Date().getFullYear()}_${new Date().getMonth() + 1}`,
      verified: true,
      expireAt: new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000), // This log also expires in 5 years
    };

    await db.collection("AuditLogs").add(summaryLog);

    console.log("📝 [AuditMonitor] Created monthly retention summary audit log");

    const executionTime = Date.now() - startTime;
    console.log(`⏱️  [AuditMonitor] Monitoring completed in ${executionTime}ms`);

    return {
      success: true,
      totalLogs: totalLogs,
      expiredLogsFound: expiredCount,
      ttlStatus: status,
      severity: severity,
      executionTimeMs: executionTime,
    };
  } catch (error) {
    console.error("❌ [AuditMonitor] Error during monitoring:", error);

    // Log error to audit logs
    try {
      await db.collection("AuditLogs").add({
        category: "retention_policy",
        action: "audit_monitoring_error",
        userId: null,
        resourceType: "audit_logs",
        details: `Monthly monitoring failed: ${error.message}`,
        severity: "error",
        ipAddress: "SYSTEM_SCHEDULED",
        userAgent: "Cloud Functions/auditLogMonitoring",
        metadata: {
          error: error.message,
          stack: error.stack,
          executionTimeMs: Date.now() - startTime,
        },
        timestamp: FieldValue.serverTimestamp(),
        eventHash: `monitoring_error_${Date.now()}`,
        verified: true,
        expireAt: new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000),
      });
    } catch (auditError) {
      console.error("❌ [AuditMonitor] Failed to log error to AuditLogs:", auditError);
    }

    throw error; // Re-throw to trigger Cloud Functions retry
  }
});
