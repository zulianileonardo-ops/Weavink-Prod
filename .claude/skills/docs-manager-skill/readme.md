# Documentation Manager Skill for Claude Code

Professional documentation management system for Weavink technical guides with intelligent indexing, search, and relationship management.

## Features

- ✅ **Create Documentation** - Generate guides with proper YAML frontmatter
- 🔍 **Smart Search** - Find guides by keyword, function, tag, or category  
- 📊 **Index Management** - Automatically maintain docs-index.json and INDEX.md
- 🔗 **Relationship Tracking** - Link related guides and maintain knowledge graph
- 🔄 **Code Integration** - Check for docs before code changes, update after
- �� **Status Tracking** - Track guide status (active, superseded, draft, deprecated)

## Installation

### Quick Install

```bash
# Copy the skill to Claude Code's skills directory
cp -r /home/claude/docs-manager-skill ~/.claude/skills/docs-manager

# Verify installation
ls ~/.claude/skills/docs-manager/SKILL.md
```

### Manual Install

```bash
# Create the skill directory
mkdir -p ~/.claude/skills/docs-manager/scripts

# Copy SKILL.md
cp /home/claude/docs-manager-skill/SKILL.md ~/.claude/skills/docs-manager/

# Copy helper scripts (optional but recommended)
cp /home/claude/docs-manager-skill/scripts/*.py ~/.claude/skills/docs-manager/scripts/
chmod +x ~/.claude/skills/docs-manager/scripts/*.py
```

## Verification

Start Claude Code and check the skill is loaded:

```bash
cd ~/your-project
claude
```

Then ask:
```
What skills are available?
```

You should see `docs-manager` in the list!

## Usage

### Create Documentation

```
I just implemented a function called exportContactsToCSV. Can you document it?
```

Claude Code will:
1. Ask for details about the function
2. Generate a proper markdown guide with YAML frontmatter
3. Update docs-index.json
4. Regenerate INDEX.md
5. Link to related guides

### Search for Documentation

```
Do we have documentation about login?
```

or before modifying code:

```
I need to update the analytics service
```

Claude Code will automatically search and show relevant guides.

### Update Existing Documentation

```
Update the admin security guide with the new authentication flow
```

Claude Code will:
1. Find the guide
2. Update content
3. Update metadata (updated date, functions, etc.)
4. Refresh the index

### Find Related Guides

```
What other guides are related to RGPD compliance?
```

Claude Code will show all connected guides in the knowledge graph.

## Helper Scripts

### Search Script

Search the documentation index from command line:

```bash
# Search by keyword
python ~/.claude/skills/docs-manager/scripts/search.py login

# Search in specific category
python ~/.claude/skills/docs-manager/scripts/search.py analytics --category admin

# Search by function name
python ~/.claude/skills/docs-manager/scripts/search.py exportContacts
```

### Validation Script

Check documentation index for issues:

```bash
python ~/.claude/skills/docs-manager/scripts/validate.py
```

Checks for:
- Duplicate IDs
- Missing files
- Broken relationships
- Category consistency
- Required fields
- Invalid status values

### Regenerate Index Script

Manually regenerate INDEX.md:

```bash
python ~/.claude/skills/docs-manager/scripts/regenerate_index.py
```

## Documentation Structure

### Required Files

- **docs-index.json** - Machine-readable index at `~/temp2/temp2/docs-index.json`
- **INDEX.md** - Human-readable master guide at `~/temp2/temp2/INDEX.md`
- **Guide files** - Markdown files with YAML frontmatter

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
[Content here...]
```

## Categories

- **admin** - Admin dashboard, security, management, analytics panels
- **analytics** - User tracking, metrics, reporting, data analysis
- **rgpd** - GDPR compliance, privacy, data protection, consent
- **features** - User-facing features, UI components, product functionality
- **technical** - Architecture, refactoring, infrastructure, migrations
- **testing** - Test guides, QA procedures, debugging
- **general** - README, setup, operations, miscellaneous

## Status Indicators

- ✅ **active** - Current, maintained, use this
- ⚠️ **superseded** - Replaced by newer guide (check related guides)
- 🚧 **draft** - Work in progress, may be incomplete
- ⛔ **deprecated** - No longer relevant, archived

## Best Practices

### When Creating Guides

1. **Clear Title** - Descriptive, specific, searchable
2. **Complete Frontmatter** - All fields filled accurately
3. **Good Summary** - 1-2 sentences explaining purpose and scope
4. **Rich Tags** - 5-8 specific, searchable keywords
5. **Code Examples** - Include actual code snippets
6. **Link Related** - Connect to related guides
7. **Track Functions** - List all functions/components documented

### When Searching

1. **Start Broad** - Search by general topic first
2. **Use Tags** - Tags are your best search tool
3. **Check Related** - Follow relationship links
4. **Filter by Status** - Ignore deprecated unless needed

## Troubleshooting

### Skill doesn't activate

Make sure you're asking about documentation:
- "Create documentation for..."
- "Document this function"
- "Find docs about..."
- "Do we have guides for..."

### Scripts don't work

Make sure they're executable:
```bash
chmod +x ~/.claude/skills/docs-manager/scripts/*.py
```

### Index is out of sync

Regenerate manually:
```bash
python ~/.claude/skills/docs-manager/scripts/regenerate_index.py
```

Or ask Claude Code:
```
Regenerate the documentation index
```

## Current Documentation Stats

Your Weavink documentation system currently has:
- 📚 **45 guides**
- 📂 **7 categories**
- 🔗 **Rich relationship network**

## Examples

### Example 1: Document New Feature

```
User: "I just implemented a contact export feature"

Claude Code:
1. Asks about functions involved
2. Creates CONTACT_EXPORT_FEATURE.md with frontmatter
3. Adds to docs-index.json as features-contact-export-042
4. Links to related contact guides
5. Updates INDEX.md
```

### Example 2: Update After Refactoring

```
User: "I refactored the admin analytics service"

Claude Code:
1. Searches for admin analytics guides
2. Finds documentation/admin/ADMIN_ANALYTICS_INTEGRATION_GUIDE.md
3. Offers to update the guide
4. Updates content, metadata, and index
```

### Example 3: Before Code Changes

```
User: "Update the login authentication"

Claude Code:
1. Auto-searches for "login" and "authentication"
2. Finds documentation/admin/ADMIN_SECURITY_LAYERS_GUIDE.md
3. Shows summary and asks to read it first
4. Provides context before you proceed
```

## Contributing

To improve this skill:

1. Edit `~/.claude/skills/docs-manager/SKILL.md`
2. Restart Claude Code to reload
3. Test changes

## Support

For issues or questions:
1. Check Claude Code docs: https://code.claude.com/docs/en/skills
2. Validate your index: `python scripts/validate.py`
3. Check skill is loaded: Ask "What skills are available?"

---

**Version:** 1.0.0  
**Maintained by:** Leo @ Weavink  
**Last Updated:** 2025-11-11
