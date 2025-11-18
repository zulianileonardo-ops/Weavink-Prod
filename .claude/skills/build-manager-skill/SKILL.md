---
name: build-manager-skill
description: Automated Next.js build management - runs builds, analyzes errors/warnings, and automatically fixes issues iteratively until build succeeds or encounters unfixable errors. Use when running builds, fixing build errors, or validating build health. Standalone skill with no external integrations.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Build Manager Skill

Professional build management system for Next.js projects. Automatically runs builds, analyzes output, identifies errors and warnings, applies automatic fixes, and iterates until the build succeeds or requires manual intervention.

## Core Capabilities

1. **Automated Build Execution** - Run `npm run build` and capture complete output
2. **Intelligent Error Analysis** - Parse build output and categorize 38+ common Next.js error patterns
3. **Automatic Error Fixing** - Apply fixes for import errors, TypeScript issues, ESLint warnings, React problems, and more
4. **Iterative Build Process** - Automatically re-run builds after fixes until success (max 10 iterations)
5. **Build Health Reporting** - Detailed reports on errors, warnings, fix strategies, and build statistics
6. **Unknown Error Detection** - Stop and report when encountering unfixable or unknown errors
7. **Safety Controls** - Iteration limits, validation checks, and rollback capabilities

## Build Process Architecture

### Current Build Infrastructure

```
Project Root
├── package.json                    # Contains build scripts
├── next.config.js                  # Next.js configuration
├── .next/                          # Build output directory (gitignored)
├── .claude/skills/build-manager-skill/
│   ├── SKILL.md                   # This file
│   ├── README.md                  # User documentation
│   └── scripts/
│       ├── analyze-build.py       # Build output parser
│       └── error-patterns.json    # Error pattern database
└── /tmp/
    └── build-output-{timestamp}.txt   # Temporary build logs
```

### Build Workflow State Machine

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       v
┌─────────────────┐
│ Clear .next     │
│  cache (rm -rf) │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Run npm build  │
└────────┬────────┘
         │
         v
┌──────────────────┐
│ Capture to temp  │
│      file        │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Analyze output  │
│  (Python script) │
└────────┬─────────┘
         │
         v
    ┌────┴────┐
    │ Success?│
    └────┬────┘
         │
    ┌────┴────┐
    │   Yes   │ → ┌──────────────┐
    │         │   │ Report & End │
    │         │   └──────────────┘
    │         │
    │   No    │
    └────┬────┘
         │
         v
┌─────────────────────┐
│ Categorize errors   │
└──────────┬──────────┘
       │
       v
  ┌────┴────┐
  │ Auto-   │
  │fixable? │
  └────┬────┘
       │
  ┌────┴────┐
  │   Yes   │ → ┌──────────────┐
  │         │   │  Apply fixes │
  │         │   └──────┬───────┘
  │         │          │
  │         │          v
  │         │   ┌──────────────┐
  │         │   │ Iteration++  │
  │         │   └──────┬───────┘
  │         │          │
  │         │          v
  │         │   ┌──────────────┐
  │         │   │ Max reached? │
  │         │   └──────┬───────┘
  │         │          │
  │         │     ┌────┴────┐
  │         │     │   No    │──┐
  │         │     │         │  │
  │         │     │   Yes   │  │
  │         │     └────┬────┘  │
  │         │          │       │
  │         │          v       │
  │         │   ┌──────────┐  │
  │         │   │   STOP   │  │
  │         │   │  Report  │  │
  │         │   └──────────┘  │
  │         │                 │
  │   No    │                 │
  └────┬────┘                 │
       │                      │
       v                      │
┌──────────────┐              │
│ STOP & REPORT│              │
│ Manual review│              │
└──────────────┘              │
                              │
       ┌──────────────────────┘
       │
       v
  (Loop back to Clear .next cache)
```

## Workflows

### 1. Run Build and Auto-Fix (Primary Workflow)

**Triggers:**
- "Run the build"
- "Build the project and fix any errors"
- "Run npm run build"
- "Fix build errors"
- "Get the build working"

**Process:**

1. **Initialize Build Session**
   ```bash
   # Create timestamp for unique temp file
   timestamp=$(date +%s)
   temp_file="/tmp/build-output-${timestamp}.txt"
   ```

2. **Clear Build Cache and Run Initial Build**
   ```bash
   # CRITICAL: Clear .next cache before EVERY build to ensure clean state
   rm -rf .next

   # Run build and capture all output
   npm run build > "$temp_file" 2>&1
   echo "Exit code: $?" >> "$temp_file"
   ```

3. **Analyze Build Output**
   ```bash
   # Run Python analyzer
   python3 .claude/skills/build-manager-skill/scripts/analyze-build.py "$temp_file" > /tmp/analysis-${timestamp}.json
   ```

4. **Parse Analysis Results**
   - Read the JSON analysis file
   - Extract errors and warnings
   - Identify auto-fixable vs manual-review issues
   - Check if build succeeded

5. **Decision Point: Build Status**

   **If build succeeded:**
   ```
   ✓ Build completed successfully!

   Statistics:
   - Build time: X.Xs
   - Warnings: X (all auto-fixable)
   - Pages: X static, X server-side

   Next steps:
   1. Review any warnings
   2. Test the application
   3. Ready for deployment
   ```
   → **END WORKFLOW**

   **If build failed:**
   → Continue to step 6

6. **Categorize Errors**

   Group errors by category:
   - **Auto-fixable:** Can be fixed automatically
   - **Manual review:** Requires human intervention
   - **Unknown:** Not in pattern database

7. **Check for Manual Review Issues**

   **If ANY manual review or unknown errors exist:**
   ```
   ✗ Build failed with errors requiring manual review

   Auto-fixable: X errors
   Manual review: X errors
   Unknown: X errors

   ── Manual Review Required ──

   1. ./path/to/file.js:10
      Error: Hydration failed because initial UI does not match
      → This requires manual investigation
      → Check for browser-only APIs in component

   2. ./path/to/other.js:25
      Error: Unknown error pattern
      → Message: [full error message]
      → This error is not recognized

   Unable to proceed automatically. Please review these errors.
   ```
   → **STOP WORKFLOW** - Report to user

8. **Apply Automatic Fixes (if all errors are auto-fixable)**

   For each auto-fixable error:

   **Import Errors (module-not-found):**
   ```javascript
   // Before:
   import { Component } from './components/MyComponent'

   // Check file system for correct path
   // After fix:
   import { Component } from './components/MyComponent.jsx'
   ```

   **Unused Variables:**
   ```javascript
   // Before:
   function handleClick(event, data, index) {
     console.log(data)
   }

   // After fix:
   function handleClick(_event, data, _index) {
     console.log(data)
   }
   ```

   **TypeScript Implicit Any:**
   ```typescript
   // Before:
   function processData(items) {
     return items.map(x => x.value)
   }

   // After fix:
   function processData(items: any[]) {
     return items.map((x: any) => x.value)
   }
   ```

   **React Missing Keys:**
   ```jsx
   // Before:
   items.map(item => <div>{item.name}</div>)

   // After fix:
   items.map(item => <div key={item.id}>{item.name}</div>)
   ```

   **ESLint Auto-fixable:**
   ```bash
   # Run ESLint with auto-fix on specific files
   npx eslint --fix ./path/to/file.js
   ```

9. **Increment Iteration Counter**
   ```
   Iteration: 1/10
   Fixed: X errors
   Remaining: X warnings
   ```

10. **Check Iteration Limit**

    **If iteration >= 10:**
    ```
    ✗ Maximum iterations (10) reached

    Progress:
    - Started with: X errors
    - Fixed: X errors
    - Remaining: X errors

    The build is stuck in a fix loop. Possible causes:
    1. Fixes are creating new errors
    2. Errors are interdependent
    3. Pattern matching is incorrect

    Recommend manual review of remaining errors.
    ```
    → **STOP WORKFLOW**

    **If iteration < 10:**
    → **Loop back to step 2** (Clear cache and run build again)

11. **Report Final Status**

    After successful build after fixes:
    ```
    ✓ Build succeeded after X iterations!

    Fixes Applied:
    1. Fixed 3 import path errors
    2. Removed 5 unused variables
    3. Added 2 TypeScript type annotations
    4. Added 1 missing React key prop

    Final Statistics:
    - Total fixes: X
    - Iterations: X
    - Build time: X.Xs
    - Warnings remaining: X (non-blocking)

    Build is ready for deployment!
    ```

12. **Cleanup**
    ```bash
    # Remove temporary files
    rm -f /tmp/build-output-*.txt
    rm -f /tmp/analysis-*.json
    ```

### 2. Validate Build Health

**Triggers:**
- "Check build health"
- "Analyze the build"
- "What's wrong with the build?"

**Process:**

1. **Run Build (no fixes)**
   ```bash
   npm run build > /tmp/build-health-check.txt 2>&1
   ```

2. **Analyze Only (don't fix)**
   ```bash
   python3 .claude/skills/build-manager-skill/scripts/analyze-build.py /tmp/build-health-check.txt
   ```

3. **Report Health Status**
   ```
   📊 Build Health Report

   Status: FAILED
   Errors: 5
   Warnings: 12

   ── Breakdown by Category ──
   import:     3 errors   (2 auto-fixable)
   typescript: 2 errors   (1 auto-fixable)
   react:      0 errors
   eslint:     8 warnings (8 auto-fixable)
   nextjs:     4 warnings (3 auto-fixable)

   ── Auto-fix Potential ──
   ✓ 11 issues can be fixed automatically
   ⚠ 6 issues require manual review

   Recommend: Run "build and fix" workflow
   ```

### 3. Clear Build Cache

**Triggers:**
- "Clear build cache"
- "Clean the build"
- "Reset build state"

**Process:**

1. **Remove Build Artifacts**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   rm -rf .swc
   ```

2. **Report**
   ```
   ✓ Build cache cleared

   Removed:
   - .next/ (build output)
   - node_modules/.cache/ (dependency cache)
   - .swc/ (SWC compiler cache)

   Next steps:
   1. Run npm run build
   2. Issues should be rebuilt from scratch
   ```

## Error Pattern Database

The skill uses a comprehensive database of 38+ Next.js build error patterns stored in `scripts/error-patterns.json`.

### Pattern Structure

```json
{
  "id": "module-not-found",
  "category": "import",
  "severity": "error",
  "pattern": "Module not found: Can't resolve ['\"]([^'\"]+)['\"]",
  "description": "Cannot find the specified module or file",
  "autoFixable": true,
  "fixStrategy": "check_file_exists_with_common_extensions",
  "fixes": [
    "Check if file exists with .js, .jsx, .ts, .tsx extensions",
    "Fix case sensitivity in import path",
    "Check if it's a missing npm package"
  ]
}
```

### Categories and Auto-fix Rates

| Category   | Description                    | Auto-fix Rate | Common Issues                          |
|------------|--------------------------------|---------------|----------------------------------------|
| import     | Module resolution errors       | 85%           | Missing files, wrong paths, extensions |
| eslint     | Code quality warnings          | 90%           | Unused vars, formatting, best practices|
| typescript | Type checking errors           | 70%           | Missing types, implicit any, type errors|
| react      | React-specific issues          | 75%           | Hooks deps, keys, hydration warnings   |
| nextjs     | Next.js framework issues       | 80%           | Image optimization, Link usage, CSS    |
| css        | Styling errors                 | 60%           | Module imports, invalid syntax         |
| webpack    | Build/bundling errors          | 40%           | Module parsing, loader config          |
| unknown    | Unrecognized errors            | 0%            | Requires manual investigation          |

### Top 10 Most Common Errors

1. **Module not found** - Wrong import paths or missing files
2. **Unused variable** - Variables declared but never used
3. **TypeScript implicit any** - Missing type annotations
4. **React Hook dependencies** - Missing deps in useEffect/useCallback
5. **Missing key prop** - List items without unique keys
6. **Using img instead of Image** - Not using Next.js Image optimization
7. **Console statements** - console.log in production code
8. **Using a instead of Link** - Not using Next.js Link for navigation
9. **Global CSS import** - CSS imported outside _app.js
10. **Export not found** - Named import doesn't exist in module

## Fix Strategies

### Strategy: check_file_exists_with_common_extensions

```javascript
// For: Module not found errors

1. Extract the import path from error message
2. Check if file exists with these extensions:
   - .js
   - .jsx
   - .ts
   - .tsx
   - .mjs
   - /index.js (directory index)
3. Check case sensitivity (File.js vs file.js)
4. If found with different extension, update import
5. If not found, check if it's an npm package
   - Search package.json dependencies
   - Suggest: npm install <package>
6. If still not found, search for similar filenames
   - Use fuzzy matching
   - Suggest closest matches
```

### Strategy: prefix_with_underscore_or_remove

```javascript
// For: Unused variable warnings

1. Identify variable type:
   - Function parameter → prefix with underscore
   - Destructured property → use rest operator
   - Standalone variable → remove declaration

2. Apply fix:

   // Function parameter
   function fn(event, data) { ... }
   →
   function fn(_event, data) { ... }

   // Destructured
   const { used, unused } = obj
   →
   const { used } = obj
   // or
   const { used, ...rest } = obj

   // Standalone
   const unused = getValue()
   →
   // (removed entirely)
```

### Strategy: add_explicit_types

```typescript
// For: TypeScript any/implicit any errors

1. Analyze variable usage context
2. Infer basic type from:
   - Assignment: const x = "str" → string
   - Array methods: .map(), .filter() → array
   - Callbacks: event handlers → Event type

3. Apply type annotation:
   - Simple types: string, number, boolean, any
   - Arrays: string[], any[]
   - Objects: { key: type } or Record<string, any>

4. Quick fix path (use 'any' for now):
   function process(data) { }
   →
   function process(data: any) { }

5. Add TODO comment for proper typing later:
   function process(data: any /* TODO: add proper type */) { }
```

### Strategy: add_to_dependency_array

```javascript
// For: React Hook missing dependencies

1. Parse the error message to extract missing deps
2. Locate the Hook in the file (useEffect, useCallback, useMemo)
3. Find the dependency array
4. Add missing dependency:

   useEffect(() => {
     fetchData(userId)
   }, [])
   →
   useEffect(() => {
     fetchData(userId)
   }, [userId])

5. Handle special cases:
   - Functions → wrap in useCallback first
   - Objects → wrap in useMemo first
   - Constants → can ignore if truly constant
```

### Strategy: add_key_prop

```jsx
// For: Missing key prop in lists

1. Identify the map/loop creating elements
2. Determine best key source:
   - Prefer: unique id (item.id)
   - Acceptable: unique stable value (item.email, item.name + index)
   - Last resort: index (with comment explaining why)

3. Apply fix:

   items.map(item => <div>{item.name}</div>)
   →
   items.map(item => <div key={item.id}>{item.name}</div>)

   // If no unique id exists:
   items.map((item, index) => (
     // Using index as key - items are static and won't reorder
     <div key={index}>{item.name}</div>
   ))
```

## Critical Rules

1. **ALWAYS run builds in production mode** - Use `npm run build`, not `npm run dev`

2. **ALWAYS clear .next cache before each build** - Run `rm -rf .next` before every `npm run build` to ensure clean state

3. **ALWAYS capture full output** - Redirect both stdout and stderr: `npm run build > file 2>&1`

4. **ALWAYS analyze before fixing** - Parse output with Python script to categorize errors

5. **NEVER exceed 10 iterations** - Safety limit to prevent infinite loops

6. **ALWAYS stop on manual-review errors** - If any error is not auto-fixable, stop and report

7. **NEVER delete error messages** - Preserve full context for debugging

8. **ALWAYS validate fixes** - After applying fixes, re-run build to verify

9. **NEVER modify next.config.js** without explicit approval - Config changes are risky

10. **ALWAYS cleanup temp files** - Remove /tmp/build-output-*.txt and /tmp/analysis-*.json after completion

11. **NEVER commit build artifacts** - .next/, out/ should stay in .gitignore

## Decision Trees

### Error Analysis Decision Tree

```
Error Detected
│
├─ Is it in pattern database?
│  │
│  ├─ Yes
│  │  │
│  │  ├─ Is it auto-fixable?
│  │  │  │
│  │  │  ├─ Yes → Apply fix strategy
│  │  │  │
│  │  │  └─ No → Mark for manual review
│  │  │
│  │  └─ Apply fix
│  │
│  └─ No
│     │
│     └─ Mark as unknown → STOP & REPORT
│
└─ Check next error
```

### Fix Strategy Decision Tree

```
Auto-fixable Error
│
├─ Category: import
│  │
│  ├─ Module not found
│  │  └─ check_file_exists_with_common_extensions
│  │
│  ├─ Export not found
│  │  └─ fix_import_name
│  │
│  └─ Circular dependency
│     └─ MANUAL (not auto-fixable)
│
├─ Category: eslint
│  │
│  ├─ Unused variable
│  │  └─ prefix_with_underscore_or_remove
│  │
│  ├─ Console statement
│  │  └─ remove_or_comment
│  │
│  └─ Other eslint
│     └─ run_eslint_autofix
│
├─ Category: typescript
│  │
│  ├─ Implicit any
│  │  └─ add_basic_type_annotation
│  │
│  ├─ Unsafe any
│  │  └─ add_explicit_types
│  │
│  └─ Type mismatch
│     └─ MANUAL (complex typing)
│
├─ Category: react
│  │
│  ├─ Hook dependencies
│  │  └─ add_to_dependency_array
│  │
│  ├─ Missing key
│  │  └─ add_key_prop
│  │
│  └─ Hydration error
│     └─ MANUAL (requires investigation)
│
└─ Category: nextjs
   │
   ├─ img instead of Image
   │  └─ replace_img_with_next_image
   │
   ├─ a instead of Link
   │  └─ replace_with_next_link
   │
   └─ Global CSS import
      └─ move_to_app_or_use_module
```

## Troubleshooting

### Issue: Build keeps failing with same error

**Symptoms:**
- Multiple iterations
- Same error appears after fix
- Iteration count approaching limit

**Diagnosis:**
1. Check if fix is actually being applied to correct file
2. Verify file is saved after edit
3. Check if error is in generated code (.next/ directory)
4. Check if multiple files have same error

**Solution:**
- Read the file after fix to verify change
- Check git diff to see what was changed
- If error is in .next/, clear cache and rebuild
- Apply batch fix to all occurrences at once

### Issue: Unknown error not in database

**Symptoms:**
- Error categorized as "unknown"
- No fix strategy available
- Build stops immediately

**Diagnosis:**
1. Read full error message
2. Search online for Next.js + error message
3. Check Next.js documentation
4. Check if it's a new error pattern

**Solution:**
- Manually fix the error
- Add new pattern to error-patterns.json for future
- Report to user with full context

### Issue: TypeScript errors after JavaScript fixes

**Symptoms:**
- Fixed import errors
- New TypeScript type errors appear
- Build now fails at type checking

**Diagnosis:**
- Import fixes revealed type mismatches
- Types were not checked before because module was missing

**Solution:**
- Apply TypeScript fix strategies
- Add basic type annotations (: any)
- Add TODO comments for proper typing later

### Issue: Build succeeds but warnings remain

**Symptoms:**
- Exit code 0 (success)
- Multiple warnings in output
- User wants warnings fixed

**Diagnosis:**
- Build succeeded, warnings are non-blocking
- Some warnings may be intentional

**Solution:**
- Report warnings separately
- Ask user if they want warnings fixed
- Apply warning fixes if requested
- Some warnings may need eslint-disable comments

## Success Metrics

### Build Health Indicators

**Healthy Build:**
- ✓ Exit code: 0
- ✓ Errors: 0
- ✓ Warnings: < 5
- ✓ Build time: < 60s
- ✓ Pages compiled successfully
- ✓ No hydration warnings

**Unhealthy Build:**
- ✗ Exit code: 1
- ✗ Errors: > 0
- ✗ Warnings: > 20
- ✗ Build time: > 120s
- ✗ Build cache corrupted

### Fix Success Metrics

**Good Performance:**
- Auto-fix rate: > 80%
- Iterations needed: < 3
- Time to fix: < 5 minutes
- No manual review needed

**Needs Improvement:**
- Auto-fix rate: < 50%
- Iterations needed: > 5
- Time to fix: > 10 minutes
- Multiple manual review items

### Workflow Success

**Successful Session:**
1. Build ran successfully
2. All auto-fixable errors fixed
3. Build passes after fixes
4. No manual review required
5. Temp files cleaned up
6. Clear report provided

**Failed Session (expected in some cases):**
1. Manual review errors encountered
2. Unknown errors found
3. Max iterations reached
4. Build still failing after fixes
5. Clear explanation provided to user

## Integration Points

This skill is **standalone** and does not integrate with other skills. However, it can be used in conjunction with:

- **Manual workflow:** User can call test-manager-skill before building
- **Manual workflow:** User can call git-manager-skill after successful build
- **Manual workflow:** User can call docs-manager-skill to document build issues

## Helper Functions

### analyze-build.py

**Purpose:** Parse build output and categorize errors

**Usage:**
```bash
python3 .claude/skills/build-manager-skill/scripts/analyze-build.py /tmp/build-output.txt
```

**Output:** JSON with categorized errors and fix recommendations

**Example:**
```bash
# Capture build output
npm run build > /tmp/build.txt 2>&1

# Analyze
python3 .claude/skills/build-manager-skill/scripts/analyze-build.py /tmp/build.txt > analysis.json

# Read analysis
cat analysis.json | jq '.statistics'
```

### error-patterns.json

**Purpose:** Database of known error patterns and fixes

**Location:** `.claude/skills/build-manager-skill/scripts/error-patterns.json`

**Structure:**
- `metadata`: Version, update date, total patterns
- `patterns`: Array of error patterns
- `categories`: Category definitions and stats

**Usage:**
- Read by analyze-build.py
- Can be extended with new patterns
- Reference for fix strategies

## Notes for Claude

- This skill operates completely automatically once triggered
- Only stop and ask user when manual review is required
- Always provide clear, detailed reports
- Keep temp files organized in /tmp/
- Clean up after completion
- Never make assumptions about unfixable errors - always report them
- Respect the 10-iteration limit strictly
- Prioritize correctness over speed
- When in doubt, stop and report rather than guessing

## Skill Invocation

To invoke this skill:
```
Skill("build-manager-skill")
```

The skill will then guide Claude through the build and fix workflow.
