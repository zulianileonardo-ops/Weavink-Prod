# Contact Anonymization - Manual Test Guide
**GDPR Article 17 Compliance Testing**

**Status**: Active
**Created**: 2025-11-20
**Phase**: Phase 7 - Manual Testing
**Related Guide**: `CONTACT_ANONYMIZATION_IMPLEMENTATION_GUIDE.md`

---

## Purpose

This guide provides step-by-step manual testing procedures to verify the contact anonymization system works correctly in production scenarios.

**Prerequisites**:
- Development environment running (`npm run dev`)
- Firebase Admin access
- Pinecone console access
- Two test user accounts (User A and User B)

---

## Test Scenarios Overview

| Test | Scenario | Duration | Critical |
|------|----------|----------|----------|
| 1 | End-to-end anonymization flow | 15 min | ✅ Yes |
| 2 | Firestore verification | 10 min | ✅ Yes |
| 3 | Pinecone verification | 10 min | ✅ Yes |
| 4 | Semantic search functionality | 10 min | ✅ Yes |
| 5 | Edge cases & idempotency | 10 min | ⚠️ Medium |
| 6 | Multi-language UI | 5 min | ⚠️ Medium |

**Total estimated time**: ~60 minutes

---

## Test 1: End-to-End Anonymization Flow

**Objective**: Verify complete anonymization workflow from account deletion to contact anonymization.

### Setup
1. Create two test accounts:
   - **User A**: `test-user-a@example.com` (will be deleted)
   - **User B**: `test-user-b@example.com` (contact owner)

2. Have User B add User A as a contact:
   - User B receives User A's business card or contact form
   - User B saves contact with full details:
     - Name: "John Test"
     - Email: test-user-a@example.com
     - Phone: +1234567890
     - Company: "Test Corp"
     - Job Title: "CEO"
     - LinkedIn: https://linkedin.com/in/test
     - Notes: "Met at conference 2024"
     - Tags: ["VIP", "potential-client"]

### Test Steps

**Step 1: Verify Initial Contact**
```
1. Login as User B
2. Navigate to Contacts page
3. Find "John Test" contact
4. Verify all fields are populated correctly
5. Take screenshot (Before)
```

**Step 2: User A Deletes Account**
```
1. Login as User A
2. Go to Settings → Privacy
3. Click "Delete Account"
4. Skip grace period (or wait 30 days in production)
5. Confirm account deletion
```

**Step 3: Trigger Backend Anonymization**
```
The account deletion service should automatically:
- Call removeContactFromUser() for User B
- Anonymize User A's contact in User B's list
- Anonymize Pinecone vector metadata
```

**Step 4: Verify Anonymized Contact**
```
1. Login as User B again
2. Navigate to Contacts page
3. Find anonymized contact (should show "[Contact Deleted - YYYY-MM-DD]")
4. Click to view details
5. Take screenshot (After)
```

### Expected Results

**PII Fields (ANONYMIZED)**:
- ✅ Name: `[Contact Deleted - 2025-11-20]`
- ✅ Email: `[deleted]`
- ✅ Phone: `[deleted]`
- ✅ LinkedIn: Removed from dynamicFields
- ✅ userId: `null`
- ✅ weavinkUserId: `null`

**Business Context (PRESERVED)**:
- ✅ Company: `Test Corp`
- ✅ Job Title: `CEO`

**User B Data (PRESERVED)**:
- ✅ Notes: `Met at conference 2024` + deletion notice
- ✅ Tags: `["VIP", "potential-client"]`
- ✅ Deletion notice appended:
  ```
  ⚠️ This contact deleted their Weavink account on 2025-11-20.
  Some contact details have been removed for privacy compliance.
  ```

**Metadata**:
- ✅ `isAnonymized: true`
- ✅ `anonymizedDate: "2025-11-20T..."`
- ✅ `originalName: "John Test"` (for audit only)

### Pass Criteria
- [ ] All PII fields anonymized
- [ ] Business context preserved
- [ ] User B notes/tags intact
- [ ] Deletion notice visible
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## Test 2: Firestore Verification

**Objective**: Verify contact document is correctly updated in Firestore.

### Test Steps

**Step 1: Access Firestore Console**
```
1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to: Contacts → {UserB_ID} → contacts array
```

**Step 2: Find Anonymized Contact**
```
1. Search for contact with isAnonymized: true
2. Click to view full document
```

**Step 3: Verify Field Values**
```json
{
  "id": "contact_abc123",
  "name": "[Contact Deleted - 2025-11-20]",
  "email": "[deleted]",
  "phone": "[deleted]",
  "phoneNumbers": [],
  "website": "[deleted]",
  "message": "[deleted]",
  "userId": null,
  "weavinkUserId": null,

  "company": "Test Corp",
  "jobTitle": "CEO",

  "location": {
    "latitude": null,
    "longitude": null,
    "address": "[deleted]",
    "venue": "TechConf 2025",
    "accuracy": 10
  },

  "dynamicFields": {
    "department": "Sales",
    "industry": "Technology"
    // NO: linkedin, twitter, personalEmail, etc.
  },

  "details": [],

  "metadata": {
    "language": "en",
    "submissionTime": "2024-01-01T10:00:00Z"
    // NO: ip, userAgent, sessionId, etc.
  },

  "notes": "Met at conference 2024\n\n⚠️ This contact deleted their Weavink account on 2025-11-20...",
  "tags": ["VIP", "potential-client"],

  "isAnonymized": true,
  "anonymizedDate": "2025-11-20T15:30:00.000Z",
  "originalName": "John Test",

  "status": "active",
  "source": "business-card-scan",
  "submittedAt": "2024-01-01T10:00:00Z",
  "lastModified": "2025-11-20T15:30:00.000Z"
}
```

### Pass Criteria
- [ ] All PII fields set to `[deleted]` or `null`
- [ ] Business context fields intact
- [ ] `isAnonymized: true` present
- [ ] `anonymizedDate` set correctly
- [ ] User B notes/tags preserved
- [ ] Technical metadata preserved (status, source, timestamps)

---

## Test 3: Pinecone Verification

**Objective**: Verify vector metadata is anonymized while preserving embeddings.

### Test Steps

**Step 1: Access Pinecone Console**
```
1. Login to Pinecone dashboard
2. Select index: "weavink-contacts"
3. Go to "Vectors" tab
```

**Step 2: Query for Anonymized Vector**
```
1. Use vector ID format: {userId}_{contactId}
2. Example: user_abc123_contact_xyz789
3. Fetch vector by ID
```

**Step 3: Verify Vector Data**
```json
{
  "id": "user_abc123_contact_xyz789",
  "values": [0.123, -0.456, ...],  // 1536 dimensions - PRESERVED
  "metadata": {
    "userId": "user_abc123",
    "contactId": "contact_xyz789",
    "name": "[Contact Deleted]",

    "company": "Test Corp",
    "jobTitle": "CEO",
    "department": "Sales",
    "industry": "Technology",

    "notes": "Met at conference 2024...",
    "tags": "VIP,potential-client",

    "isAnonymized": true,
    "anonymizedDate": "2025-11-20",
    "timestamp": 1700493000000

    // NO PII: email, phone, linkedin, twitter, etc.
  }
}
```

### Pass Criteria
- [ ] Vector embeddings preserved (1536 dimensions)
- [ ] Metadata contains NO PII (no email, phone, social media)
- [ ] Business context present (company, jobTitle, department)
- [ ] User B data present (notes, tags)
- [ ] `isAnonymized: true` in metadata
- [ ] Name set to "[Contact Deleted]"

---

## Test 4: Semantic Search Functionality

**Objective**: Verify semantic search still works with anonymized vectors.

### Setup
```
User B should have multiple contacts:
- 3 normal contacts (not anonymized)
- 1 anonymized contact (from Test 1)
```

### Test Steps

**Step 1: Search by Business Context**
```
1. Login as User B
2. Go to Contacts page
3. Use semantic search: "CEO at Test Corp"
4. Verify anonymized contact appears in results
```

**Step 2: Search by Industry**
```
1. Search: "technology industry"
2. Verify anonymized contact appears if industry matches
```

**Step 3: Search by Notes**
```
1. Search: "conference 2024"
2. Verify anonymized contact appears (User B's notes preserved)
```

**Step 4: Verify PII Not Searchable**
```
1. Search: "test-user-a@example.com" (deleted email)
2. Verify contact DOES NOT appear (PII removed)

3. Search: "+1234567890" (deleted phone)
4. Verify contact DOES NOT appear (PII removed)
```

### Pass Criteria
- [ ] Semantic search works with anonymized contacts
- [ ] Business context searchable (company, job title, industry)
- [ ] User B notes searchable
- [ ] PII NOT searchable (email, phone, social media)
- [ ] Search results rank correctly
- [ ] No errors in search functionality

---

## Test 5: Edge Cases & Idempotency

**Objective**: Verify system handles edge cases gracefully.

### Test Case 5.1: Minimal Data Contact

**Setup**: Create contact with minimal fields
```json
{
  "id": "minimal_contact",
  "name": "Jane Minimal",
  "email": "jane@example.com"
  // No other fields
}
```

**Test**: Delete account and verify anonymization
```
Expected Result:
- name: "[Contact Deleted - YYYY-MM-DD]"
- email: "[deleted]"
- notes: Deletion notice only (no original notes)
- All optional fields remain null/undefined
```

**Pass**: [ ] Minimal contact anonymized without errors

---

### Test Case 5.2: Missing User ID

**Setup**: Create contact without userId, createdBy, or generatedForUser

**Test**: Attempt anonymization

**Expected Result**: Error logged, contact anonymization skipped gracefully

**Pass**: [ ] Missing userId handled gracefully (no crash)

---

### Test Case 5.3: Idempotent Anonymization

**Setup**: Use already-anonymized contact from Test 1

**Test**: Run anonymization again on same contact

**Expected Result**:
- name: Still `[Contact Deleted - YYYY-MM-DD]`
- email: Still `[deleted]`
- isAnonymized: Still `true`
- No duplicate deletion notices
- No errors

**Pass**: [ ] Re-anonymizing has no adverse effects

---

### Test Case 5.4: Null Location

**Setup**: Contact with `location: null`

**Test**: Anonymize contact

**Expected Result**: location remains null, no errors

**Pass**: [ ] Null location handled correctly

---

### Test Case 5.5: Empty Dynamic Fields

**Setup**: Contact with `dynamicFields: {}`

**Test**: Anonymize contact

**Expected Result**: dynamicFields remains {}, no errors

**Pass**: [ ] Empty objects handled correctly

---

### Test Case 5.6: Contact Already Deleted from Firestore

**Setup**: Manually delete contact from Firestore

**Test**: Attempt to anonymize non-existent contact

**Expected Result**:
- Warning logged: "No contacts document for user"
- Function exits gracefully
- No errors thrown

**Pass**: [ ] Missing contact handled gracefully

---

## Test 6: Multi-Language UI

**Objective**: Verify translations work correctly for all 5 languages.

### Test Steps

**For each language (en, fr, es, ch, vm)**:

1. **Change Language**
   ```
   Settings → Language → Select language
   ```

2. **View Anonymized Contact**
   ```
   Navigate to Contacts → Click anonymized contact
   ```

3. **Verify Translations**
   - Placeholder: `[deleted]` or localized equivalent
   - Deletion notice in contact notes (in correct language)
   - "Anonymized Contact" label (if shown in UI)
   - Tooltip (if implemented)

### Expected Translations

| Language | Placeholder | Deleted Name | Deletion Notice |
|----------|-------------|--------------|-----------------|
| English (en) | [deleted] | [Contact Deleted - 2025-11-20] | This contact deleted their Weavink account on... |
| French (fr) | [supprimé] | [Contact Supprimé - 2025-11-20] | Ce contact a supprimé son compte Weavink le... |
| Spanish (es) | [eliminado] | [Contacto Eliminado - 2025-11-20] | Este contacto eliminó su cuenta de Weavink el... |
| Chinese (ch) | [已删除] | [联系人已删除 - 2025-11-20] | 此联系人已于...删除其Weavink账户 |
| Vietnamese (vm) | [đã xóa] | [Liên Hệ Đã Xóa - 2025-11-20] | Liên hệ này đã xóa tài khoản Weavink của họ vào... |

### Pass Criteria
- [ ] English translations display correctly
- [ ] French translations display correctly
- [ ] Spanish translations display correctly
- [ ] Chinese translations display correctly
- [ ] Vietnamese translations display correctly
- [ ] No missing translation keys

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Development environment running (`npm run dev`)
- [ ] Firebase emulator OR development database
- [ ] Pinecone development index
- [ ] Two test user accounts created
- [ ] Browser console open for error monitoring
- [ ] Server logs visible

### Test Execution
- [ ] Test 1: End-to-end flow ✅
- [ ] Test 2: Firestore verification ✅
- [ ] Test 3: Pinecone verification ✅
- [ ] Test 4: Semantic search ✅
- [ ] Test 5: Edge cases (all 6 sub-tests) ✅
- [ ] Test 6: Multi-language UI ✅

### Post-Test Validation
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] All Firestore documents valid
- [ ] All Pinecone vectors valid
- [ ] Performance acceptable (<5s for anonymization)
- [ ] Screenshots captured for documentation

---

## Known Limitations

1. **Grace Period**: In production, account deletion has 30-day grace period
2. **Pinecone Delay**: Vector anonymization may take 1-2 seconds to propagate
3. **Cache**: Browser may cache old contact data (hard refresh with Ctrl+F5)
4. **Audit Trail**: `originalName` field visible in Firestore but not in UI

---

## Troubleshooting

### Contact Not Anonymized

**Symptoms**: After account deletion, contact still shows original data

**Possible Causes**:
1. Account deletion service not triggered
2. removeContactFromUser() function error
3. Browser cache showing old data

**Solutions**:
1. Check server logs for deletion flow
2. Manually trigger: `removeContactFromUser(ownerUserId, deletedUserId, ...)`
3. Hard refresh browser (Ctrl+F5)

---

### Semantic Search Not Working

**Symptoms**: Anonymized contact not appearing in search results

**Possible Causes**:
1. Pinecone vector not updated
2. Search index not refreshed
3. Metadata missing required fields

**Solutions**:
1. Check Pinecone console for vector metadata
2. Wait 30 seconds for Pinecone index refresh
3. Re-run vector anonymization manually

---

### Translation Missing

**Symptoms**: UI shows translation key instead of text (e.g., "privacy.contact_anonymization.placeholder")

**Possible Causes**:
1. Translation file not updated
2. i18n cache not cleared
3. Wrong translation key used in code

**Solutions**:
1. Verify JSON files: `/public/locales/{lang}/common.json`
2. Restart dev server
3. Check translation key path

---

## Success Criteria Summary

**All tests must pass with**:
- ✅ 17 PII fields anonymized
- ✅ 13+ business context fields preserved
- ✅ User B notes/tags intact
- ✅ Semantic search functional
- ✅ No errors in logs
- ✅ All 5 languages working
- ✅ Idempotent operations
- ✅ Edge cases handled gracefully

**GDPR Article 17 Compliance**: ✅ Verified

---

## Test Report Template

After completing all tests, fill out this summary:

```
# Contact Anonymization - Manual Test Report

**Date**: YYYY-MM-DD
**Tester**: [Your Name]
**Environment**: Development / Staging / Production
**Build**: [Git commit hash]

## Results Summary
- Total Tests: 6 scenarios + 6 edge cases = 12 tests
- Passed: __/12
- Failed: __/12
- Blocked: __/12

## Failed Tests
[List any failed tests with details]

## Issues Found
[List any bugs, edge cases, or concerns]

## GDPR Compliance
- [ ] PII Removal: Complete
- [ ] Business Context: Preserved
- [ ] User B Data: Preserved
- [ ] Audit Trail: Complete

## Recommendation
- [ ] APPROVED for production
- [ ] NEEDS FIXES before production
- [ ] BLOCKED (critical issues)

## Notes
[Any additional observations]
```

---

## Next Steps

After all manual tests pass:
1. ✅ Complete Phase 7 Manual Testing
2. ➡️ Proceed to Phase 8: Final Build & Validation
3. ➡️ Generate final implementation report
4. ➡️ Deploy to production (if approved)

---

**Last Updated**: 2025-11-20
**Document Status**: Active
**Phase**: 7/8
