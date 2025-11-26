---
id: features-event-social-intelligence-084
title: Event Social Intelligence System
category: features
tags: [events, social-intelligence, ghost-mode, ai-matching, meeting-zones, neo4j, map, visibility]
status: draft
created: 2025-11-26
updated: 2025-11-26
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

Meeting Zones use **Louvain community detection** to create micro-clusters of 3-5 compatible people:

```cypher
// Find optimal meeting groups at an event
CALL gds.louvain.stream('eventGraph', {
  nodeLabels: ['Contact'],
  relationshipTypes: ['ATTENDS'],
  relationshipWeightProperty: 'compatibilityScore'
})
YIELD nodeId, communityId
WITH gds.util.asNode(nodeId) AS contact, communityId
MATCH (contact)-[r:ATTENDS]->(e:Event {id: $eventId})
WHERE r.visibility IN ['public', 'friends', 'ghost']
WITH communityId, collect(contact) AS members, avg(r.compatibilityScore) AS avgScore
WHERE size(members) >= 3 AND size(members) <= 5
RETURN communityId, members, avgScore
ORDER BY avgScore DESC
```

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
- [ ] Create `eventService.js` (CRUD operations)
- [ ] Create `visibilityService.js` (privacy rules)
- [ ] Create API routes for events
- [ ] Add Firestore security rules

### Sprint 3: Frontend - Event Panel
- [ ] Create `EventPanel.jsx` component
- [ ] Integrate with `ContactsMap.jsx`
- [ ] Add RSVP interface
- [ ] Add intent selection UI

### Sprint 4: AI Matching Service
- [ ] Create `matchingService.js`
- [ ] Implement compatibility algorithm
- [ ] Create match notification system
- [ ] Add double opt-in flow

### Sprint 5: Meeting Zones
- [ ] Create `meetingZoneService.js`
- [ ] Implement Louvain clustering
- [ ] Create zone UI components
- [ ] Add zone naming AI

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

**Status**: 🚧 Draft - Implementation in progress
**Last Updated**: 2025-11-26
**Author**: Claude Code
