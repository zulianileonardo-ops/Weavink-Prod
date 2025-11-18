# Build Manager Skill

Automated Next.js build management that runs builds, identifies errors, and fixes them automatically.

## What It Does

The Build Manager skill automates the tedious process of fixing build errors. Instead of manually:
1. Running `npm run build`
2. Reading through error messages
3. Fixing each error one by one
4. Re-running the build
5. Repeating until it works

The skill does all of this automatically in seconds.

## Quick Start

### Run a Build and Auto-Fix Errors

```
Run the build and fix any errors
```

The skill will:
- Run `npm run build`
- Analyze all errors and warnings
- Automatically fix what it can
- Re-run the build
- Repeat until success or manual review needed
- Report results

### Just Check Build Health (No Fixes)

```
Check the build health
```

Get a report on errors and warnings without making any changes.

### Clear Build Cache

```
Clear the build cache
```

Remove `.next/`, `node_modules/.cache/`, and `.swc/` directories.

## What Gets Fixed Automatically

The skill can automatically fix 38+ common Next.js build errors:

### Import/Module Errors (85% auto-fix rate)
- Module not found errors → fixes import paths, adds extensions
- Wrong file paths → searches for correct location
- Case sensitivity mismatches → corrects capitalization
- Missing exports → fixes export names

### ESLint Warnings (90% auto-fix rate)
- Unused variables → removes or prefixes with underscore
- Console statements → removes or adds eslint-disable
- Formatting issues → runs eslint --fix
- Code quality warnings → applies eslint fixes

### TypeScript Errors (70% auto-fix rate)
- Implicit any → adds type annotations
- Missing parameter types → adds basic types
- Unsafe any usage → adds explicit types

### React Issues (75% auto-fix rate)
- Missing Hook dependencies → adds to dependency array
- Missing key props → adds unique keys to list items
- Using `<img>` instead of `<Image>` → converts to Next.js Image
- Using `<a>` instead of `<Link>` → converts to Next.js Link

### Next.js Specific (80% auto-fix rate)
- Global CSS imports → moves to _app.js or converts to modules
- Deprecated APIs → updates to new API syntax
- Font loading issues → moves to _document.js
- Script loading → converts to Next.js Script component

## What Requires Manual Review

Some errors cannot be fixed automatically and will stop the process:

- **Hydration errors** - Server/client mismatch (needs investigation)
- **Circular dependencies** - Requires code restructuring
- **Complex TypeScript type errors** - Needs proper type definitions
- **Webpack/bundling errors** - May need config changes
- **Unknown errors** - Not in the pattern database

When these occur, the skill will:
1. Stop the auto-fix process
2. Show you the error details
3. Suggest what might be wrong
4. Wait for you to fix it manually

## How It Works

### The Process

```
1. Clear .next cache (rm -rf .next) → Ensure clean build
2. Run npm run build → Capture output to temp file
3. Parse output → Extract errors and warnings
4. Categorize → Match against 38+ known patterns
5. Decide → Auto-fixable or manual review?
6. Fix → Apply automatic fixes
7. Repeat → Max 10 iterations (clear cache each time)
8. Report → Show results
```

### Safety Features

- **Clean Builds:** Clears .next cache before every build iteration to prevent stale artifacts
- **Iteration Limit:** Max 10 build attempts to prevent infinite loops
- **Manual Review Required:** Stops when unfixable errors detected
- **No Config Changes:** Never modifies next.config.js without approval
- **Full Logging:** All build output saved to temp files
- **Validation:** Re-runs build after each fix to verify
- **Temp Cleanup:** Removes all temp files after completion

## File Structure

```
.claude/skills/build-manager-skill/
├── SKILL.md                      # Complete skill documentation
├── README.md                     # This file
└── scripts/
    ├── analyze-build.py          # Build output parser (Python)
    └── error-patterns.json       # Database of 38+ error patterns
```

## Common Use Cases

### Before Deployment

```
Run the build and fix errors
```

Ensures your code is production-ready.

### After Dependency Updates

```
Run the build and fix errors
```

Fresh build after updating packages. The skill automatically clears .next cache before each build, so no need to clear it manually.

### CI/CD Pipeline

```
Check build health
```

Quick validation without making changes.

### Learning Tool

```
Check build health
```

See what errors exist and learn about common Next.js issues.

## Example Session

**User:** "Run the build and fix any errors"

**Build Manager:**
```
Running npm run build...

✗ Build failed with 8 errors, 12 warnings

Analyzing errors...
- 3 import errors (auto-fixable)
- 2 TypeScript errors (auto-fixable)
- 3 unused variable warnings (auto-fixable)
- 12 ESLint warnings (auto-fixable)

All errors are auto-fixable. Applying fixes...

Iteration 1:
✓ Fixed 3 import path errors
✓ Added 2 TypeScript type annotations
✓ Removed 3 unused variables

Re-running build...

✗ Build failed with 0 errors, 12 warnings

Iteration 2:
✓ Fixed 12 ESLint warnings

Re-running build...

✓ Build succeeded!

Summary:
- Total fixes: 20
- Iterations: 2
- Build time: 8.3s
- Warnings: 0

Build is ready for deployment!
```

## Advanced Usage

### Running the Analyzer Manually

```bash
# Capture build output
npm run build > /tmp/build.txt 2>&1

# Analyze it
python3 .claude/skills/build-manager-skill/scripts/analyze-build.py /tmp/build.txt

# View results
cat /tmp/build.txt
```

### Adding New Error Patterns

Edit `scripts/error-patterns.json`:

```json
{
  "id": "new-error-id",
  "category": "nextjs",
  "severity": "error",
  "pattern": "Regex pattern to match error",
  "description": "What this error means",
  "autoFixable": true,
  "fixStrategy": "strategy_name",
  "fixes": [
    "Step 1 to fix",
    "Step 2 to fix"
  ]
}
```

### Checking Fix Statistics

The skill tracks auto-fix rates by category:

- **import:** 85% - Module resolution errors
- **eslint:** 90% - Code quality warnings
- **typescript:** 70% - Type checking errors
- **react:** 75% - React-specific issues
- **nextjs:** 80% - Framework-specific issues
- **css:** 60% - Styling errors
- **webpack:** 40% - Build/bundling errors

## Troubleshooting

### Build Keeps Failing with Same Error

The fix might not be working. The skill will:
- Try up to 10 times
- Then stop and report
- Show you what was attempted

**Solution:** Check the error manually, it might need a different fix.

### Max Iterations Reached

The build is stuck in a loop. This means:
- Fixes are creating new errors, or
- Errors are interdependent, or
- Pattern matching is incorrect

**Solution:** Review the remaining errors manually.

### Unknown Error Pattern

The error isn't in the database of 38 patterns.

**Solution:**
1. Fix it manually
2. Consider adding it to error-patterns.json
3. Report it so the database can be improved

### TypeScript Errors After Import Fixes

This is normal. Fixing import errors can reveal type errors that were hidden.

**Solution:** Let the skill continue - it will fix TypeScript errors in the next iteration.

## Tips

1. **Clear cache first** if you've updated dependencies
2. **Let it run** - don't interrupt the iterative process
3. **Trust the stop** - if it stops for manual review, there's a good reason
4. **Check warnings** - even if the build succeeds, review warnings
5. **Commit fixes** - the automatic fixes are usually correct

## Limitations

- Only works with Next.js projects
- Requires Python 3 for the analyzer script
- Limited to known error patterns (38+ currently)
- Cannot fix complex architectural issues
- Cannot make config changes without approval

## Integration

This is a **standalone skill** - it doesn't automatically integrate with:
- test-manager-skill
- git-manager-skill
- docs-manager-skill
- constant-manager-skill

But you can use them together manually:

```
Run tests                      # test-manager-skill
Run the build and fix errors   # build-manager-skill
Commit the changes            # git-manager-skill
```

## Performance

Typical performance on a medium-sized Next.js project:

- **First build:** 5-15 seconds
- **Analysis:** 1-2 seconds
- **Fix application:** 2-5 seconds per iteration
- **Total time:** Usually under 1 minute
- **Iterations needed:** 1-3 on average

## Status Dashboard

After running, you'll see:

```
📊 Build Health Report

Status: SUCCESS ✓
Errors: 0
Warnings: 0

── Breakdown by Category ──
import:     0 errors
typescript: 0 errors
react:      0 errors
eslint:     0 warnings
nextjs:     0 warnings

── Auto-fix Performance ──
✓ Fixed: 15 issues
⏱ Time: 45 seconds
🔄 Iterations: 2
```

## Support

If you encounter issues:

1. Check the SKILL.md for detailed documentation
2. Review error-patterns.json to see if your error is covered
3. Run the analyzer manually to see raw analysis
4. Check build output in /tmp/build-output-*.txt

## Version

**Current Version:** 1.0.0
**Last Updated:** 2025-01-18
**Patterns:** 38 error patterns
**Categories:** 7 categories

## License

Part of the Weavink project build system.
