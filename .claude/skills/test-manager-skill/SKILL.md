---
name: test-manager
description: Comprehensive test management system for running tests, tracking results, and maintaining test documentation. Runs test files, parses results, creates test reports, maintains test index, and integrates with docs-manager to link tests to documentation. Use when running tests, checking test coverage, creating test documentation, or verifying test results.
allowed-tools: Read, Write, Glob, Bash
---

# Test Manager

Professional test management system for Weavink test suites with automatic documentation integration.

## Core Capabilities

1. **Run Tests** - Execute test files and capture results
2. **Parse Results** - Extract test data (passed/failed/duration)
3. **Track Tests** - Maintain test-index.json with all test metadata
4. **Generate Reports** - Create test documentation automatically
5. **Integration** - Pass test data to docs-manager for linking
6. **Coverage Analysis** - Track test coverage and trends

## Test Structure

### File Locations
- **Test Files**: `tests/` or user-specified directory
- **Test Index**: `~/temp2/temp2/test-index.json`
- **Test Reports**: `~/temp2/temp2/test-reports/`

### Current Test Suites (Weavink)

**RGPD Tests** (116 total tests):
- `runConsentTests.mjs` - Consent management (8 tests)
- `runConsentCategoryTests.mjs` - Consent categories (12 tests)
- `runPrivacySettingsTests.mjs` - Privacy settings (8 tests)
- `runAnalyticsConsentIntegrationTests.mjs` - Analytics consent (12 tests)
- `runDataExportTests.mjs` - Data export (8 tests)
- `runAccountDeletionTests.mjs` - Account deletion (8 tests)
- `runPhase3Tests.mjs` - Phase 3 advanced (38 tests)
- `runPhase4Tests.mjs` - Phase 4 enterprise (22 tests)
- `runAllRGPDTests.mjs` - Runs all RGPD tests

**Other Tests**:
- `queryEnhancement.comprehensive.test.js` - Query enhancement tests

## Workflow Instructions

### 1. Running Tests

**Triggers**:
- "Run tests"
- "Execute the RGPD tests"
- "Test my code"
- "Check if tests pass"

**Process**:
1. **Identify Test File**
   - Ask which tests to run (or run all)
   - Locate test file(s)
   - Check test file exists

2. **Prepare Test Environment**
   ```bash
   # Navigate to project root
   cd ~/temp2/temp2
   
   # Check if node_modules exists
   if [ ! -d "node_modules" ]; then
     npm install
   fi
   ```

3. **Execute Test File**
   ```bash
   # For .mjs files
   node -r dotenv/config runConsentCategoryTests.mjs
   
   # For .js files
   node tests/queryEnhancement.comprehensive.test.js
   
   # Capture output
   node -r dotenv/config runConsentCategoryTests.mjs > test-output.log 2>&1
   ```

4. **Parse Test Output**
   Extract:
   - Total tests run
   - Tests passed
   - Tests failed
   - Duration
   - Error messages
   - Test names

5. **Update Test Index**
   Add/update entry in test-index.json:
   ```json
   {
     "testId": "rgpd-consent-category-001",
     "testFile": "runConsentCategoryTests.mjs",
     "testSuite": "RGPD Consent Categories",
     "totalTests": 12,
     "passed": 12,
     "failed": 0,
     "successRate": "100%",
     "duration": "2.5s",
     "lastRun": "2025-11-11T14:30:00Z",
     "status": "passing",
     "relatedDocs": [
       "CONSENT_IMPLEMENTATION_GUIDE.md",
       "RGPD_TESTING_GUIDE.md"
     ],
     "relatedFunctions": [
       "recordConsent",
       "getUserConsents",
       "hasConsent"
     ],
     "coverage": {
       "files": ["lib/services/servicePrivacy/consentService.js"],
       "percentage": 95
     }
   }
   ```

6. **Generate Test Report** (optional)
   Create markdown report:
   ```markdown
   # Test Report: RGPD Consent Categories
   
   **Date**: 2025-11-11
   **Status**: ✅ PASSING
   **Success Rate**: 100% (12/12)
   **Duration**: 2.5s
   
   ## Summary
   All consent category tests passed successfully.
   
   ## Test Results
   1. ✅ Test Essential Category - PASSED
   2. ✅ Test AI Features Category - PASSED
   ...
   ```

7. **Integrate with docs-manager**
   ```javascript
   // Pass test metadata to docs-manager
   {
     action: "link_tests_to_docs",
     testId: "rgpd-consent-category-001",
     relatedDocs: ["CONSENT_IMPLEMENTATION_GUIDE.md"],
     testResults: {
       passed: 12,
       failed: 0,
       coverage: "95%"
     }
   }
   ```

8. **Report Results**
   ```
   ✅ Test Suite: RGPD Consent Categories
   
   Results:
   - Total: 12 tests
   - Passed: 12 ✅
   - Failed: 0
   - Success Rate: 100%
   - Duration: 2.5s
   
   Related Documentation:
   - CONSENT_IMPLEMENTATION_GUIDE.md
   - RGPD_TESTING_GUIDE.md
   
   Next steps:
   1. Review test report
   2. Update documentation (run docs-manager)
   3. Commit changes (run git-manager)
   ```

### 2. Checking Test Status

**Triggers**:
- "What's the test status?"
- "Are tests passing?"
- "Show me test coverage"

**Process**:
1. **Read Test Index**
   ```bash
   cat ~/temp2/temp2/test-index.json
   ```

2. **Parse and Display**
   ```
   📊 Test Status Overview
   
   Total Test Suites: 9
   Overall Pass Rate: 100%
   Last Run: 2025-11-11
   
   Test Suites:
   ✅ RGPD Consent (8/8) - 100%
   ✅ RGPD Categories (12/12) - 100%
   ✅ RGPD Privacy Settings (8/8) - 100%
   ✅ Query Enhancement (45/45) - 100%
   
   Coverage: 92% overall
   ```

### 3. Creating Test Documentation

**Triggers**:
- "Document these tests"
- "Create test documentation"
- After successful test run

**Process**:
1. **Analyze Test File**
   - Read test file code
   - Extract test descriptions
   - Identify what's being tested
   - Find related functions

2. **Create Test Guide**
   ```markdown
   ---
   id: test-rgpd-consent-category-001
   title: RGPD Consent Category Tests
   category: testing
   tags: [rgpd, consent, testing, categories]
   status: active
   created: YYYY-MM-DD
   updated: YYYY-MM-DD
   related:
     - CONSENT_IMPLEMENTATION_GUIDE.md
     - RGPD_TESTING_GUIDE.md
   testFile: runConsentCategoryTests.mjs
   testResults:
     passed: 12
     failed: 0
     successRate: 100%
   ---
   
   # RGPD Consent Category Tests
   
   ## Overview
   Test suite for validating consent category management...
   ```

3. **Link to Documentation**
   - Call docs-manager to update related guides
   - Add test results to documentation
   - Update function documentation with test coverage

### 4. Test Coverage Analysis

**Triggers**:
- "What's our test coverage?"
- "Which functions are tested?"
- "Coverage report"

**Process**:
1. **Analyze Test Files**
   - Extract tested functions from test code
   - Match against actual functions in codebase
   - Calculate coverage percentages

2. **Generate Coverage Report**
   ```
   📊 Test Coverage Report
   
   Overall Coverage: 92%
   
   By Module:
   - servicePrivacy: 95% (tested: 45/48 functions)
   - analytics: 88% (tested: 22/25 functions)
   - admin: 90% (tested: 36/40 functions)
   
   Untested Functions:
   - servicePrivacy.deprecatedFunction()
   - analytics.legacyTracker()
   
   Well-Tested Functions (>10 tests):
   - recordConsent() - 12 tests
   - getUserConsents() - 8 tests
   ```

### 5. Integration with docs-manager

**After tests run successfully**:

1. **Prepare Integration Data**
   ```javascript
   {
     testId: "rgpd-consent-category-001",
     testSuite: "RGPD Consent Categories",
     results: {
       passed: 12,
       failed: 0,
       duration: "2.5s"
     },
     testedFunctions: [
       "recordConsent",
       "getUserConsents",
       "hasConsent",
       "batchGrantConsents"
     ],
     relatedDocs: [
       "CONSENT_IMPLEMENTATION_GUIDE.md",
       "RGPD_TESTING_GUIDE.md"
     ]
   }
   ```

2. **Call docs-manager**
   ```
   Pass test data to docs-manager with instruction:
   "Update CONSENT_IMPLEMENTATION_GUIDE.md to include test coverage:
   - recordConsent: Tested ✅ (12 tests)
   - getUserConsents: Tested ✅ (8 tests)
   Test suite: runConsentCategoryTests.mjs (100% passing)"
   ```

3. **Verify Integration**
   - Check that docs were updated
   - Confirm test links are correct
   - Validate coverage information added

## Test Index Structure

```json
{
  "metadata": {
    "project": "Weavink Tests",
    "lastUpdated": "2025-11-11",
    "totalSuites": 9,
    "totalTests": 161,
    "overallPassRate": "100%"
  },
  "suites": [
    {
      "testId": "rgpd-consent-001",
      "testFile": "runConsentTests.mjs",
      "testSuite": "RGPD Consent Management",
      "category": "rgpd",
      "totalTests": 8,
      "passed": 8,
      "failed": 0,
      "successRate": "100%",
      "duration": "1.8s",
      "lastRun": "2025-11-11T14:30:00Z",
      "status": "passing",
      "relatedDocs": [
        "CONSENT_IMPLEMENTATION_GUIDE.md",
        "RGPD_TESTING_GUIDE.md"
      ],
      "testedFunctions": [
        "recordConsent",
        "withdrawConsent",
        "getUserConsents",
        "hasConsent",
        "batchGrantConsents",
        "getConsentHistory"
      ],
      "coverage": {
        "files": ["lib/services/servicePrivacy/consentService.js"],
        "functions": 6,
        "percentage": 95
      },
      "tests": [
        {
          "name": "Grant Individual Consent",
          "status": "passed",
          "duration": "120ms"
        }
      ]
    }
  ]
}
```

## Helper Scripts

### Run All Tests Script
```bash
#!/bin/bash
# run-all-tests.sh

echo "🧪 Running All Weavink Tests"
echo "============================"

cd ~/temp2/temp2

# RGPD Tests
echo "\n📋 RGPD Tests..."
node -r dotenv/config runAllRGPDTests.mjs

# Query Enhancement Tests
echo "\n🔍 Query Enhancement Tests..."
node tests/queryEnhancement.comprehensive.test.js

echo "\n✅ All tests complete!"
```

### Parse Test Output Script
```bash
#!/bin/bash
# parse-test-output.sh

LOG_FILE=$1
PASSED=$(grep "Passed:" "$LOG_FILE" | awk '{print $2}')
FAILED=$(grep "Failed:" "$LOG_FILE" | awk '{print $2}')
TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$(echo "scale=2; $PASSED / $TOTAL * 100" | bc)

echo "{\"passed\": $PASSED, \"failed\": $FAILED, \"total\": $TOTAL, \"successRate\": \"${SUCCESS_RATE}%\"}"
```

## Confirmation Protocol

**CRITICAL: ALWAYS ASK BEFORE RUNNING TESTS IN PRODUCTION**

Before running tests that might affect production data:
1. ✅ Verify environment (dev/staging/prod)
2. ✅ Confirm test suite to run
3. ✅ Ask user for confirmation
4. ✅ Wait for approval

**Safe to run without asking**:
- Local development tests
- Tests with `test-` prefixed user IDs
- Read-only tests

## Integration Points

### With docs-manager

After successful test run:
```javascript
// Data passed to docs-manager
{
  source: "test-manager",
  action: "update_test_coverage",
  testSuite: "RGPD Consent Categories",
  results: {
    passed: 12,
    failed: 0,
    coverage: "95%"
  },
  relatedDocs: ["CONSENT_IMPLEMENTATION_GUIDE.md"],
  testedFunctions: ["recordConsent", "getUserConsents"],
  request: "Update documentation with test coverage information"
}
```

### With git-manager

After tests pass and docs updated:
```javascript
// Data passed to git-manager
{
  source: "test-manager",
  action: "commit_test_results",
  message: "✅ Tests: RGPD Consent Categories (12/12 passing)",
  files: [
    "test-index.json",
    "test-reports/rgpd-consent-categories.md",
    "CONSENT_IMPLEMENTATION_GUIDE.md"  // Updated by docs-manager
  ],
  request: "Commit test results and updated documentation"
}
```

## Workflow Examples

### Example 1: Run Tests → Document → Commit

```
User: "Run the RGPD consent category tests"

test-manager:
1. ✅ Runs: node -r dotenv/config runConsentCategoryTests.mjs
2. ✅ Parses results: 12/12 passed
3. ✅ Updates test-index.json
4. ✅ Passes to docs-manager:
   "Update CONSENT_IMPLEMENTATION_GUIDE.md with test coverage"

docs-manager:
5. ✅ Finds CONSENT_IMPLEMENTATION_GUIDE.md
6. ⚠️ ASKS: "Add test coverage (12/12 passing) to guide? [Y/n]"
   
User: "Y"

docs-manager:
7. ✅ Updates guide with test information
8. ✅ Updates docs-index.json
9. ✅ Passes to git-manager:
   "Commit test results and docs"

git-manager:
10. ⚠️ ASKS: "Commit changes with message:
    '✅ Tests: RGPD Consent (12/12) + Updated docs'
    Files: test-index.json, CONSENT_IMPLEMENTATION_GUIDE.md
    Proceed? [Y/n]"
    
User: "Y"

git-manager:
11. ✅ Creates commit
12. ✅ Pushes changes
13. ✅ Reports: "Committed and pushed!"

Complete: Tests run → Docs updated → Changes committed ✅
```

### Example 2: Check Test Status

```
User: "What's our test coverage?"

test-manager:
1. ✅ Reads test-index.json
2. ✅ Analyzes coverage data
3. ✅ Reports:

📊 Test Coverage Report

Overall: 161 tests, 100% passing

By Category:
- RGPD (116 tests): 100% ✅
- Query Enhancement (45 tests): 100% ✅

Coverage by Module:
- servicePrivacy: 95%
- analytics: 88%
- admin: 90%

Untested Functions (5):
- deprecatedHelper()
- legacyValidator()
- oldProcessor()
- unusedFormatter()
- archiveUtil()
```

### Example 3: Test Failed - No Commit

```
User: "Run all RGPD tests"

test-manager:
1. ✅ Runs: node -r dotenv/config runAllRGPDTests.mjs
2. ❌ Parses results: 115/116 passed, 1 failed
3. ❌ Updates test-index.json with failure
4. ❌ Reports:

❌ Test Suite Failed: RGPD All Tests

Results:
- Total: 116 tests
- Passed: 115 ✅
- Failed: 1 ❌
- Success Rate: 99.1%

Failed Test:
- Test 8: Account Deletion Grace Period
  Error: Expected 30 days, got 29 days

❌ NOT proceeding with documentation or commit
❌ Tests must pass before updating docs

Action Required:
1. Fix the failing test
2. Re-run tests
3. Only after 100% pass → update docs → commit
```

## Critical Rules

1. **ALWAYS Run Tests Before Docs** - Never update documentation without running tests first
2. **ALWAYS Update Test Index** - Track every test run in test-index.json
3. **ALWAYS Link Tests to Docs** - Connect test results to related documentation
4. **NEVER Commit on Failed Tests** - Only proceed to git-manager if 100% pass
5. **ALWAYS Parse Test Output** - Extract structured data from test results
6. **ALWAYS Track Coverage** - Monitor test coverage trends
7. **ALWAYS Use Test Environment** - Verify correct environment before running
8. **ALWAYS Report Clearly** - Give user actionable test results

## Test Categories

### RGPD Tests (116 total)
- **Consent** - Consent management (8 tests)
- **Categories** - Consent categories (12 tests)
- **Privacy** - Privacy settings (8 tests)
- **Analytics Consent** - Analytics integration (12 tests)
- **Export** - Data export (8 tests)
- **Deletion** - Account deletion (8 tests)
- **Phase 3** - Advanced compliance (38 tests)
- **Phase 4** - Enterprise features (22 tests)

### Other Tests
- **Query Enhancement** - Search enhancement tests (45+ tests)

## Error Handling

### Test Execution Fails
```bash
if ! node -r dotenv/config runConsentTests.mjs; then
  echo "❌ Test execution failed"
  echo "Check: Node modules installed?"
  echo "Check: .env file present?"
  echo "Check: Firebase credentials?"
  exit 1
fi
```

### Test Parse Fails
```javascript
try {
  const results = parseTestOutput(output);
} catch (error) {
  console.log("❌ Could not parse test output");
  console.log("Showing raw output:");
  console.log(output);
}
```

### Test Index Corrupted
```bash
# Backup before updating
cp test-index.json test-index.json.backup

# Validate JSON
if ! jq empty test-index.json 2>/dev/null; then
  echo "❌ test-index.json is invalid"
  echo "Restoring from backup..."
  mv test-index.json.backup test-index.json
fi
```

## Success Metrics

A well-maintained test system should have:
- ✅ All tests tracked in test-index.json
- ✅ Test coverage > 90%
- ✅ All tests passing (100%)
- ✅ Tests linked to documentation
- ✅ Test reports generated automatically
- ✅ Coverage trends tracked over time
- ✅ Failed tests reported clearly
- ✅ Integration with docs and git working

---

*This skill manages Weavink's test suite with 161+ tests across 9 test suites, ensuring code quality and enabling automated documentation and version control integration.*