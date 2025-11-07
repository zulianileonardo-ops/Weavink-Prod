# RGPD Testing Quick Start

**Get your RGPD tests running in 30 seconds!**

---

## 🚀 Fastest Way to Test (Browser Console)

### 1. Open Your Browser Console
- Press **F12** (or **Cmd+Option+I** on Mac)
- Go to the **Console** tab

### 2. Copy & Paste This One-Liner

```javascript
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'all'})}).then(r=>r.json()).then(d=>{console.log('📊 RGPD Test Results'); console.log('✅ Passed:', d.summary.passed); console.log('❌ Failed:', d.summary.failed); console.log('📈 Success Rate:', d.summary.successRate); console.log('Full Results:', d);})
```

### 3. Press Enter

That's it! You'll see:
```
📊 RGPD Test Results
✅ Passed: 84
❌ Failed: 0
📈 Success Rate: 100%
Full Results: {...}
```

---

## 📋 Run Specific Tests

### Consent Management Only
```javascript
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'consent'})}).then(r=>r.json()).then(console.log)
```

### Data Export Only
```javascript
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'export'})}).then(r=>r.json()).then(console.log)
```

### Account Deletion Only
```javascript
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'deletion'})}).then(r=>r.json()).then(console.log)
```

### Phase 3 Tests Only
```javascript
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'phase3'})}).then(r=>r.json()).then(console.log)
```

### Phase 4 Tests Only
```javascript
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'phase4'})}).then(r=>r.json()).then(console.log)
```

---

## 🔍 What Gets Tested?

### ✅ 84 Automated Tests (Phase 1-4) - 100% Passing

**Phase 1-2: Core Features (24 tests)**

**Consent Management (8 tests)**
- Grant consent ✓
- Withdraw consent ✓
- Batch operations ✓
- History tracking ✓

**Data Export (8 tests)**
- JSON format ✓
- CSV format ✓
- vCard format ✓
- Request tracking ✓

**Account Deletion (8 tests)**
- Request deletion ✓
- 30-day grace period ✓
- Cancel deletion ✓
- Audit trail ✓

**Phase 3: Advanced Compliance (38 tests)**

**Data Minimization (3 tests)**
- Run minimization audits ✓
- Statistics and reporting ✓

**Retention Policies (7 tests)**
- Policy management ✓
- Automated cleanup ✓
- Legal holds ✓

**DPIA - Privacy Impact (8 tests)**
- Risk assessments ✓
- Approval workflow ✓
- Mitigation tracking ✓

**Incident Reporting (9 tests)**
- 72-hour breach tracking ✓
- CNIL notifications ✓
- Containment actions ✓

**Audit Logging (11 tests)**
- Tamper-evident logs ✓
- Compliance reports ✓
- Export capabilities ✓

**Phase 4: Advanced Features (28 tests)**

**Data Portability (4 tests)**
- XML export ✓
- PDF export ✓
- Import from external sources ✓
- Scheduled exports ✓

**Breach Notifications (2 tests)**
- Multi-channel notifications ✓
- Authority notifications ✓

**Certifications (5 tests)**
- ISO 27001 tracking ✓
- Progress monitoring ✓
- Documentation generation ✓

**Processor Management (5 tests)**
- Processor registry ✓
- Risk assessment (automated) ✓
- DPA tracking ✓
- Audit scheduling ✓

**Compliance Monitoring (6 tests)**
- Real-time scoring (0-100) ✓
- Automated checks (8 types) ✓
- Trend analysis ✓
- Action item tracking ✓

---

## 📖 Understanding Results

### Success Output
```javascript
{
  summary: {
    totalTests: 84,
    passed: 84,
    failed: 0,
    successRate: "100%",
    allTestsPassed: true
  }
}
```
✅ **All good!** Your RGPD implementation is working perfectly.

### Failure Output
```javascript
{
  summary: {
    totalTests: 24,
    passed: 22,
    failed: 2,
    successRate: "91.67%",
    allTestsPassed: false
  }
}
```
❌ **Check details**: Look at `results.consent`, `results.export`, or `results.deletion` to see which tests failed and why.

---

## 🛠️ Troubleshooting

### Problem: "Failed to fetch"
**Solution**: Make sure your dev server is running
```bash
npm run dev
```

### Problem: Tests fail with errors
**Solution**: Check the detailed error messages in the console output:
```javascript
// Look for this in the results
results.consent.logs.results
  .filter(r => r.level === 'ERROR')
  .forEach(e => console.log(e.message, e.data))
```

### Problem: Need more details
**Solution**: See the full documentation
```bash
# Read the comprehensive guide
cat RGPD_TESTING_GUIDE.md
```

---

## 📚 Next Steps

1. **Read Full Documentation**: `RGPD_TESTING_GUIDE.md`
2. **Manual Testing**: Test the UI features manually
3. **Regular Testing**: Run tests after any code changes
4. **CI/CD Integration**: Add tests to your deployment pipeline

---

## 🎯 Pro Tips

### Pretty Print Results
```javascript
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'all'})})
  .then(r=>r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
```

### Save Results to Variable
```javascript
let testResults;
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'all'})})
  .then(r=>r.json())
  .then(d => {
    testResults = d;
    console.log('Results saved to testResults variable');
  })

// Later: inspect specific tests
testResults.results.consent.summary
```

### Check Test Documentation
```javascript
fetch('/api/test/rgpd')
  .then(r=>r.json())
  .then(d => console.log(d))
```

---

## ⚡ Common Test Scenarios

### Before Deployment
```javascript
// Run all tests
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'all'})})
  .then(r=>r.json())
  .then(d => {
    if (d.summary.allTestsPassed) {
      console.log('✅ READY TO DEPLOY!');
    } else {
      console.error('❌ FIX FAILING TESTS BEFORE DEPLOYING!');
    }
  })
```

### After Code Changes
```javascript
// Test just what you changed
// Example: Changed consent code
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'consent'})})
  .then(r=>r.json())
  .then(console.log)
```

### Monthly Compliance Check
```javascript
// Run all tests and save report
fetch('/api/test/rgpd', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suite:'all'})})
  .then(r=>r.json())
  .then(d => {
    console.log(`RGPD Compliance Report - ${new Date().toLocaleDateString()}`);
    console.log(`Success Rate: ${d.summary.successRate}`);
    console.log(`Tests Passed: ${d.summary.passed}/${d.summary.totalTests}`);
    // Save this output for compliance records
  })
```

---

## 📊 Test Coverage

| Feature | Tests | Status |
|---------|-------|--------|
| **Phase 1-2** | | |
| Consent Management | 8 | ✅ 100% Passing |
| Data Export | 8 | ✅ 100% Passing |
| Account Deletion | 8 | ✅ 100% Passing |
| **Phase 3** | | |
| Data Minimization | 3 | ✅ 100% Passing |
| Retention Policies | 7 | ✅ 100% Passing |
| DPIA System | 8 | ✅ 100% Passing |
| Incident Reporting | 9 | ✅ 100% Passing |
| Audit Logging | 11 | ✅ 100% Passing |
| **Phase 4** | | |
| Data Portability | 4 | ✅ 100% Passing |
| Breach Notifications | 2 | ✅ 100% Passing |
| Certifications | 5 | ✅ 100% Passing |
| Processor Management | 5 | ✅ 100% Passing |
| Compliance Monitoring | 6 | ✅ 100% Passing |
| **Total** | **84** | **✅ 100%** |

**Status**: All tests passing! All Firestore indexes deployed and active.

---

## 🚨 Important Notes

- Tests use **temporary test users** - they won't affect real data
- Tests **clean up after themselves** (except for logged data)
- Tests run **server-side** for accurate simulation
- All tests include **detailed logging** for debugging

---

**Ready to test?** Just copy the one-liner from the top and paste it in your console! 🚀

For detailed documentation, see: **RGPD_TESTING_GUIDE.md**
