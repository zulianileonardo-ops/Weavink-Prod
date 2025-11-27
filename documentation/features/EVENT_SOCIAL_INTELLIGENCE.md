---
id: features-event-social-intelligence-084
title: Event Social Intelligence System
category: features
tags: [events, social-intelligence, ghost-mode, ai-matching, meeting-zones, neo4j, map, visibility, testing]
status: in-progress
created: 2025-11-26
updated: 2025-11-27
related:
  - INTELLIGENT_GROUPS_NEO4J_SPEC.md
  - SESSION_TRACKING_FIX.md
  - RGPD_COMPLIANCE_MATRIX.md
---

# Event Social Intelligence System

## Overview

The Event Social Intelligence system transforms Weavink from a passive contact manager into a **proactive networking companion**. It enables users to maximize the value of professional events through:

1. **Contextual & Predictive Event Mapping** - Display future events on the map with participation intent signals
2. **Granular Visibility System (Ghost Mode)** - 4-tier privacy controls including the innovative Ghost Mode
3. **Event Semantic Search Engine** - Natural language queries about event participants
4. **Dynamic Meeting Zones** - AI-powered micro-clusters of 3-5 compatible people

## Key Innovation: Ghost Mode

Ghost Mode is the flagship privacy innovation that differentiates Weavink:

> **Ghost Mode**: Users remain completely invisible to other humans but allow AI to detect professional synergies for **double opt-in** introductions.

### How Ghost Mode Works

```
User A (Ghost Mode) ──────────────────────────────────────────────
    │
    │  ❌ Human visibility: BLOCKED
    │  ✅ AI analysis: ALLOWED
    │
    └──► AI Engine detects synergy ◄── User B (Ghost Mode)
              │                              │
              ▼                              │
         Match Generated                     │
              │                              │
              ▼                              ▼
    ┌─────────────────┐          ┌─────────────────┐
    │ User A Notified │          │ User B Notified │
    │ "Potential match│          │ "Potential match│
    │  detected"      │          │  detected"      │
    └────────┬────────┘          └────────┬────────┘
             │                            │
             ▼                            ▼
         Accept? ───────────────────── Accept?
             │                            │
             └────────► BOTH YES? ◄───────┘
                            │
                            ▼
                    ✅ Connection Revealed
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  ContactsMap.jsx     EventPanel.jsx     MeetingZones.jsx       │
│  (Map + Events)      (RSVP + Intent)    (AI Clusters)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER                                    │
├─────────────────────────────────────────────────────────────────┤
│  /api/events/*              /api/events/matches/*               │
│  /api/events/attendance/*   /api/events/meeting-zones/*         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  serviceEvent/                                                   │
│  ├── client/constants/eventConstants.js                         │
│  ├── server/                                                     │
│  │   ├── eventService.js           (CRUD operations)           │
│  │   ├── visibilityService.js      (Privacy rules)             │
│  │   ├── matchingService.js        (AI matching)               │
│  │   └── meetingZoneService.js     (Cluster generation)        │
│  └── shared/eventTypes.js          (JSDoc types)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  Firestore                 Neo4j                  Pinecone      │
│  ├── events/               ├── Event nodes        └── Event     │
│  │   └── participants/     ├── ATTENDS rels           vectors   │
│  └── event_matches/        └── MATCHED_AT rels                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. EVENT CREATION
   Google Calendar ──► Firestore ──► Neo4j Event Node
        or Manual

2. PARTICIPATION SIGNAL
   User RSVP + Intent ──► Firestore participants ──► Neo4j ATTENDS rel
                                                      └── visibility
                                                      └── lookingFor
                                                      └── offering

3. AI MATCHING (Ghost Mode)
   Neo4j Graph Query ──► Compatibility Score ──► MATCHED_AT rel
                                                     │
                                                     ▼
                                              Notify Both Users

4. MEETING ZONES
   Neo4j Community Detection ──► 3-5 Person Clusters ──► Zone Suggestions
```

## Database Schema

### Firestore Collections

```javascript
// events/{eventId}
{
  id: string,                    // Unique identifier
  userId: string,                // Owner/creator
  name: string,                  // Event name
  description: string,           // Event description
  startDate: Timestamp,          // Start date/time
  endDate: Timestamp,            // End date/time
  location: {
    address: string,
    latitude: number,
    longitude: number,
    venue: string,
    placeId: string              // Google Places ID
  },
  source: 'google_calendar' | 'manual' | 'outlook',
  sourceId: string,              // External calendar event ID
  isRecurring: boolean,
  tags: string[],
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// events/{eventId}/participants/{participantId}
{
  contactId: string,             // Reference to contact
  visibility: 'public' | 'friends' | 'private' | 'ghost',
  intent: string,                // Primary participation intent
  secondaryIntents: string[],    // Additional intents
  lookingFor: string[],          // What they're seeking
  offering: string[],            // What they can provide
  status: 'confirmed' | 'maybe' | 'declined' | 'interested',
  notes: string,                 // Personal notes
  confirmedAt: Timestamp,
  updatedAt: Timestamp
}

// event_matches/{matchId}
{
  eventId: string,
  contact1Id: string,
  contact2Id: string,
  compatibilityScore: number,    // 0-1
  reasons: MatchReason[],
  status: 'pending' | 'accepted' | 'declined' | 'expired',
  contact1Accepted: boolean,
  contact2Accepted: boolean,
  createdAt: Timestamp,
  acceptedAt: Timestamp | null,
  expiresAt: Timestamp
}
```

### Neo4j Schema

```cypher
// Event Node
(:Event {
  id: string,
  userId: string,
  name: string,
  description: string,
  startDate: datetime,
  endDate: datetime,
  address: string,
  latitude: float,
  longitude: float,
  source: string,
  updatedAt: datetime
})

// ATTENDS Relationship
(:Contact)-[:ATTENDS {
  visibility: string,           // 'public', 'friends', 'private', 'ghost'
  intent: string,               // Primary intent
  lookingFor: string[],         // Array of looking_for types
  offering: string[],           // Array of offering types
  status: string,               // Attendance status
  updatedAt: datetime
}]->(:Event)

// MATCHED_AT Relationship
(:Contact)-[:MATCHED_AT {
  eventId: string,
  compatibilityScore: float,
  reasons: string[],
  status: string,
  contact1Accepted: boolean,
  contact2Accepted: boolean,
  createdAt: datetime,
  updatedAt: datetime
}]-(:Contact)
```

## Visibility System

### Visibility Modes

| Mode | Description | Map Visibility | List Visibility | AI Matching |
|------|-------------|----------------|-----------------|-------------|
| `public` | Visible to all | ✅ Everyone | ✅ Everyone | ✅ Yes |
| `friends` | Visible to connections | ✅ Friends only | ✅ Friends only | ✅ Yes |
| `private` | Only self-visible | ❌ No one | ❌ No one | ❌ No |
| `ghost` | AI-only visibility | ❌ No one | ❌ No one | ✅ Yes |

### Visibility Query Logic

```cypher
// Get visible attendees for a user
MATCH (c:Contact {userId: $userId})-[r:ATTENDS]->(e:Event {id: $eventId})
WHERE r.visibility = 'public'
   OR (r.visibility = 'friends' AND c.id IN $friendIds)
   OR c.id = $requesterId
RETURN c, r
```

## Participation Intents

### Intent Types

| Intent | Description | Icon |
|--------|-------------|------|
| `recruiting` | Looking to hire | 👔 |
| `networking` | General networking | 🤝 |
| `market_research` | Researching market | 📊 |
| `learning` | Learning/education | 📚 |
| `partnership` | Seeking partnerships | 🤝 |
| `investment` | Investment opportunities | 💰 |
| `mentorship` | Seeking/offering mentorship | 🎓 |
| `speaking` | Speaker/presenter | 🎤 |
| `sponsoring` | Event sponsor | 🏆 |
| `attending_only` | Just attending | 👁️ |

### Looking For / Offering Types

**Looking For:**
- `cofounder` - Looking for co-founder
- `investor` - Seeking investment
- `mentor` - Seeking mentorship
- `employee` - Looking to hire
- `client` - Seeking clients
- `partner` - Seeking business partner
- `freelancer` - Hiring freelancers
- `advisor` - Seeking advisors
- `supplier` - Seeking suppliers

**Offering:**
- `mentorship` - Can provide mentorship
- `investment` - Can provide investment
- `job_opportunities` - Has job openings
- `services` - Offers services
- `expertise` - Offers expertise
- `partnership` - Open to partnerships
- `introduction` - Can make introductions
- `collaboration` - Open to collaboration

## AI Matching Algorithm

### Compatibility Score Calculation

```javascript
function calculateCompatibility(contact1, contact2) {
  const weights = {
    lookingForMatch: 0.40,    // 40% - Primary matching criterion
    intentMatch: 0.25,        // 25% - Intent alignment
    industryMatch: 0.15,      // 15% - Industry overlap
    tagMatch: 0.10,           // 10% - Shared tags
    semanticMatch: 0.10       // 10% - Profile similarity
  };

  // Looking For / Offering Match
  const lfScore = computeLookingForScore(
    contact1.lookingFor, contact1.offering,
    contact2.lookingFor, contact2.offering
  );

  // Intent Compatibility Matrix
  const intentScore = INTENT_COMPATIBILITY_MATRIX[contact1.intent][contact2.intent];

  // Industry Overlap
  const industryScore = computeJaccardSimilarity(
    contact1.industries, contact2.industries
  );

  // Tag Overlap
  const tagScore = computeJaccardSimilarity(
    contact1.tags, contact2.tags
  );

  // Semantic Profile Similarity (from Pinecone)
  const semanticScore = await getSemanticSimilarity(contact1.id, contact2.id);

  return (
    lfScore * weights.lookingForMatch +
    intentScore * weights.intentMatch +
    industryScore * weights.industryMatch +
    tagScore * weights.tagMatch +
    semanticScore * weights.semanticMatch
  );
}
```

### Looking For / Offering Match Matrix

```javascript
const COMPATIBILITY_MATRIX = {
  // lookingFor -> offering compatibility scores
  cofounder: { partnership: 1.0, collaboration: 0.8, expertise: 0.6 },
  investor: { investment: 1.0, introduction: 0.7 },
  mentor: { mentorship: 1.0, expertise: 0.8 },
  employee: { job_opportunities: 1.0, services: 0.5 },
  client: { services: 1.0, expertise: 0.7 },
  partner: { partnership: 1.0, collaboration: 0.9, introduction: 0.6 },
  freelancer: { job_opportunities: 0.8, services: 0.7 },
  advisor: { mentorship: 0.9, expertise: 1.0 },
  supplier: { services: 0.9, partnership: 0.7 }
};
```

## Meeting Zones

### Zone Generation Algorithm

Meeting Zones use **Greedy Compatibility Clustering** to create micro-clusters of 3-5 compatible people. This algorithm is implemented in JavaScript using the existing 5-signal compatibility scoring from MatchingService:

```javascript
// Greedy Compatibility Clustering Algorithm
// 1. Build NxN compatibility matrix using MatchingService.calculateCompatibilityScore
// 2. Sort all pairs by compatibility score (descending)
// 3. Start with highest-scoring pairs as cluster seeds
// 4. Greedily add members that maximize group cohesion (avg pairwise score)
// 5. Stop when cluster reaches 5 members or cohesion drops below threshold
// 6. Repeat until all participants assigned or can't form valid clusters
// 7. Split any clusters > 5 into balanced sub-clusters

class MeetingZoneService {
  static async buildCompatibilityMatrix(participants, userId) {
    // Create NxN matrix using MatchingService scoring
  }

  static clusterParticipants(participants, matrix) {
    // Greedy algorithm starting from highest-scoring pairs
    // Ensures clusters are 3-5 members per MEETING_ZONE_CONFIG
  }

  static splitLargeClusters(clusters, matrix) {
    // Split any oversized clusters while maintaining cohesion
  }
}
```

**Configuration** (from `eventConstants.js`):
- `MIN_CLUSTER_SIZE`: 3 members
- `MAX_CLUSTER_SIZE`: 5 members
- `MAX_ZONES_PER_EVENT`: 20 zones
- `MIN_ZONE_COMPATIBILITY`: 0.6 threshold
- `REGENERATION_INTERVAL_MINUTES`: 30 minutes cache

### Zone Naming

AI generates descriptive names based on shared characteristics:
- "Startup Founders Corner" - High concentration of founders
- "Tech Recruiters Hub" - Recruiters looking for talent
- "Investment Circle" - Investors and fundraising founders
- "SaaS Builders Meetup" - SaaS-focused entrepreneurs

## API Routes

### Event Management

```
GET    /api/events                    # List user's events
POST   /api/events                    # Create event
GET    /api/events/:id                # Get event details
PUT    /api/events/:id                # Update event
DELETE /api/events/:id                # Delete event
```

### Attendance Management

```
POST   /api/events/:id/attendance     # Register attendance
PUT    /api/events/:id/attendance     # Update attendance details
DELETE /api/events/:id/attendance     # Cancel attendance
GET    /api/events/:id/attendees      # List visible attendees
```

### AI Matching

```
GET    /api/events/:id/matches        # Get matches for user at event
POST   /api/events/:id/matches/:matchId/respond  # Accept/decline match
GET    /api/events/matches/pending    # All pending matches
```

### Meeting Zones

```
GET    /api/events/:id/meeting-zones  # Get generated meeting zones
POST   /api/events/:id/meeting-zones/generate  # Trigger zone generation
```

## Subscription Tier Limits

| Feature | BASE | PRO | PREMIUM | ENTERPRISE |
|---------|------|-----|---------|------------|
| Events/Month | 0 | 10 | 30 | Unlimited |
| Event Map View | ❌ | ✅ | ✅ | ✅ |
| Visibility Modes | ❌ | All 4 | All 4 | All 4 |
| Ghost Mode | ❌ | ✅ | ✅ | ✅ |
| AI Matchmaking | ❌ | ❌ | ✅ | ✅ |
| Meeting Zones | ❌ | ✅ | ✅ | ✅ |
| Event Search | ❌ | ❌ | ✅ | ✅ |
| Analytics | ❌ | Basic | Full | Full + Export |

## GDPR Compliance

### Consent Types Required

Three new consent types added to `privacyConstants.js`:

```javascript
// Event Social Intelligence Consents
AI_EVENT_MATCHING: 'ai_event_matching',              // Ghost Mode AI introductions
EVENT_PARTICIPATION_SIGNALS: 'event_participation_signals',  // Share intents
EVENT_MEETING_ZONES: 'event_meeting_zones',          // AI meeting suggestions
```

### Data Retention

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| Event data | Until event ends + 30 days | Event context |
| Participation | Until user withdraws | Active consent |
| Match history | 1 year | Networking value |
| Ghost Mode data | Session only | Privacy by design |

### Right to Erasure

When user requests data deletion:
1. Delete all participation records
2. Remove from Neo4j graph
3. Invalidate all pending matches
4. Remove from meeting zones
5. Delete event embeddings from Pinecone

## Implementation Checklist

### Sprint 1: Foundation (Constants & Data Model)
- [x] Create `eventConstants.js` with all constants
- [x] Update barrel exports in `constants.js`
- [x] Add consent types to `privacyConstants.js`
- [x] Extend Neo4j schema with Event methods
- [x] Create `eventTypes.js` with JSDoc types
- [x] Create this documentation

### Sprint 2: Core Backend Services
- [x] Create `eventService.js` (CRUD + attendance management)
- [x] Create `visibilityService.js` (4-tier privacy rules)
- [x] Create API routes for events (`/api/events/*`)
- [x] Add Firestore indexes for events collection

**Completed Files:**
- `lib/services/serviceEvent/server/eventService.js`
  - CRUD: createEvent, getEvent, getUserEvents, updateEvent, deleteEvent
  - Geo: getEventsInRadius, getUpcomingEvents, getEventStats
  - Attendance: registerAttendance, updateAttendance, removeAttendance, getEventAttendees
- `lib/services/serviceEvent/server/visibilityService.js`
  - canUserSeeParticipant, filterParticipantsByVisibility
  - getVisibilityCounts, getAIVisibleParticipants, getGhostModeParticipants
- `app/api/events/route.js` - GET (list), POST (create)
- `app/api/events/[eventId]/route.js` - GET, PUT, DELETE
- `app/api/events/[eventId]/attendance/route.js` - POST, PUT, DELETE
- `app/api/events/[eventId]/attendees/route.js` - GET with visibility filtering
- `firestore.indexes.json` - Added events indexes

**Test Coverage (65 tests, 100% pass rate):**
- `runEventTests.mjs` - Test runner for all 65 tests
- `lib/services/serviceEvent/tests/eventServiceTests.js` (15 tests)
  - CRUD: Create, Get, Update, Delete events
  - Validation: Missing fields, invalid dates
  - Attendance: Register, update, remove, duplicate check
- `lib/services/serviceEvent/tests/visibilityServiceClassTests.js` (10 tests)
  - 4-tier visibility: PUBLIC, FRIENDS, PRIVATE, GHOST
  - AI vs human context visibility rules
  - Filter and count functions
- `lib/services/serviceEvent/tests/testHelpers.js` (Firestore helpers added)
- `test-loader.mjs` + `test-resolver.mjs` (ESM loader for @/ alias)

### Sprint 3: Frontend - Event Panel
- [x] Create `EventPanel.jsx` component
- [x] Integrate with `ContactsMap.jsx`
- [x] Add RSVP interface
- [x] Add intent selection UI

**Completed Files:**
- `app/dashboard/(dashboard pages)/contacts/components/EventPanel.jsx` (550 lines)
  - RSVP status buttons (Attending, Maybe, Not Going)
  - Primary intent dropdown + secondary intents multi-select (max 3)
  - 4-tier visibility mode selection with descriptions
  - Looking for / Offering selections (collapsible)
  - API integration with attendance endpoints
- `app/dashboard/(dashboard pages)/contacts/components/ContactsMap.jsx` (modified)
  - Event markers (purple calendar icons) on map
  - Right-side sliding EventPanel integration
  - Event marker click handler

**Test Coverage (10 new tests):**
- `lib/services/serviceEvent/tests/eventPanelApiTests.js` (10 tests)
  - RSVP statuses (confirmed, maybe, declined)
  - Primary + secondary intents
  - All 4 visibility modes
  - Looking for / offering options
  - Update and remove RSVP

### Sprint 4: AI Matching Service
- [x] Create `matchingService.js`
- [x] Implement compatibility algorithm
- [x] Create match notification system
- [x] Add double opt-in flow

**Completed Files:**
- `lib/services/serviceEvent/server/matchingService.js` (~1100 lines)
  - 5-signal compatibility scoring:
    - 40% complementary (lookingFor ↔ offering bidirectional match)
    - 25% intent compatibility (INTENT_COMPATIBILITY_MATRIX)
    - 15% industry overlap (Jaccard similarity)
    - 10% tag overlap (Jaccard similarity)
    - 10% semantic similarity (Pinecone vector cosine)
  - Match lifecycle: pending → accepted/declined/expired
  - Double opt-in flow (both parties must accept to reveal identities)
  - Match expiration (48h after event ends)
  - Neo4j MATCHED_AT relationship sync
  - Email notifications (new match, match accepted)
  - In-app notifications system
  - Batch matching for events
- `app/api/events/[eventId]/matches/route.js` - GET matches, POST trigger matching
- `app/api/events/[eventId]/matches/[matchId]/respond/route.js` - Accept/decline match
- `app/api/events/matches/pending/route.js` - GET all pending matches

**Test Coverage (15 new tests):**
- `lib/services/serviceEvent/tests/matchingServiceTests.js` (719 lines, 15 tests)
  - Scoring: Complementary, intent, tag, industry, semantic scores
  - Match management: Create, get, respond (accept/decline)
  - Flow: Find matches, visibility filtering, Ghost mode inclusion
  - Edge cases: Private mode exclusion, pending queries, expiration

### Sprint 5: Meeting Zones
- [x] Create `meetingZoneService.js`
- [x] Implement greedy clustering algorithm (custom JS, not Neo4j GDS)
- [x] Create zone API routes
- [x] Add zone naming via GroupNamingService

**Completed Files:**
- `lib/services/serviceEvent/server/meetingZoneService.js` (~500 lines)
  - Greedy Compatibility Clustering algorithm:
    - `buildCompatibilityMatrix()` - Build NxN matrix using MatchingService scoring
    - `clusterParticipants()` - Greedy clustering from highest-scoring pairs
    - `growCluster()` - Add members maximizing group cohesion
    - `splitLargeClusters()` - Ensure 3-5 member constraint
  - Zone management:
    - `generateZonesForEvent()` - Full generation flow with caching
    - `getZonesForEvent()` - Read cached zones
    - `saveZones()` / `getExistingZones()` - Firestore persistence
    - `shouldRegenerateZones()` - 30-minute cache TTL
  - AI naming integration:
    - `generateZoneNames()` - Uses GroupNamingService
    - `buildZoneCharacteristics()` - Extract common intents/industries
    - `generateZoneDescription()` - Fallback descriptions
- `app/api/events/[eventId]/meeting-zones/route.js` - GET cached zones
- `app/api/events/[eventId]/meeting-zones/generate/route.js` - POST trigger generation

**Firestore Schema:**
```javascript
// events/{eventId}/meeting_zones/{zoneId}
{
  id: string,
  eventId: string,
  userId: string,
  name: string,                    // AI-generated
  description: string,             // AI-generated
  memberContactIds: string[],
  memberCount: number,
  commonIntents: string[],
  commonIndustries: string[],
  cohesionScore: number,           // 0-1
  createdAt: Timestamp,
  generatedBy: 'system' | 'manual'
}
```

**Test Coverage (15 new tests):**
- `lib/services/serviceEvent/tests/meetingZoneServiceTests.js` (15 tests)
  - Matrix: Build compatibility matrix, symmetry, empty handling
  - Clustering: Valid zone sizes, high-compatibility pairs first, splitting
  - Naming: AI names, characteristics, fallbacks
  - Storage: Save zones, cache retrieval, regeneration logic
  - Integration: Full flow, visibility filtering (PRIVATE excluded)

### Sprint 6: Google Calendar Integration
- [ ] OAuth2 flow for Calendar API
- [ ] Event sync service
- [ ] Two-way sync logic
- [ ] Conflict resolution

### Sprint 7: Testing & Polish
- [ ] Unit tests for all services
- [ ] Integration tests
- [ ] E2E tests for critical flows
- [ ] Performance optimization

## Related Documentation

- **[INTELLIGENT_GROUPS_NEO4J_SPEC.md](./INTELLIGENT_GROUPS_NEO4J_SPEC.md)** - Neo4j graph architecture
- **[RGPD_COMPLIANCE_MATRIX.md](../rgpd/RGPD_COMPLIANCE_MATRIX.md)** - GDPR compliance requirements
- **[SESSION_TRACKING_FIX.md](../infrastructure/SESSION_TRACKING_FIX.md)** - Session tracking patterns

## Glossary

| Term | Definition |
|------|------------|
| Ghost Mode | Invisible to humans but AI can detect synergies |
| Double Opt-in | Both parties must accept before connection is revealed |
| Meeting Zone | AI-generated micro-cluster of 3-5 compatible people |
| Participation Intent | Why someone is attending an event |
| Compatibility Score | AI-calculated match quality (0-1) |

---

**Status**: 🚧 In Progress - Sprint 5 Complete (Meeting Zones)
**Last Updated**: 2025-11-27
**Author**: Claude Code
**Progress**: 5/7 Sprints Complete (95+ tests passing)
