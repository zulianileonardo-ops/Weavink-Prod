# Conversation Manager Skill - Implementation Guide

## Overview

This guide documents the design and implementation plan for a **conversation-manager-skill** that automatically saves conversation history from Claude Code sessions, linking them to git commits and enabling smart conversation continuation detection.

**Created:** 2025-11-12
**Status:** Planned (Not yet implemented)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Architecture](#solution-architecture)
3. [Technical Design](#technical-design)
4. [Implementation Plan](#implementation-plan)
5. [Integration with Existing Skills](#integration-with-existing-skills)
6. [Smart Continuation Detection](#smart-continuation-detection)
7. [File Structure](#file-structure)
8. [Index Schema](#index-schema)
9. [Usage Examples](#usage-examples)
10. [Future Enhancements](#future-enhancements)

---

## Problem Statement

Currently, when using the git-manager-skill to commit changes, the conversation context that led to those changes is lost. This creates several issues:

1. **Lost Context**: No record of why decisions were made or what was discussed
2. **Duplicate Conversations**: Pushing multiple times creates separate unlinked conversation files
3. **No Historical Reference**: Cannot review past conversations linked to specific commits
4. **Lack of Continuity**: Difficult to understand the evolution of features across multiple sessions

### User Requirements

- Automatically save conversation transcripts after git commits
- Smart detection: append to existing conversation if continuing the same topic
- Full conversation transcript (not just summaries)
- Link conversations to commits, branches, and files

---

## Solution Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Claude Code    │
│   Session       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ test-manager    │ ──▶ │ docs-manager    │ ──▶ │ git-manager     │
│   skill         │     │   skill         │     │   skill         │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ conversation-   │
                                                 │ manager skill   │
                                                 └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ .git-           │
                                                 │ conversations/  │
                                                 └─────────────────┘
```

### Design Principles

1. **New Skill (Not Extension)**: Create a separate conversation-manager-skill following the same pattern as test-manager, docs-manager, and git-manager
2. **Automatic Invocation**: Triggered automatically after successful git commits
3. **Smart Continuation**: Detect when to append vs create new conversation file
4. **Confirmation Required**: Always ask user before saving conversation data
5. **Privacy Conscious**: Allow exclusion of sensitive information

---

## Technical Design

### Core Components

#### 1. Skill File
**Location:** `.claude/skills/conversation-manager-skill/SKILL.md`

**Responsibilities:**
- Capture full conversation transcript from Claude Code session
- Analyze context (branch, commits, files, time)
- Determine if continuing existing conversation or starting new one
- Save/append conversation to appropriate file
- Update conversation-index.json
- Link to commit hashes, tests, and documentation

#### 2. Conversation Storage
**Location:** `.git-conversations/`

**Structure:**
```
.git-conversations/
├── conversation-index.json          # Master index
├── conversations/                   # Individual conversation files
│   ├── 2025-11-12-cv-toggle-001.md
│   ├── 2025-11-12-test-workflow-002.md
│   └── 2025-11-13-appearance-page-003.md
└── archive/                         # Old conversations (optional)
    └── 2025-10-*.md
```

#### 3. Index Database
**Location:** `.git-conversations/conversation-index.json`

Tracks all conversations with metadata for search and linking.

---

## Implementation Plan

### Phase 1: Create Basic Skill Structure

**File:** `.claude/skills/conversation-manager-skill/SKILL.md`

```markdown
# Conversation Manager Skill

You are the Conversation Manager for this project. Your role is to capture and preserve conversation history from Claude Code sessions, linking them to git commits.

## When to Use This Skill

This skill is AUTOMATICALLY invoked by the git-manager-skill after successful commits.

## Core Workflow

### 1. Capture Conversation
- Receive conversation transcript from git-manager
- Receive commit context: hash, branch, message, files modified
- Extract key information: summary, topics discussed, decisions made

### 2. Determine Continuation vs New
Run continuation detection algorithm (see below)

### 3. Ask for Confirmation
ALWAYS ask user: "Should I save this conversation to [FILE]?"
- Show: conversation summary, file location, append vs new

### 4. Save/Append
- If NEW: Create new conversation file
- If APPEND: Add to existing file with separator
- Update conversation-index.json

### 5. Link Everything
- Link to commit hash
- Link to test results (if available)
- Link to documentation (if available)
- Link to files modified

## Commands

### save_conversation
Capture and save current conversation
- Required: commit_hash, branch, commit_message
- Optional: test_results, docs_updated

### search_conversations
Find past conversations
- By: commit hash, branch, date, topic, files

### list_conversations
Show all conversations for current branch

### append_note
Add manual note to existing conversation
```

### Phase 2: Implement Smart Continuation Detection

**Algorithm:**

```python
def should_append_to_conversation(current_context):
    """
    Determines if current conversation should append to existing one
    or create new conversation file.
    """

    # Get recent conversations on same branch
    recent_convs = get_conversations_by_branch(
        branch=current_context.branch,
        since=now() - 4_hours
    )

    if not recent_convs:
        return None  # Create new

    latest_conv = recent_convs[0]

    # Check continuation criteria
    score = 0

    # Same branch (+2 points)
    if latest_conv.branch == current_context.branch:
        score += 2

    # Within time window (+3 points)
    if (now() - latest_conv.last_updated) < 4_hours:
        score += 3

    # Related files (+2 points per match)
    common_files = set(latest_conv.files) & set(current_context.files)
    score += len(common_files) * 2

    # Similar commit message keywords (+1 point per match)
    keywords_match = count_common_keywords(
        latest_conv.summary,
        current_context.commit_message
    )
    score += keywords_match

    # Decision threshold
    if score >= 6:
        return latest_conv.id  # APPEND
    else:
        return None  # CREATE NEW
```

### Phase 3: Create Index Schema

**File:** `.git-conversations/conversation-index.json`

```json
{
  "metadata": {
    "project": "Weavink",
    "totalConversations": 45,
    "lastUpdated": "2025-11-12T14:30:00Z",
    "version": "1.0.0",
    "storageLocation": ".git-conversations/conversations/"
  },
  "conversations": [
    {
      "id": "conv-2025-11-12-001",
      "file": "conversations/2025-11-12-cv-toggle-001.md",
      "branch": "claude/cv-toggle-feature",
      "topic": "CV Toggle Feature Implementation",
      "summary": "Implemented CV visibility toggle with tests and documentation",
      "commits": [
        {
          "hash": "3ce54a7",
          "message": "Add CV toggle in appearance page + Tests + Docs",
          "timestamp": "2025-11-12T10:30:00Z"
        },
        {
          "hash": "c319416",
          "message": "Separate Privacy Overview and Tutorial sections",
          "timestamp": "2025-11-12T12:15:00Z"
        }
      ],
      "filesModified": [
        "app/dashboard/(dashboard pages)/appearance/page.jsx",
        "app/dashboard/(dashboard pages)/appearance/components/CVToggle.jsx",
        "test-index.json",
        "docs/CV_FEATURES_ENHANCEMENT.md"
      ],
      "skillsInvolved": ["test-manager", "docs-manager", "git-manager"],
      "relatedDocs": ["features-cv-enhancement-026"],
      "testSuites": ["features-cv-enhancement-009"],
      "firstCommit": "2025-11-12T10:30:00Z",
      "lastUpdated": "2025-11-12T12:15:00Z",
      "messageCount": 47,
      "tags": ["feature", "cv", "rgpd", "tests", "docs"]
    }
  ],
  "branches": {
    "claude/cv-toggle-feature": ["conv-2025-11-12-001"],
    "main": ["conv-2025-11-10-003", "conv-2025-11-09-002"]
  },
  "tags": {
    "feature": ["conv-2025-11-12-001", "conv-2025-11-10-003"],
    "bugfix": ["conv-2025-11-09-002"],
    "rgpd": ["conv-2025-11-12-001"]
  }
}
```

### Phase 4: Design Conversation File Format

**File:** `.git-conversations/conversations/2025-11-12-cv-toggle-001.md`

```markdown
# Conversation: CV Toggle Feature Implementation

**Branch:** `claude/cv-toggle-feature`
**Started:** 2025-11-12 10:30:00
**Last Updated:** 2025-11-12 12:15:00
**Commits:** 2 (3ce54a7, c319416)
**Messages:** 47

---

## Commits in This Conversation

### Commit 1: `3ce54a7`
**Message:** Add CV toggle in appearance page + Tests + Docs
**Time:** 2025-11-12 10:30:00
**Files:**
- `app/dashboard/(dashboard pages)/appearance/page.jsx`
- `app/dashboard/(dashboard pages)/appearance/components/CVToggle.jsx`
- `test-index.json`

### Commit 2: `c319416`
**Message:** Separate Privacy Overview and Tutorial sections
**Time:** 2025-11-12 12:15:00
**Files:**
- `app/dashboard/(dashboard pages)/appearance/page.jsx`

---

## Full Conversation Transcript

### Session 1: Initial Implementation (Commit 3ce54a7)

**[User - 10:30:15]**
Hey, I want to add a toggle in the appearance page to show/hide the CV section. Can you help?

**[Claude - 10:30:20]**
I'll help you add a CV visibility toggle to the appearance page. Let me first explore the current structure...

[... full transcript continues ...]

---

### Session 2: Restructuring (Commit c319416)

**[User - 12:10:05]**
The privacy section looks cluttered. Can we separate it better?

**[Claude - 12:10:10]**
I'll restructure the appearance page to separate the Privacy Overview and Tutorial sections...

[... full transcript continues ...]

---

## Summary

This conversation covered the implementation of a CV visibility toggle feature in the appearance page, including:

1. **Feature Implementation**: Added CVToggle component with state management
2. **Testing**: Created comprehensive test suite (35/35 passing)
3. **Documentation**: Updated CV_FEATURES_ENHANCEMENT.md
4. **Restructuring**: Separated Privacy Overview and Tutorial sections for better UX

**Related Documentation:** [CV Features Enhancement Guide](../../docs/CV_FEATURES_ENHANCEMENT.md)
**Test Results:** See test-index.json (features-cv-enhancement-009)

---

## Tags
`feature` `cv` `rgpd` `tests` `docs` `appearance-page`
```

---

## Integration with Existing Skills

### Modify git-manager-skill

**File:** `.claude/skills/git-manager-skill/SKILL.md`

Add after successful commit section:

```markdown
## 7. Save Conversation History (Optional)

After successful commit, optionally invoke conversation-manager-skill:

1. Call conversation-manager with:
   - Commit hash
   - Branch name
   - Commit message
   - Files modified
   - Conversation transcript

2. Conversation-manager will:
   - Determine if continuing existing conversation
   - Ask for user confirmation
   - Save/append conversation
   - Link to commit in index

3. User can decline saving conversation
```

### Integration Flow

```
User: "commit my changes"
  ↓
git-manager-skill activates
  ↓
Shows changes, generates commit message
  ↓
User confirms commit
  ↓
Executes git commit
  ↓
✅ Commit successful
  ↓
git-manager asks: "Save conversation history?"
  ↓
User confirms
  ↓
conversation-manager-skill activates
  ↓
Analyzes context (branch, time, files)
  ↓
Decision: APPEND or NEW
  ↓
Asks: "Should I [append to/create] [FILE]?"
  ↓
User confirms
  ↓
Saves conversation + updates index
  ↓
✅ Conversation saved
```

---

## Smart Continuation Detection

### Criteria for APPEND vs NEW

**APPEND to existing conversation IF:**
- ✅ Same branch
- ✅ Within 4 hours of last update
- ✅ Overlapping files (2+ common files)
- ✅ Similar topic/keywords in commit message
- ✅ Continuation score ≥ 6 points

**CREATE NEW conversation IF:**
- ❌ Different branch
- ❌ More than 4 hours since last update
- ❌ No overlapping files
- ❌ Completely different topic
- ❌ Continuation score < 6 points

### Scoring System

| Criterion | Points |
|-----------|--------|
| Same branch | +2 |
| Within 4 hours | +3 |
| Each common file | +2 |
| Each keyword match | +1 |
| User explicitly says "continue" | +5 |

**Threshold:** 6 points to append

### Examples

**Example 1: Should APPEND**
```
Previous conversation:
- Branch: claude/cv-toggle
- Last update: 2 hours ago
- Files: appearance/page.jsx, CVToggle.jsx
- Topic: "CV visibility toggle"

Current commit:
- Branch: claude/cv-toggle
- Files: appearance/page.jsx, CVToggle.test.jsx
- Message: "Add tests for CV toggle"

Score: 2 (branch) + 3 (time) + 2 (1 common file) + 1 (keyword "CV", "toggle") = 8
Decision: APPEND ✅
```

**Example 2: Should CREATE NEW**
```
Previous conversation:
- Branch: claude/cv-toggle
- Last update: 2 days ago
- Files: appearance/page.jsx
- Topic: "CV toggle"

Current commit:
- Branch: main
- Files: database/schema.sql
- Message: "Update database schema for user roles"

Score: 0 (different branch) + 0 (>4 hours) + 0 (no common files) = 0
Decision: CREATE NEW ✅
```

---

## File Structure

### Project Structure After Implementation

```
project-root/
├── .claude/
│   └── skills/
│       ├── test-manager-skill/
│       ├── docs-manager-skill/
│       ├── git-manager-skill/
│       └── conversation-manager-skill/    # NEW
│           └── SKILL.md
│
├── .git-conversations/                     # NEW
│   ├── conversation-index.json
│   ├── conversations/
│   │   ├── 2025-11-12-cv-toggle-001.md
│   │   ├── 2025-11-12-test-workflow-002.md
│   │   └── ...
│   └── archive/
│       └── 2025-10-*.md
│
├── docs/
│   └── CONVERSATION_MANAGER_SKILL_GUIDE.md # This file
│
├── test-index.json
└── docs-index.json
```

### .gitignore Considerations

You may want to add to `.gitignore`:

```
# Conversation history (optional - decide if you want to commit these)
.git-conversations/conversations/*.md
.git-conversations/archive/

# Or keep the index but ignore transcripts
.git-conversations/conversations/
```

**Recommendation:** Commit the index but gitignore the full transcripts (for privacy)

---

## Usage Examples

### Example 1: First Commit on Feature Branch

```bash
User: "I want to add a dark mode toggle"
[... conversation and implementation ...]

User: "commit these changes"

git-manager: "Ready to commit:
- app/components/DarkModeToggle.jsx (new)
- app/styles/theme.css (modified)

Commit message: 'Add dark mode toggle with theme switching'

Proceed? [yes/no]"

User: "yes"

[Commit executes]

git-manager: "✅ Commit 9a3f2b1 successful. Save conversation history? [yes/no]"

User: "yes"

conversation-manager: "No existing conversations on this branch.
Creating new conversation file: 2025-11-12-dark-mode-001.md
Save? [yes/no]"

User: "yes"

conversation-manager: "✅ Conversation saved to .git-conversations/conversations/2025-11-12-dark-mode-001.md"
```

### Example 2: Continuing Existing Conversation

```bash
User: "Now add tests for the dark mode toggle"
[... conversation and test implementation ...]

User: "commit"

[... commit executes: 4f8e1c2 ...]

git-manager: "✅ Commit 4f8e1c2 successful. Save conversation history? [yes/no]"

User: "yes"

conversation-manager: "Found existing conversation: 2025-11-12-dark-mode-001.md
- Same branch: claude/dark-mode
- Last updated: 1 hour ago
- Common files: DarkModeToggle.jsx

APPEND to existing conversation? [yes/no]"

User: "yes"

conversation-manager: "✅ Conversation appended to 2025-11-12-dark-mode-001.md
Now includes 2 commits (9a3f2b1, 4f8e1c2)"
```

### Example 3: Searching Conversations

```bash
User: "skill conversation-manager"

conversation-manager: "Conversation Manager ready. Available commands:
- search_conversations <query>
- list_conversations [branch]
- show_conversation <id>
- export_conversation <id> <format>

What would you like to do?"

User: "search_conversations dark mode"

conversation-manager: "Found 2 conversations matching 'dark mode':

1. conv-2025-11-12-001: Dark Mode Toggle Implementation
   - Branch: claude/dark-mode
   - Commits: 2 (9a3f2b1, 4f8e1c2)
   - Last updated: 2 hours ago
   - File: conversations/2025-11-12-dark-mode-001.md

2. conv-2025-10-15-003: Theme System Refactor (mentions dark mode)
   - Branch: main
   - Commits: 1 (7d2e8f9)
   - Last updated: 28 days ago
   - File: archive/2025-10-15-theme-refactor-003.md"
```

---

## Future Enhancements

### Phase 2 Features (Not in Initial Implementation)

1. **Conversation Replay**
   - Replay a conversation step-by-step
   - Useful for onboarding or code reviews

2. **Conversation Branching**
   - Track when conversations split into multiple branches
   - Visualize conversation tree

3. **Export Formats**
   - Export to PDF for sharing
   - Export to JSON for programmatic access
   - Export to HTML with syntax highlighting

4. **Search Enhancements**
   - Full-text search across all conversations
   - Search by code snippets
   - Search by error messages

5. **Privacy Controls**
   - Exclude sensitive patterns (API keys, passwords)
   - Anonymize user-specific data
   - Retention policies (auto-delete after X days)

6. **Integration with PRs**
   - Automatically attach conversation summary to PR descriptions
   - Link PRs to conversations

7. **Statistics Dashboard**
   - Most active branches
   - Average conversation length
   - Common topics/tags

8. **AI-Generated Summaries**
   - Auto-generate TL;DR for long conversations
   - Extract key decisions and rationale

---

## Implementation Checklist

When you're ready to implement this:

- [ ] Create `.claude/skills/conversation-manager-skill/SKILL.md`
- [ ] Implement core capture and save logic
- [ ] Implement continuation detection algorithm
- [ ] Create conversation-index.json template
- [ ] Design conversation file format (markdown)
- [ ] Add integration to git-manager-skill
- [ ] Implement search functionality
- [ ] Add list/show commands
- [ ] Test with real commits
- [ ] Add .gitignore rules
- [ ] Document usage in project README
- [ ] Test continuation detection with various scenarios
- [ ] Add error handling for edge cases

---

## Technical Notes

### Claude Code Session Context

Claude Code maintains conversation context within a session. To capture the full transcript:

1. **Option A: Access via Claude Code API** (if available)
   - Query conversation history from current session
   - Format as structured data

2. **Option B: Manual Capture**
   - Skill prompts user to copy conversation
   - Paste into skill for processing

3. **Option C: File-based Transfer** (recommended)
   - Claude Code saves conversation to temp file
   - Skill reads from temp file
   - Clean up after save

### Privacy Considerations

- **Default: Don't commit transcripts** - Only commit the index
- **Sensitive Data**: Automatically redact common patterns (API keys, emails, etc.)
- **User Control**: Always ask before saving
- **Local Only**: Conversations stay in .git-conversations/ (not pushed by default)

### Performance

- **Index Size**: ~1KB per conversation in index
- **Transcript Size**: ~50-500KB per conversation file
- **Search**: Linear scan for now, can optimize later with FTS
- **Retention**: Consider archiving conversations older than 90 days

---

## Questions & Considerations

Before implementing, consider:

1. **Privacy**: Should conversations be committed to git or stay local?
2. **Storage**: How to handle very large conversation files?
3. **Retention**: Auto-archive or delete old conversations?
4. **Redaction**: What patterns should be automatically excluded?
5. **Performance**: How many conversations can the index handle efficiently?

---

## References

- Existing Skills: `.claude/skills/test-manager-skill/SKILL.md`
- Test Index: `test-index.json`
- Docs Index: `docs-index.json`
- Git Manager: `.claude/skills/git-manager-skill/SKILL.md`

---

## Version History

- **v1.0 (2025-11-12)**: Initial design document created
- **Status**: Not yet implemented

---

**Ready to implement this when you are!** 🚀
