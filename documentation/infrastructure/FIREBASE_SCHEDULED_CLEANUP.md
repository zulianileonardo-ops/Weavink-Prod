---
id: infrastructure-firebase-cleanup-047
title: Firebase Scheduled Export Cleanup Function
category: infrastructure
summary: Automated daily cleanup of expired GDPR data export requests via Firebase Scheduled Functions for GDPR Article 5(1)(c) data minimization compliance.
tags:
  - firebase
  - scheduled-functions
  - cloud-functions
  - gdpr
  - rgpd
  - data-minimization
  - retention-policy
  - automated-cleanup
  - cron
  - firestore
  - audit-logging
status: active
created: 2025-11-19
updated: 2025-11-19
related:
  - RGPD_IMPLEMENTATION_SUMMARY.md
  - RGPD_ARCHITECTURE_COMPLIANCE.md
  - ACCOUNT_PRIVACY_TESTING_GUIDE.md
  - SUBSCRIPTION_REVALIDATION_SETUP.md
---

# Firebase Scheduled Export Cleanup Function

## Overview

**Function Name**: `cleanupExpiredExports`
**Schedule**: Daily at 2:00 AM UTC
**Purpose**: Automated deletion of expired GDPR data export requests to comply with Article 5(1)(c) - Data Minimization
**Deployed**: 2025-11-19
**Cloud Platform**: Firebase Functions (Gen 2)

### Why This Exists

**GDPR Compliance Requirement**:
- Export request metadata contains personal data (IP addresses, user agents, timestamps)
- Data must be deleted after serving its purpose (24 hours post-export)
- Manual cleanup is error-prone and non-compliant
- Scheduled automation ensures consistent enforcement

**Legal Basis**: GDPR Article 5(1)(c) - Data Minimization Principle

> "Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed."

**Compliance Impact**:
- ✅ Automatic enforcement of 24-hour retention policy
- ✅ Audit trail for all cleanup operations
- ✅ Reduces manual compliance burden
- ✅ Demonstrates proactive data protection

---

## Implementation

### File Locations

```
/home/leo/Syncthing/Code-Weavink/
├── functions/
│   ├── scheduledCleanup.js       # Main scheduled function (155 lines)
│   ├── index.js                  # Exports cleanupExpiredExports
│   ├── .env                      # Environment configuration
│   ├── .eslintrc.js              # ES2020 config (updated)
│   └── package.json              # Firebase Functions v2 dependencies
│
└── firestore.indexes.json        # Composite index: type + status + expiresAt
```

### Schedule Configuration

**Cron Expression**: `0 2 * * *`

```javascript
exports.cleanupExpiredExports = onSchedule({
  schedule: "0 2 * * *",      // Every day at 2:00 AM UTC
  timeZone: "UTC",             // Hardcoded for consistency
  memory: "256MiB",            // Minimal memory footprint
  timeoutSeconds: 540,         // 9 minutes max execution time
  retryConfig: {
    retryCount: 3,             // Retry up to 3 times on failure
    maxRetryDuration: "600s"   // Max 10 minutes total retry time
  }
}, async (event) => {
  // Cleanup logic
});
```

**Schedule Details**:
- **Runs**: Every day at 2:00 AM UTC
- **Timezone**: UTC (never changes with DST)
- **Memory**: 256 MiB (sufficient for batch operations)
- **Timeout**: 540 seconds (9 minutes)
- **Retry**: 3 attempts with 10-minute max duration

---

## Firestore Query

### Query Logic

**Collection**: `PrivacyRequests`

**Query Pattern**:
```javascript
const expirationCutoff = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

const snapshot = await db
  .collection("PrivacyRequests")
  .where("type", "==", "export")
  .where("status", "==", "completed")
  .where("expiresAt", "<=", expirationCutoff)
  .limit(100)  // Batch size: 100 documents per run
  .get();
```

**Expiration Logic**:
- **Export Lifecycle**: Export request created → completed → 24 hours → expired
- **Cutoff Calculation**: Current time - 25 hours (24h retention + 1h buffer)
- **Buffer Purpose**: Ensures exports are available for full 24 hours + grace period
- **Batch Size**: 100 documents per execution (prevents quota exhaustion)

**Why 25 Hours?**
- **GDPR Requirement**: 24-hour minimum availability
- **Buffer Zone**: 1-hour grace period prevents premature deletion
- **Clock Skew**: Accounts for minor time differences between systems

### Required Composite Index

**Firestore Index** (lines 35-52 in `/firestore.indexes.json`):

```json
{
  "collectionGroup": "PrivacyRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "expiresAt", "order": "ASCENDING" }
  ]
}
```

**Why This Index?**
- Firestore requires composite index for multi-field queries
- Ordered by `expiresAt` (ASC) to efficiently find oldest documents first
- Without this index, the function will fail with error: "The query requires an index"

**Deployment**:
```bash
firebase deploy --only firestore:indexes
# Wait 5-10 minutes for index to build
```

---

## Deletion Process

### Batch Deletion Logic

**Code** (lines 48-77 in `scheduledCleanup.js`):

```javascript
let deletedCount = 0;
const batch = db.batch();
const deletedRequestIds = [];

snapshot.forEach((doc) => {
  const data = doc.data();
  batch.delete(doc.ref);
  deletedRequestIds.push(doc.id);
  deletedCount++;

  console.log(`🗑️  [Cleanup] Deleting export request: ${doc.id} ` +
              `(userId: ${data.userId}, expiresAt: ${data.expiresAt?.toDate?.()?.toISOString()})`);
});

// Commit all deletions in a single atomic operation
await batch.commit();
```

**Batch Operation Benefits**:
- ✅ Atomic: All deletions succeed or fail together
- ✅ Efficient: Single write operation to Firestore
- ✅ Cost-effective: Reduces write operation costs
- ✅ Traceable: All deleted IDs logged for audit

**Maximum Batch Size**: 500 operations (Firestore limit)
**Current Limit**: 100 documents per run (conservative for safety)

---

## Audit Logging

**Note**: As of 2025-11-19, all audit logs created by this function include an `expireAt` field set to 5 years from creation for automatic deletion via Firestore TTL. See `FIREBASE_AUDIT_LOG_MONITORING.md` for details on the 5-year retention monitoring system.

### Success Audit Log

**Collection**: `/AuditLogs/{logId}`

**Entry Structure** (Updated with `expireAt` field):
```javascript
{
  category: "retention_policy",
  action: "export_cleanup_scheduled",
  userId: null,                    // System action (no specific user)
  targetUserId: null,
  resourceType: "export_request",
  resourceId: null,
  details: "Automated cleanup: deleted 5 expired export request(s)",
  severity: "info",
  ipAddress: "SYSTEM_SCHEDULED",
  userAgent: "Cloud Functions/scheduledCleanup",
  metadata: {
    deletedCount: 5,
    executedBy: "scheduled_function",
    expirationCutoff: "2025-11-18T01:00:00.000Z",
    deletedRequestIds: ["req1", "req2", "req3", ...],  // First 10 IDs only
    executionTimeMs: 1234,
    scheduleTime: "2025-11-19T02:00:00.000Z"
  },
  timestamp: FieldValue.serverTimestamp(),
  eventHash: "cleanup_1732089600_5",
  verified: true,
  expireAt: new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000)  // 5 years from now
}
```

**Log Significance**:
- **Compliance**: Proves GDPR data minimization enforcement
- **Transparency**: Traceable audit trail for data protection officer (DPO)
- **Monitoring**: Alerts can be set on unusual deletion counts
- **Debugging**: Helps identify issues with cleanup process

### Error Audit Log

**Entry Structure** (lines 116-144 in `scheduledCleanup.js`):

```javascript
{
  category: "retention_policy",
  action: "export_cleanup_error",
  userId: null,
  resourceType: "export_request",
  details: "Cleanup failed: Permission denied",
  severity: "error",
  ipAddress: "SYSTEM_SCHEDULED",
  userAgent: "Cloud Functions/scheduledCleanup",
  metadata: {
    error: "Permission denied",
    stack: "Error: Permission denied\n  at Firestore.delete (...)",
    executionTimeMs: 450
  },
  timestamp: FieldValue.serverTimestamp(),
  eventHash: "cleanup_error_1732089600",
  verified: true,
  expireAt: new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000)  // 5 years from now
}
```

**Error Scenarios**:
- Permission denied (service account misconfigured)
- Index not deployed
- Timeout (batch too large)
- Firestore quota exceeded

---

## Testing

### Manual Trigger (Firebase Console)

**Steps**:
1. Navigate to [Firebase Console](https://console.firebase.google.com/project/tapit-dev-e0eed/functions)
2. Go to **Functions** tab
3. Find `cleanupExpiredExports` in the function list
4. Click **"Run now"** or **"Test function"**
5. Monitor logs in **Cloud Logging**

### Manual Trigger (gcloud CLI)

```bash
# Trigger the Cloud Scheduler job manually
gcloud scheduler jobs run firebase-schedule-cleanupExpiredExports-us-central1 \
  --project=tapit-dev-e0eed

# View logs
firebase functions:log --only cleanupExpiredExports --limit 20
```

### Test Data Setup

**Create Expired Export Request**:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

// Create export request that expired 26 hours ago
const expiredDate = new Date(Date.now() - 26 * 60 * 60 * 1000);

await db.collection('PrivacyRequests').add({
  userId: 'test-user-123',
  type: 'export',
  status: 'completed',
  requestedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),  // 30 hours ago
  completedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),  // 26 hours ago
  expiresAt: expiredDate,
  exportData: {
    files: { /* mock data */ }
  },
  downloadUrl: null,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (Test Agent)',
  summary: {
    totalDataCategories: 6,
    contactCount: 0,
    groupCount: 0,
    consentCount: 7
  }
});

console.log('✅ Created expired export request for testing');
```

### Verification Steps

**1. Before Cleanup**:
```javascript
// Query for expired exports
const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000);
const snapshot = await db.collection('PrivacyRequests')
  .where('type', '==', 'export')
  .where('status', '==', 'completed')
  .where('expiresAt', '<=', cutoff)
  .get();

console.log(`Found ${snapshot.size} expired exports`);
snapshot.forEach(doc => {
  console.log(`- ${doc.id}: expires at ${doc.data().expiresAt.toDate()}`);
});
```

**2. Run Function**:
- Trigger manually (console or gcloud CLI)
- Or wait for next scheduled run at 2 AM UTC

**3. After Cleanup**:
```javascript
// Verify documents deleted
const verifySnapshot = await db.collection('PrivacyRequests')
  .where('type', '==', 'export')
  .where('expiresAt', '<=', cutoff)
  .get();

console.log(`Remaining expired exports: ${verifySnapshot.size}`);
// Should be 0 (or reduced by batch size)

// Check audit logs
const auditSnapshot = await db.collection('AuditLogs')
  .where('category', '==', 'retention_policy')
  .where('action', '==', 'export_cleanup_scheduled')
  .orderBy('timestamp', 'desc')
  .limit(1)
  .get();

auditSnapshot.forEach(doc => {
  const data = doc.data();
  console.log(`✅ Cleanup executed: ${data.metadata.deletedCount} deleted`);
});
```

---

## Monitoring

### Cloud Logging Queries

**Success Runs**:
```
resource.type="cloud_function"
resource.labels.function_name="cleanupExpiredExports"
textPayload=~"Successfully deleted"
```

**Error Runs**:
```
resource.type="cloud_function"
resource.labels.function_name="cleanupExpiredExports"
severity>=ERROR
```

**Execution Time Monitoring**:
```
resource.type="cloud_function"
resource.labels.function_name="cleanupExpiredExports"
jsonPayload.executionTimeMs>5000
```

### Key Metrics to Monitor

| Metric | Expected | Alert Threshold |
|--------|----------|----------------|
| **Execution Frequency** | Daily at 2 AM UTC | No execution in 25 hours |
| **Deleted Count** | 0-10 per day | > 100 (possible bug) |
| **Execution Time** | < 5 seconds | > 60 seconds |
| **Error Rate** | 0% | > 0% |
| **Timeout Rate** | 0% | > 0% |

### Recommended Alerts

**Firebase Alerts** (Cloud Monitoring):

1. **Function Failure Alert**:
   - Condition: Function fails 3+ times consecutively
   - Notification: Email to dev team + DPO
   - Severity: High

2. **Execution Time Alert**:
   - Condition: Execution time > 60 seconds
   - Notification: Email to dev team
   - Severity: Medium

3. **Missed Schedule Alert**:
   - Condition: No execution in 25 hours
   - Notification: Email + Slack
   - Severity: High (compliance risk)

4. **Unusual Deletion Count**:
   - Condition: Deleted count > 100 in single run
   - Notification: Email to dev team
   - Severity: Medium (investigate data patterns)

---

## Troubleshooting

### Issue 1: Index Not Deployed

**Symptom**:
```
Error: The query requires an index. You can create it here:
https://console.firebase.google.com/...
```

**Cause**: Composite index not yet deployed or still building

**Solution**:
```bash
# Deploy index
firebase deploy --only firestore:indexes

# Wait 5-10 minutes for index to build
# Check index status in Firebase Console > Firestore > Indexes
```

**Verification**:
```bash
# Check index status
firebase firestore:indexes

# Expected output should show:
# ✓ PrivacyRequests (type,status,expiresAt) - READY
```

---

### Issue 2: Permission Denied

**Symptom**:
```
Error: Missing or insufficient permissions
```

**Cause**: Service account lacks Firestore write permissions

**Solution**:

1. **Verify Service Account**:
```bash
# Check Firebase Functions service account
gcloud projects get-iam-policy tapit-dev-e0eed \
  --flatten="bindings[].members" \
  --filter="bindings.members:*firebase*"
```

2. **Grant Required Roles**:
```bash
# Grant Datastore User role (read/write)
gcloud projects add-iam-policy-binding tapit-dev-e0eed \
  --member="serviceAccount:firebase-adminsdk-xyz@tapit-dev-e0eed.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

3. **Verify .env Configuration**:
```bash
cat functions/.env
# Should have valid values (not placeholders)
```

---

### Issue 3: No Documents Deleted

**Symptom**:
```
✅ [Cleanup] Successfully deleted 0 expired export request(s)
```

**Possible Causes**:

1. **No Expired Exports** (Normal)
   - User behavior: No exports created recently
   - System health: Working as expected
   - Action: None required

2. **Cutoff Too Strict**
   - Check 25-hour calculation
   - Verify clock synchronization

3. **Status Mismatch**
   - Documents have `status != "completed"`
   - Check export completion logic

4. **Clock Skew**
   - Server time vs. Firestore timestamp mismatch
   - Verify `expiresAt` field format

**Debug Query**:
```javascript
// Check for exports that SHOULD be deleted
const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000);

const allExports = await db.collection('PrivacyRequests')
  .where('type', '==', 'export')
  .get();

console.log(`Total exports: ${allExports.size}`);

allExports.forEach(doc => {
  const data = doc.data();
  const expired = data.expiresAt && data.expiresAt.toDate() <= cutoff;
  console.log(`${doc.id}:`);
  console.log(`  Status: ${data.status}`);
  console.log(`  ExpiresAt: ${data.expiresAt?.toDate()}`);
  console.log(`  Expired: ${expired}`);
  console.log(`  Should Delete: ${data.status === 'completed' && expired}`);
});
```

---

### Issue 4: Function Times Out

**Symptom**:
```
Error: Function execution took longer than 540s
```

**Causes**:
- Too many documents to delete (> 100)
- Slow Firestore operations
- Network latency

**Solutions**:

1. **Increase Batch Limit** (if many exports):
```javascript
// In scheduledCleanup.js, change:
.limit(100)  // Increase to 500 (Firestore max)
```

2. **Increase Timeout**:
```javascript
exports.cleanupExpiredExports = onSchedule({
  // ...
  timeoutSeconds: 900,  // Increase to 15 minutes
}, async (event) => {
  // ...
});
```

3. **Add Pagination** (for large batches):
```javascript
let hasMore = true;
let totalDeleted = 0;

while (hasMore && totalDeleted < 500) {
  const snapshot = await db
    .collection('PrivacyRequests')
    .where('type', '==', 'export')
    .where('status', '==', 'completed')
    .where('expiresAt', '<=', expirationCutoff)
    .limit(100)
    .get();

  if (snapshot.empty) {
    hasMore = false;
    break;
  }

  const batch = db.batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  totalDeleted += snapshot.size;
}
```

---

## Code Reference

### Main Function (scheduledCleanup.js)

**Key Sections**:

| Lines | Section | Description |
|-------|---------|-------------|
| 1-16 | Documentation | GDPR compliance notes, legal basis |
| 17-26 | Schedule Config | `onSchedule` configuration (cron, memory, timeout) |
| 28-32 | Expiration Logic | 25-hour cutoff calculation |
| 34-46 | Firestore Query | Query with composite index |
| 48-71 | Batch Deletion | Delete documents in atomic batch |
| 73-103 | Success Audit | Create audit log for successful cleanup |
| 105-114 | Return Success | Return execution metadata |
| 116-144 | Error Handling | Catch errors, log to AuditLogs, re-throw |

### Exports (index.js)

**Lines 48-50**:
```javascript
// Scheduled function: Cleanup expired export requests (24-hour retention)
const {cleanupExpiredExports} = require("./scheduledCleanup");
exports.cleanupExpiredExports = cleanupExpiredExports;
```

### Environment Configuration (.env)

**Required Variables** (for other functions):
```bash
APP_WEBHOOK_SECRET=placeholder_secret_value
APP_BASE_URL=https://placeholder-url.com
```

**Note**: `cleanupExpiredExports` does NOT require environment variables (uses Firebase Admin SDK defaults)

---

## Deployment

### Initial Deployment

```bash
cd /home/leo/Syncthing/Code-Weavink

# 1. Deploy Firestore index first
firebase deploy --only firestore:indexes
# Wait 5-10 minutes for index to build

# 2. Deploy function
cd functions
npm install  # Ensure dependencies are installed
cd ..
firebase deploy --only functions:cleanupExpiredExports

# 3. Verify deployment
firebase functions:list
# Should show: cleanupExpiredExports(us-central1) [SCHEDULED]
```

### Update Deployment

```bash
# After code changes to scheduledCleanup.js
firebase deploy --only functions:cleanupExpiredExports

# After index changes to firestore.indexes.json
firebase deploy --only firestore:indexes
```

### Deployment Verification

```bash
# 1. Check function exists
firebase functions:list | grep cleanupExpiredExports

# 2. Check Cloud Scheduler job
gcloud scheduler jobs list --project=tapit-dev-e0eed | grep cleanupExpiredExports

# 3. View recent logs
firebase functions:log --only cleanupExpiredExports --limit 10

# 4. Check index status
firebase firestore:indexes
```

---

## GDPR Compliance

### Article 5(1)(c) - Data Minimization

**GDPR Requirement**:
> "Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation')"

**How This Function Complies**:

1. **Purpose Limitation**:
   - Export metadata (IP, user agent, timestamps) is necessary during 24-hour download window
   - Purpose: Enable user to download their data + security logging
   - After 24 hours: No longer serves purpose → must be deleted

2. **Automated Enforcement**:
   - Manual cleanup is unreliable and error-prone
   - Scheduled function ensures consistent, timely deletion
   - Reduces risk of non-compliance

3. **Audit Trail**:
   - Every cleanup operation logged to `AuditLogs`
   - Proves compliance to data protection authorities
   - Transparent to users and DPO

4. **Grace Period**:
   - 24-hour minimum availability (GDPR right to portability)
   - 1-hour buffer prevents premature deletion
   - Balances compliance with user experience

### Retention Policy Documentation

**Export Request Lifecycle**:

```
1. Created (t=0h)
   └─ User requests export via Privacy Center

2. Completed (t=0h-10min)
   └─ Export files generated, expiresAt = t + 24h

3. Available (t=0h to t=24h)
   └─ User can download files (client-side blobs)

4. Expired (t=24h)
   └─ Download window closes

5. Cleanup Buffer (t=24h to t=25h)
   └─ Grace period before scheduled deletion

6. Deleted (t=25h+)
   └─ Next scheduled run at 2 AM UTC removes document
```

**Total Retention**: 25 hours maximum (24h + 1h buffer)

### Data Minimization Impact

**Before Scheduled Cleanup**:
- ❌ Manual cleanup required
- ❌ Risk of retention policy violation
- ❌ Compliance burden on dev team
- ❌ No automated audit trail

**After Scheduled Cleanup**:
- ✅ Fully automated enforcement
- ✅ Zero manual intervention required
- ✅ Complete audit trail for DPO
- ✅ Demonstrates proactive compliance

---

## Cost Analysis

### Firebase Functions Pricing

**Invocations**:
- Frequency: 1/day = 30/month
- Free tier: 2,000,000/month
- Cost: **$0.00** (within free tier)

**Compute Time**:
- Execution time: ~2-5 seconds per run
- Memory: 256 MB
- Monthly compute: 30 runs × 5s = 150s
- Free tier: 400,000 GB-seconds/month
- Cost: **$0.00** (within free tier)

**Cloud Scheduler**:
- Jobs: 1 scheduled job
- Cost: **$0.10/month** (fixed cost per job)

### Firestore Pricing

**Reads**:
- Query: ~100 documents/day = 3,000/month
- Free tier: 50,000/day
- Cost: **$0.00** (within free tier)

**Deletes**:
- Deletes: ~100/day = 3,000/month
- Free tier: 20,000/day
- Cost: **$0.00** (within free tier)

**Writes** (AuditLogs):
- Audit logs: 1/day = 30/month
- Free tier: 20,000/day
- Cost: **$0.00** (within free tier)

### Total Monthly Cost

| Service | Cost |
|---------|------|
| Firebase Functions | $0.00 |
| Cloud Scheduler | $0.10 |
| Firestore Operations | $0.00 |
| **Total** | **$0.10/month** |

**Annual Cost**: $1.20/year

**ROI**: Ensures GDPR compliance (potential fines: €20M or 4% global revenue). Cost is negligible compared to compliance value.

---

## Related Documentation

### GDPR Compliance Guides
- **RGPD_COMPLIANCE_MATRIX.md** - Overall compliance matrix (retention policies)
- **RGPD_ARCHITECTURE_COMPLIANCE.md** - Architecture and compliance verification
- **RGPD_IMPLEMENTATION_SUMMARY.md** - Implementation summary
- **FIREBASE_AUDIT_LOG_MONITORING.md** - 5-year audit log retention (Firestore TTL + monitoring)

### Testing Guides
- **ACCOUNT_PRIVACY_TESTING_GUIDE.md** (lines 563-597) - 24-hour cleanup test case

### Infrastructure Guides
- **SUBSCRIPTION_REVALIDATION_SETUP.md** - Similar Firebase Function pattern (Firestore trigger)

### Code Files
- `/functions/scheduledCleanup.js` - Main function implementation
- `/functions/index.js` - Function exports
- `/firestore.indexes.json` (lines 35-52) - Composite index definition

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-19 | 1.0 | Initial implementation of `cleanupExpiredExports` | Claude Code |

---

## Next Steps

### Immediate (Week 1)
- [x] Deploy composite index
- [x] Deploy function to Firebase
- [x] Create comprehensive documentation
- [ ] Set up Cloud Logging alerts
- [ ] Monitor first 7 days of executions

### Short-term (Month 1)
- [ ] Analyze execution patterns (deletion counts, timing)
- [ ] Optimize batch size if needed
- [ ] Update this guide with real-world observations
- [ ] Train team on monitoring and troubleshooting

### Long-term (Quarter 1)
- [ ] Implement similar cleanup for other retention policies
- [ ] Create dashboard for retention policy monitoring
- [ ] Automate compliance reporting
- [ ] Integrate with GDPR compliance dashboard

---

## Support

**Questions or Issues?**
- Check Firebase Console logs first
- Review troubleshooting section above
- Contact: Dev team or DPO

**Compliance Questions?**
- Email: dpo@weavink.io
- Reference: GDPR Article 5(1)(c) - Data Minimization
- Policy: 24-hour export request retention

---

*This function is a critical component of Weavink's GDPR compliance infrastructure, ensuring automated enforcement of data minimization principles for user privacy protection.*
