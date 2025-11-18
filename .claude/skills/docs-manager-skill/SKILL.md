---
name: docs-manager
description: Professional documentation management system for technical guides. Creates, updates, searches, and manages markdown documentation with intelligent indexing, relationship tracking, and automatic metadata. Use when creating documentation, documenting code, searching for guides, updating docs after code changes, or managing documentation relationships. Also use before modifying code to check for related documentation.
allowed-tools: Read, Write, Glob, Bash
---

# Documentation Manager

Professional documentation system for Weavink technical guides with intelligent indexing, search, and relationship management.

## Core Capabilities

1. **Create Documentation** - Generate new guides with proper structure and metadata
2. **Search & Discover** - Find guides by keyword, function, tag, or category
3. **Update Index** - Maintain docs-index.json and INDEX.md automatically
4. **Track Relationships** - Link related guides and maintain knowledge graph
5. **Code Integration** - Check for docs before code changes, update after
6. **Status Management** - Track guide status (active, superseded, draft, deprecated)

## Documentation Structure

### File Locations
- **Guides Directory**: `/home/leo/Syncthing/Code-Weavink/documentation/`
  - Subdirectories: `rgpd/`, `admin/`, `features/`, `infrastructure/`, `testing/`, `tutorials/`, `general/`, `meta/`, `archive/`
- **Index File**: `/home/leo/Syncthing/Code-Weavink/docs-index.json`
- **Master Guide**: `/home/leo/Syncthing/Code-Weavink/INDEX.md`

### Guide Format
Every guide must have YAML frontmatter:
```markdown
---
id: category-topic-###
title: Human Readable Title
category: admin|analytics|rgpd|features|technical|testing|general
tags: [tag1, tag2, tag3]
status: active|superseded|draft|deprecated
created: YYYY-MM-DD
updated: YYYY-MM-DD
related:
  - RELATED_FILE_1.md
  - RELATED_FILE_2.md
---

# Guide Title

## Overview
[Content starts here...]
```

## Confirmation Protocol

**CRITICAL: ALWAYS ASK BEFORE ANY UPDATE OR MODIFICATION**

Before updating, modifying, or changing ANY existing documentation:
1. ✅ Show what will be updated
2. ✅ Show what changes were detected
3. ✅ Ask for explicit confirmation
4. ✅ Wait for user approval
5. ❌ NEVER update without confirmation

**Only exception**: Creating brand new documentation (not updating existing).

## Workflow Instructions

### 1. Creating New Documentation

**Trigger**: User asks to "create documentation", "document this function", "write a guide for"

**Process**:
1. **Gather Information**
   - Ask what needs documenting (function, feature, component, system)
   - Ask for save location and category (default: `/home/leo/Syncthing/Code-Weavink/documentation/`)
   - Identify category subfolder (rgpd, admin, features, infrastructure, testing, tutorials, general, meta, archive)

2. **Read docs-index.json**
   ```bash
   cat /home/leo/Syncthing/Code-Weavink/docs-index.json
   ```
   - Determine next available ID number in category
   - Identify related guides by keywords/functions
   - Get current metadata (total_guides, last_updated)

3. **Generate Guide ID**
   - Format: `{category}-{topic-slug}-{number}`
   - Example: `admin-security-logs-006`
   - Ensure ID is unique

4. **Create Guide Content**
   - Add YAML frontmatter with all metadata
   - Write comprehensive content with:
     - Overview section
     - Implementation details
     - Code examples (if applicable)
     - Function signatures (if applicable)
     - Usage instructions
     - Related documentation links

5. **Extract Metadata**
   From the content, identify:
   - Functions mentioned (format: `functionName()`)
   - Components mentioned (format: `ComponentName`)
   - Tags (5-8 relevant keywords)
   - Summary (1-2 sentences)

6. **Update docs-index.json**
   - Add new guide entry to `guides` array
   - Add guide ID to appropriate category's `guides` array
   - Update `metadata.total_guides` (+1)
   - Update `metadata.last_updated` to current date
   - Save with proper JSON formatting

7. **Regenerate INDEX.md**
   - Call the INDEX.md regeneration process
   - Ensure new guide appears in correct category

8. **Confirm to User**
   Show:
   - ✅ Created: `FILENAME.md`
   - 📝 ID: `guide-id-###`
   - 📂 Category: `category-name`
   - 🔗 Related: List of related guides
   - 📊 Updated index with X total guides

### 2. Searching for Documentation

**Triggers**: 
- "Do we have docs about..."
- "Find documentation for..."
- "Search guides for..."
- Before user wants to modify code

**Process**:
1. **Read docs-index.json**
   ```bash
   cat /home/leo/Syncthing/Code-Weavink/docs-index.json
   ```

2. **Search Strategy**
   Search in this order:
   - Exact ID match
   - Title contains keyword
   - Function names match
   - Tags match
   - Summary contains keyword
   - Related guides contain keyword

3. **Return Results**
   For each match, show:
   ```
   📄 **FILENAME.md**
   - ID: guide-id-###
   - Category: category-name
   - Summary: [1-2 sentence summary]
   - Tags: tag1, tag2, tag3
   - Functions: functionName1, functionName2
   - Status: ✅ active | ⚠️ superseded | 🚧 draft | ⛔ deprecated
   - Related: [List related guide filenames]
   ```

4. **Offer Actions**
   - "Want me to read this guide?"
   - "Want to see related guides?"
   - "Want me to open the file?"

### 3. Reading Existing Documentation

**Trigger**: After search results, or "read the X guide"

**Process**:
1. **Find Guide**
   - Search docs-index.json for exact filename or ID
   - Get full path from index entry

2. **Read Content**
   ```bash
   cat /home/leo/Syncthing/Code-Weavink/FILENAME.md
   ```

3. **Present to User**
   - Show frontmatter metadata
   - Show full content (or summary if very long)
   - Highlight related guides
   - Show functions/components documented

### 4. Updating Documentation

**Triggers**:
- "Update the documentation for..."
- After code changes
- "This guide needs updating"

**Process**:
1. **Find Guide**
   - Search for the guide to update
   - Show which guide was found

2. **Read Current Content**
   - Load the existing guide
   - Show current summary/metadata

3. **Analyze Changes Needed**
   - Identify what changed in the code
   - Determine what needs updating in the guide
   - Extract new functions/components if any

4. **ASK FOR CONFIRMATION** ⚠️ MANDATORY STEP
   Present to user:
   ```
   📝 Ready to update: GUIDE_NAME.md
   
   Current guide covers:
   - [current summary]
   - Functions: [current functions]
   
   Proposed changes:
   - [what will be added/modified]
   - New functions: [if any]
   - Updated sections: [which sections]
   
   Options:
   1. Update guide with these changes
   2. Show me the current guide first
   3. Cancel (I'll update manually)
   
   Proceed? [1/2/3]
   ```
   
   **WAIT for user response. Do NOT proceed without confirmation.**

5. **Update Content** (only after user confirms)
   - Modify the content as needed
   - Update YAML frontmatter:
     - Set `updated: YYYY-MM-DD` to today
     - Update `tags` if needed
     - Update `related` if needed
     - Update `functions` array
     - Update `components` array

6. **Update Index Entry**
   - Find guide in docs-index.json
   - Update:
     - `updated` date
     - `summary` if changed
     - `functions` array if changed
     - `components` array if changed
     - `tags` if changed
     - `related_guides` if changed

7. **Regenerate INDEX.md**
   - Update the master guide index

8. **Confirm Completion**
   Show what was updated:
   ```
   ✅ Updated GUIDE_NAME.md
   
   Changes made:
   - Updated function: functionName()
   - Added new section: [section name]
   - Updated metadata: updated date, functions array
   - Regenerated index
   ```

### 5. Before Modifying Code

**Trigger**: User wants to modify/update/refactor code

**Automatic Process**:
1. **Extract Keywords**
   From user's request, identify:
   - Function names
   - Component names
   - Feature names
   - System names

2. **Search Documentation**
   - Search docs-index.json for matches
   - Look in: functions, components, tags, title

3. **Present Findings**
   If documentation found:
   ```
   📚 Found related documentation:
   - GUIDE_NAME.md - [summary]
   - ANOTHER_GUIDE.md - [summary]
   
   Should I read these guides before we proceed? (Recommended)
   ```

4. **Offer to Read**
   - If user confirms, read the relevant sections
   - Provide context to user about existing implementation

### 6. After Code Changes

**Trigger**: Code was modified/created

**Process**:
1. **Check for Existing Docs**
   - Search for documentation about the modified code

2. **If Docs Exist - ASK FIRST** ⚠️
   ```
   ℹ️ Found existing documentation: GUIDE.md
   
   Your changes to [function/component name] may require updates.
   
   Current guide covers:
   - [summary]
   - Functions: [list]
   
   What would you like to do?
   1. Review the guide first
   2. Update the guide now
   3. Skip for now (I'll update later)
   
   Your choice: [1/2/3]
   ```
   
   **WAIT for user response.**
   
   - If user chooses 1: Read and show the guide
   - If user chooses 2: Proceed to update workflow (which asks again)
   - If user chooses 3: Do nothing

3. **If No Docs Exist - Offer Creation**
   ```
   📝 No documentation found for [function/component name]
   
   Should I create a guide? [Y/n/details]
   
   If "details": Show what will be documented
   If "Y": Proceed to creation workflow
   If "n": Skip
   ```

### 7. Managing Relationships

**Process**:
1. **When Creating Guide**
   - Automatically detect related guides by:
     - Shared tags (3+ matches)
     - Similar functions
     - Same category
     - Mentioned in content

2. **When Updating Guide**
   - Check if relationships changed
   - Update both directions:
     - Add to new guide's `related_guides`
     - Add to related guide's `related` in frontmatter

3. **Maintain Bidirectional Links**
   - If Guide A links to Guide B
   - Ensure Guide B links back to Guide A

### 8. Regenerating INDEX.md

**When**: After any docs-index.json change

**Process**:
1. **Read docs-index.json**
2. **Generate INDEX.md** with structure:
```markdown
# Weavink Documentation Index

**Last Updated:** YYYY-MM-DD  
**Total Guides:** XX

## Quick Navigation
- [Category Name](#category-slug) (X guides)
[... all categories ...]

---

## Category Name
*Category description*

### FILENAME.md
**Summary:** [summary from index]  
**Tags:** [comma-separated tags]  
**Related:** [links to related guides]

[... all guides in category ...]
```

3. **Write to File**
   ```bash
   cat > /home/leo/Syncthing/Code-Weavink/INDEX.md << 'EOF'
   [generated content]
   EOF
   ```

## Helper Functions

### Search by Keyword
```bash
# Read index and search
cat /home/leo/Syncthing/Code-Weavink/docs-index.json | jq '.guides[] | select(.title | contains("keyword") or (.tags | contains(["keyword"])) or (.functions | contains(["keyword"])))'
```

### Get Guide by ID
```bash
cat /home/leo/Syncthing/Code-Weavink/docs-index.json | jq '.guides[] | select(.id == "guide-id-001")'
```

### List Category Guides
```bash
cat /home/leo/Syncthing/Code-Weavink/docs-index.json | jq '.categories.admin.guides'
```

### Get Next ID Number
```bash
# Get max ID number in category, add 1
cat /home/leo/Syncthing/Code-Weavink/docs-index.json | jq '[.guides[] | select(.category == "admin") | .id | split("-")[2] | tonumber] | max + 1'
```

## Status Indicators

- **✅ active** - Current, maintained, use this
- **⚠️ superseded** - Replaced by newer guide (check related guides)
- **🚧 draft** - Work in progress, may be incomplete
- **⛔ deprecated** - No longer relevant, archived

## Categories Explained

- **admin** - Admin dashboard, security, management, analytics panels
- **analytics** - User tracking, metrics, reporting, data analysis
- **rgpd** - GDPR compliance, privacy, data protection, consent
- **features** - User-facing features, UI components, product functionality
- **technical** - Architecture, refactoring, infrastructure, migrations
- **testing** - Test guides, QA procedures, debugging
- **general** - README, setup, operations, miscellaneous

## Best Practices

### Writing Guides
1. **Clear Title** - Descriptive, specific, searchable
2. **Complete Frontmatter** - All fields filled accurately
3. **Good Summary** - 1-2 sentences, explains purpose and scope
4. **Rich Tags** - 5-8 specific, searchable keywords
5. **Code Examples** - Include actual code snippets
6. **Link Related** - Connect to related guides
7. **Keep Updated** - Update when code changes

### Organizing
1. **One Topic Per Guide** - Stay focused
2. **Consistent Naming** - Use clear, descriptive filenames
3. **Proper Category** - Choose most relevant category
4. **Track Functions** - List all functions/components documented
5. **Maintain Relationships** - Keep bidirectional links

### Searching
1. **Start Broad** - Search by general topic first
2. **Use Tags** - Tags are your best search tool
3. **Check Related** - Follow relationship links
4. **Filter by Status** - Ignore deprecated unless needed
5. **Read Summaries** - Quickly scan summaries before reading full docs

## Example Workflows

### Example 1: Document New Feature
```
User: "I just implemented a contact export feature, can you document it?"

1. Ask: "What functions are involved? Where should I save the guide?"
2. Read docs-index.json
3. Generate ID: features-contact-export-024
4. Create: CONTACT_EXPORT_FEATURE.md with frontmatter
5. Add to docs-index.json:
   {
     "id": "features-contact-export-024",
     "title": "Contact Export Feature",
     "filename": "CONTACT_EXPORT_FEATURE.md",
     "category": "features",
     "summary": "Exports user contacts to CSV format with customizable fields",
     "tags": ["contacts", "export", "csv", "features"],
     "functions": ["exportContacts", "formatContactData"],
     "related_guides": ["contact-download-settings-001"]
   }
6. Update INDEX.md
7. Confirm creation
```

### Example 2: Search Before Modifying Code
```
User: "I need to update the login function"

1. Auto-search docs-index.json for "login"
2. Find: admin-security-layers-007 mentions "login authentication"
3. Present:
   📚 Found: documentation/admin/ADMIN_SECURITY_LAYERS_GUIDE.md
   - Documents 7-layer security including login
   - Functions: withAuth, checkAdminPermission
   
   Should I read this guide first?
4. If yes, read and summarize relevant sections
5. User proceeds with informed changes
6. After changes, offer to update the guide
```

### Example 3: Update After Code Change
```
User: "I refactored the analytics service"

1. Search for "analytics" in docs-index.json
2. Find: analytics-service-summary-011
3. Present options:
   "ℹ️ Found: documentation/admin/ANALYTICS_SERVICE_SUMMARY.md
   
   Current guide covers:
   - Analytics service architecture
   - Functions: fetchAnalytics(), aggregateData()
   
   Your refactor may require updates.
   
   What would you like to do?
   1. Show me the current guide first
   2. Update the guide now
   3. Skip for now
   
   Your choice: [1/2/3]"

4. If user chooses "2":
   "📝 Ready to update documentation/admin/ANALYTICS_SERVICE_SUMMARY.md
   
   Proposed changes:
   - Update architecture section
   - Add new functions: [detected functions]
   - Update service flow diagram
   
   Proceed with update? [Y/n]"

5. Wait for "Y" confirmation
6. Update:
   - Content with refactor details
   - Frontmatter: updated: YYYY-MM-DD
   - Index entry: summary, functions
   - Regenerate INDEX.md
7. Confirm: 
   "✅ Updated documentation/admin/ANALYTICS_SERVICE_SUMMARY.md
   
   Changes made:
   - Updated architecture section
   - Added 2 new functions
   - Updated service layer description
   - Refreshed index"
```

### Example 4: Find Related Guides
```
User: "What documentation do we have about admin security?"

1. Search docs-index.json:
   - tags contain "security" + category "admin"
2. Find multiple matches:
   - admin-security-layers-007
   - admin-security-logs-006
   - admin-view-only-003
3. Present all matches with summaries
4. Show relationships:
   - These 3 guides are interconnected
   - Read together for complete picture
5. Offer to read any/all guides
```

## Critical Rules

1. **ALWAYS ASK BEFORE UPDATING** - Never update existing documentation without explicit user confirmation. Show what will change and wait for approval.
2. **Always Read Index First** - Before any operation, read docs-index.json
3. **Always Update Index** - After creating/updating guides, update index
4. **Always Regenerate INDEX.md** - Keep master guide in sync
5. **Always Add Frontmatter** - Every guide needs YAML header
6. **Always Track Relationships** - Connect related guides
7. **Always Update Dates** - Keep created/updated dates accurate
8. **Always Validate** - Ensure JSON is valid, IDs are unique
9. **Always Search Before Create** - Avoid duplicate guides
10. **Always Extract Metadata** - Pull functions, components, tags from content
11. **Always Confirm Actions** - Show user what was done after completion

## Error Handling

### Index File Missing
```bash
if [ ! -f /home/leo/Syncthing/Code-Weavink/docs-index.json ]; then
  echo "⚠️ docs-index.json not found. Should I create it?"
  # If yes, initialize with empty structure
fi
```

### Invalid JSON
```bash
# Test JSON validity
jq empty /home/leo/Syncthing/Code-Weavink/docs-index.json 2>&1
# If error, report to user and offer to fix
```

### Duplicate ID
```bash
# Check before adding
existing=$(cat /home/leo/Syncthing/Code-Weavink/docs-index.json | jq '.guides[] | select(.id == "new-id")')
if [ -n "$existing" ]; then
  echo "⚠️ ID already exists. Generating new ID..."
fi
```

## Integration with Claude Code

This skill integrates seamlessly with Claude Code workflows:

1. **During Development**
   - Automatically searches for docs before code changes
   - Suggests updates after code modifications

2. **In Conversations**
   - Responds to natural requests: "document this", "find docs about X"
   - Proactively suggests documentation needs

3. **With Other Skills**
   - Works alongside coding skills
   - Complements refactoring workflows
   - Supports review processes

## Success Metrics

A well-maintained documentation system should have:
- ✅ Every guide has complete frontmatter
- ✅ docs-index.json matches actual files
- ✅ INDEX.md is up-to-date
- ✅ Relationships are bidirectional
- ✅ All active guides are findable by search
- ✅ Functions/components are tracked
- ✅ Tags are specific and useful

---

*This skill maintains the Weavink documentation system with 45+ guides across 7 categories, ensuring knowledge is organized, searchable, and always up-to-date.*