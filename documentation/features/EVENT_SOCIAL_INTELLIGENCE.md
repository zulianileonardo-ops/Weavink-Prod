---
id: features-event-social-intelligence-084
title: Event Social Intelligence System
category: features
tags: [events, social-intelligence, ghost-mode, ai-matching, meeting-zones, neo4j, map, visibility, testing, public-events, bulk-import, admin]
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
  isPublic: boolean,             // If true, visible to ALL users (admin-only, default: false)
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

### Event Discovery & Import (Sprint 6)

```
GET    /api/events/discover              # Discover nearby public events
POST   /api/events/import/google         # Import from Google Calendar
POST   /api/events/import/eventbrite     # Import from Eventbrite
GET    /api/auth/google/calendar         # OAuth for Google Calendar
GET    /api/auth/google/callback         # OAuth callback
```

## Event Discovery & Automation

### Overview

Events can be added to Weavink through **manual creation** or **automated imports** from various sources. This enables users to discover professional networking opportunities without manual data entry.

### Event Sources

| Source | Status | Priority | Integration Complexity | Value |
|--------|--------|----------|----------------------|-------|
| **Manual Entry** | ✅ Live | - | Built-in | Medium |
| **Google Calendar** | 🚧 Planned (Sprint 6) | High | Medium | High |
| **Eventbrite API** | 📋 Planned | Medium | Low | High |
| **Meetup.com API** | 📋 Planned | Medium | Low | Medium |
| **LinkedIn Events** | 📋 Future | Low | High (API access hard) | Medium |
| **Company Event Feeds** | 💡 Idea | Low | Variable | High (B2B) |

### Google Calendar Integration (Sprint 6)

**Goal:** Automatically import user's calendar events and display on map.

#### Architecture

```
┌──────────────────┐
│ Google Calendar  │
│  (User's events) │
└────────┬─────────┘
         │ OAuth2
         ↓
┌──────────────────┐
│ Weavink Backend  │
│ - OAuth flow     │
│ - Token storage  │
│ - Event sync     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Event Service    │
│ - Parse location │
│ - Geocode        │
│ - Create event   │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Firestore + Neo4j│
│ Event on map ✅  │
└──────────────────┘
```

#### Implementation Plan

**1. OAuth2 Setup**
```javascript
// lib/services/serviceCalendar/googleOAuthService.js
class GoogleOAuthService {
  static async initiateAuth(userId) {
    // Generate OAuth URL
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      state: userId // For security
    });
  }

  static async handleCallback(code, userId) {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Store refresh token in Firestore
    await adminDb.collection('calendar_tokens').doc(userId).set({
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      createdAt: new Date()
    });

    return tokens;
  }
}
```

**2. Event Sync Service**
```javascript
// lib/services/serviceCalendar/googleCalendarSyncService.js
class GoogleCalendarSyncService {
  static async syncEvents(userId) {
    // Get stored tokens
    const tokenDoc = await adminDb.collection('calendar_tokens').doc(userId).get();
    const tokens = tokenDoc.data();

    // Initialize Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    oauth2Client.setCredentials(tokens);

    // Fetch upcoming events (next 3 months)
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    // Process each event
    for (const event of events.data.items) {
      await this.importEvent(userId, event);
    }
  }

  static async importEvent(userId, googleEvent) {
    // Check if already imported
    const existingEvent = await adminDb.collection('events')
      .where('userId', '==', userId)
      .where('sourceId', '==', googleEvent.id)
      .limit(1)
      .get();

    if (!existingEvent.empty) {
      console.log('Event already imported:', googleEvent.summary);
      return;
    }

    // Parse location string to lat/lng
    const location = await this.geocodeLocation(googleEvent.location);

    // Create event in Weavink
    await EventService.createEvent({
      eventData: {
        name: googleEvent.summary,
        description: googleEvent.description || '',
        startDate: googleEvent.start.dateTime || googleEvent.start.date,
        endDate: googleEvent.end.dateTime || googleEvent.end.date,
        location: location,
        source: 'google_calendar',
        sourceId: googleEvent.id,
        tags: this.extractTags(googleEvent),
        isRecurring: !!googleEvent.recurrence
      },
      session: { userId, subscriptionLevel: 'pro' }
    });

    console.log('✅ Imported:', googleEvent.summary);
  }

  static async geocodeLocation(locationString) {
    if (!locationString) return null;

    // Use Google Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationString)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();
    if (data.results.length === 0) return null;

    const result = data.results[0];
    return {
      address: locationString,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeId: result.place_id,
      venue: result.formatted_address
    };
  }

  static extractTags(googleEvent) {
    // Auto-tag based on title/description keywords
    const text = `${googleEvent.summary} ${googleEvent.description || ''}`.toLowerCase();
    const tags = [];

    const tagKeywords = {
      'tech': ['tech', 'technology', 'software', 'coding', 'developer'],
      'startup': ['startup', 'founder', 'entrepreneurship'],
      'networking': ['networking', 'meetup', 'mixer'],
      'conference': ['conference', 'summit', 'expo'],
      'workshop': ['workshop', 'training', 'seminar'],
      'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml']
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags;
  }
}
```

**3. Sync Schedule**
```javascript
// Sync every 24 hours via Cloud Function or cron job
export async function scheduledCalendarSync() {
  // Get all users with Google Calendar connected
  const tokensSnapshot = await adminDb.collection('calendar_tokens').get();

  for (const tokenDoc of tokensSnapshot.docs) {
    const userId = tokenDoc.id;
    try {
      await GoogleCalendarSyncService.syncEvents(userId);
    } catch (error) {
      console.error(`Sync failed for ${userId}:`, error);
    }
  }
}
```

**4. API Routes**
```javascript
// app/api/auth/google/calendar/route.js
export async function GET(request) {
  const session = await createApiSession(request);
  const authUrl = await GoogleOAuthService.initiateAuth(session.userId);
  return NextResponse.redirect(authUrl);
}

// app/api/auth/google/callback/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId

  await GoogleOAuthService.handleCallback(code, state);

  // Start initial sync
  await GoogleCalendarSyncService.syncEvents(state);

  return NextResponse.redirect('/dashboard/events?import=success');
}

// app/api/events/import/google/route.js
export async function POST(request) {
  const session = await createApiSession(request);

  // Trigger manual sync
  const result = await GoogleCalendarSyncService.syncEvents(session.userId);

  return NextResponse.json({
    success: true,
    eventsImported: result.imported,
    eventsSkipped: result.skipped
  });
}
```

**5. UI Components**
```jsx
// app/dashboard/events/components/CalendarConnectButton.jsx
export function CalendarConnectButton() {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const connectGoogleCalendar = async () => {
    window.location.href = '/api/auth/google/calendar';
  };

  const syncNow = async () => {
    setSyncing(true);
    const response = await fetch('/api/events/import/google', {
      method: 'POST'
    });
    const result = await response.json();
    setSyncing(false);
    alert(`Imported ${result.eventsImported} events`);
  };

  return (
    <div className="calendar-connect">
      {!connected ? (
        <button onClick={connectGoogleCalendar}>
          📅 Connect Google Calendar
        </button>
      ) : (
        <div>
          <span>✅ Google Calendar connected</span>
          <button onClick={syncNow} disabled={syncing}>
            {syncing ? 'Syncing...' : '🔄 Sync Now'}
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Two-Way Sync (Future Enhancement)

**Write back to Google Calendar:**
- When user RSVPs in Weavink → Update Google Calendar attendance
- When user sets Ghost Mode → Add private note to Google event
- Meeting zones → Create sub-events in Google Calendar

#### Security & Privacy

**Permissions:**
- Request **read-only** access initially (`calendar.readonly` scope)
- For two-way sync, request `calendar.events` scope
- Store refresh tokens **encrypted** in Firestore
- Allow users to **disconnect** and revoke access

**Data Handling:**
- Only import events with locations (skip personal appointments)
- Allow user to **review** before importing
- Option to **exclude** specific calendars (e.g., personal)
- Respect calendar visibility settings

### Eventbrite Integration

**Goal:** Discover public professional events nearby.

#### Implementation

```javascript
// lib/services/serviceCalendar/eventbriteService.js
class EventbriteService {
  static async discoverEvents({ latitude, longitude, radius = 25 }) {
    const response = await fetch(
      'https://www.eventbriteapi.com/v3/events/search/',
      {
        headers: { 'Authorization': `Bearer ${process.env.EVENTBRITE_TOKEN}` },
        params: new URLSearchParams({
          'location.latitude': latitude,
          'location.longitude': longitude,
          'location.within': `${radius}km`,
          'categories': '102,101', // Business & Tech
          'start_date.range_start': new Date().toISOString(),
          'sort_by': 'date'
        })
      }
    );

    const data = await response.json();
    return data.events.map(event => ({
      name: event.name.text,
      description: event.description.text,
      startDate: event.start.utc,
      endDate: event.end.utc,
      location: {
        address: event.venue?.address?.localized_address_display,
        latitude: parseFloat(event.venue?.latitude),
        longitude: parseFloat(event.venue?.longitude),
        venue: event.venue?.name
      },
      source: 'eventbrite',
      sourceId: event.id,
      url: event.url,
      tags: [event.category?.name]
    }));
  }
}
```

**UI Flow:**
1. User clicks "Discover Events Nearby"
2. System fetches from Eventbrite within 25km
3. Shows list of events with "Import" buttons
4. User selects events to import
5. Events appear on map

### Meetup.com Integration

Similar to Eventbrite, using Meetup API:

```javascript
class MeetupService {
  static async discoverEvents({ latitude, longitude, radius = 25 }) {
    const response = await fetch(
      'https://api.meetup.com/find/upcoming_events',
      {
        params: new URLSearchParams({
          lat: latitude,
          lon: longitude,
          radius: radius,
          category: '34,48', // Tech, Professional
          sign: 'true',
          key: process.env.MEETUP_API_KEY
        })
      }
    );
    // ... similar processing
  }
}
```

### Event Discovery UI

**New Page:** `/dashboard/events/discover`

```jsx
// app/dashboard/events/discover/page.jsx
export default function EventDiscoveryPage() {
  return (
    <div>
      <h1>Discover Events</h1>

      <div className="import-sources">
        <CalendarConnectButton />
        <EventbriteDiscovery />
        <MeetupDiscovery />
      </div>

      <div className="nearby-events">
        <h2>Professional Events Near You</h2>
        <EventList events={discoveredEvents} />
      </div>
    </div>
  );
}
```

### User Preferences

Store user preferences for auto-import:

```javascript
// Firestore: users/{userId}/event_preferences
{
  autoImportGoogleCalendar: true,
  syncInterval: 'daily', // 'hourly', 'daily', 'weekly'
  excludedCalendars: ['personal@gmail.com'],
  autoDiscoverRadius: 50, // km
  preferredCategories: ['tech', 'business', 'networking'],
  minAttendees: 10, // Don't import small events
  requireLocation: true // Skip events without location
}
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

**Test Coverage (115 tests, 100% pass rate):**
- `runEventTests.mjs` - Test runner for all 115 tests
- `loader.mjs` - Custom ESM loader for @/ path aliases and .js extension resolution

**Running Tests:**
```bash
node --experimental-loader ./loader.mjs -r dotenv/config runEventTests.mjs
```
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

### Sprint 3: Frontend - Event Panel & Map Integration
- [x] Create `EventPanel.jsx` component
- [x] Integrate with `ContactsMap.jsx`
- [x] Add RSVP interface
- [x] Add intent selection UI
- [x] Wire events data flow (page.jsx → ContactModals → ContactsMap)
- [x] Add authenticated event fetching with Firebase headers
- [x] Configure event marker size (scale: 2.0) for visibility

**Completed Files:**
- `app/dashboard/(dashboard pages)/contacts/components/EventPanel.jsx` (550 lines)
  - RSVP status buttons (Attending, Maybe, Not Going)
  - Primary intent dropdown + secondary intents multi-select (max 3)
  - 4-tier visibility mode selection with descriptions
  - Looking for / Offering selections (collapsible)
  - API integration with attendance endpoints
- `app/dashboard/(dashboard pages)/contacts/components/ContactsMap.jsx` (modified)
  - Event markers (purple calendar icons, scale: 2.0 for visibility)
  - Right-side sliding EventPanel integration
  - Event marker click handler
  - Events prop wired from page → ContactModals → ContactsMap
- `app/dashboard/(dashboard pages)/contacts/page.jsx` (modified)
  - Added `events` state and fetch with Firebase auth headers
  - Passes `events` prop to ContactModals
- `app/dashboard/(dashboard pages)/contacts/components/contacts/ContactModals.jsx` (modified)
  - Accepts `events` prop and passes to ContactsMap

**Event Map Data Flow:**
```
1. page.jsx mounts
2. useEffect fetches /api/events?limit=100 with Firebase auth headers
3. API returns user's events + all public events (isPublic: true)
4. Events state passed: page.jsx → ContactModals → ContactsMap
5. ContactsMap creates markers for events with valid lat/lng
6. Purple calendar markers (scale: 2.0) rendered with DROP animation
7. Click marker → opens EventPanel with event details
```

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

**Firestore Index (Required):**
```json
{
  "collectionGroup": "meeting_zones",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "cohesionScore", "order": "DESCENDING" }
  ]
}
```

**Test Coverage (15 new tests):**
- `lib/services/serviceEvent/tests/meetingZoneServiceTests.js` (15 tests)
  - Matrix: Build compatibility matrix, symmetry, empty handling
  - Clustering: Valid zone sizes, high-compatibility pairs first, splitting
  - Naming: AI names, characteristics, fallbacks
  - Storage: Save zones, cache retrieval, regeneration logic
  - Integration: Full flow, visibility filtering (PRIVATE excluded)

### Sprint 5.5: Public Events & Bulk Import
- [x] Add `isPublic` flag to event schema
- [x] Implement admin-only public event creation
- [x] Create bulk import API endpoint
- [x] Add comprehensive data validation
- [x] Update Firestore indexes for public events
- [x] Implement public event access control

**Completed Files:**
- `lib/server/session.js` - Added `email` field to session object for admin verification
- `lib/services/serviceEvent/shared/eventTypes.js` - Added `isPublic` field to Event type
- `lib/services/serviceEvent/server/eventService.js` - Updated with:
  - `validateEventData()` - Enhanced validation (dates, coordinates, required fields)
  - `createEvent()` - Admin check for isPublic=true, validation before save
  - `getUserEvents()` - Returns user's events + all public events (parallel queries)
  - `getEvent()` - Allow access to public events (ownership OR isPublic)
  - `bulkCreateEvents()` - Bulk import with individual error handling
- `app/api/events/bulk/route.js` - Bulk import endpoint (NEW)
  - Admin-only check for public events
  - Rate limiting (max 100 events per request)
  - Validation before processing
  - Partial failure support (continues on errors)

**Firestore Schema Update:**
```javascript
// events/{eventId}
{
  id: string,
  userId: string,                // Creator (still tracked for ownership)
  isPublic: boolean,             // NEW: If true, visible to ALL users (admin-only)
  name: string,
  description: string,
  startDate: Timestamp,
  endDate: Timestamp,
  location: { ... },
  source: string,
  tags: string[],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Firestore Indexes Added:**
```json
{
  "collectionGroup": "events",
  "fields": [
    { "fieldPath": "isPublic", "order": "ASCENDING" },
    { "fieldPath": "startDate", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "events",
  "fields": [
    { "fieldPath": "isPublic", "order": "ASCENDING" },
    { "fieldPath": "source", "order": "ASCENDING" },
    { "fieldPath": "startDate", "order": "ASCENDING" }
  ]
}
```

**API Endpoints:**

**POST /api/events/bulk** - Bulk import events
```bash
curl -X POST http://localhost:3000/api/events/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "events": [
      {
        "name": "Salon Naturissima",
        "description": "Bio, bien-être et environnement",
        "startDate": "2025-11-26T09:00:00Z",
        "endDate": "2025-11-30T18:00:00Z",
        "location": {
          "address": "Avenue d'Innsbruck, 38100 Grenoble, France",
          "latitude": 45.1585,
          "longitude": 5.7345,
          "venue": "Alpexpo"
        },
        "source": "manual",
        "tags": ["bio", "bien-être", "environnement"],
        "isPublic": true
      }
    ]
  }'

# Response:
{
  "success": true,
  "imported": 9,
  "failed": 0,
  "events": [...],
  "errors": []
}
```

**Security Features:**
1. **Admin-Only Public Events**
   - Only users in `process.env.ADMIN_EMAILS` can create public events
   - Enforced in both `EventService.createEvent()` and `/api/events/bulk`
   - Returns 403 Forbidden if non-admin attempts `isPublic: true`
   - Audit logging: All public event creations logged with admin email

2. **Rate Limiting**
   - Maximum 100 events per bulk import request
   - Prevents abuse and database overload

3. **Data Validation** (Before Database Write)
   - **Required fields**: name (non-empty string), startDate
   - **Date validation**: Valid ISO format, endDate after startDate
   - **Geo validation**: Latitude (-90 to 90), longitude (-180 to 180)
   - **Type validation**: Location must be object
   - Partial failures: Invalid events returned in `errors` array

**Use Cases:**
- **Public Events**: Administrators can import public events visible to all users
  - Conferences, meetups, tech gatherings (e.g., Grenoble tech events at Alpexpo)
  - Community events, hackathons, networking sessions
- **Bulk Import**: Import multiple events at once (conferences with multiple sessions, event series)
- **Event Discovery**: All users see public events on their map without manual entry

**Access Control:**
- **Private events** (default `isPublic: false`): Only visible to creator
- **Public events** (`isPublic: true`): Visible to ALL authenticated users
- **Ownership preserved**: `userId` still tracks who created it
- **Backward compatible**: Existing events default to `isPublic: false`

**Query Behavior:**
When a user calls `GET /api/events`:
1. Firestore Query 1: `userId == currentUser` (user's own events)
2. Firestore Query 2: `isPublic == true` (all public events)
3. Combine results (remove duplicates by ID)
4. Sort by `startDate` and apply limit

### Sprint 6: Event Discovery & Automation
- [ ] Google Calendar OAuth2 flow
- [ ] Google Calendar sync service (read-only)
- [ ] Geocoding service for location parsing
- [ ] Eventbrite API integration
- [ ] Meetup.com API integration (optional)
- [ ] Event discovery UI (`/dashboard/events/discover`)
- [ ] User preferences for auto-import
- [ ] Scheduled sync (daily cron job)

**Files to Create:**
- `lib/services/serviceCalendar/googleOAuthService.js` - OAuth2 flow
- `lib/services/serviceCalendar/googleCalendarSyncService.js` - Event sync
- `lib/services/serviceCalendar/eventbriteService.js` - Eventbrite discovery
- `lib/services/serviceCalendar/meetupService.js` - Meetup discovery
- `lib/services/serviceCalendar/geocodingService.js` - Location parsing
- `app/api/auth/google/calendar/route.js` - OAuth initiation
- `app/api/auth/google/callback/route.js` - OAuth callback
- `app/api/events/import/google/route.js` - Manual sync trigger
- `app/api/events/import/eventbrite/route.js` - Eventbrite import
- `app/api/events/discover/route.js` - Discover nearby events
- `app/dashboard/events/discover/page.jsx` - Discovery UI
- `app/dashboard/events/components/CalendarConnectButton.jsx` - Connect button

**Firestore Collections:**
- `calendar_tokens/{userId}` - Store OAuth refresh tokens
- `users/{userId}/event_preferences` - User import preferences

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_MAPS_API_KEY=xxx
EVENTBRITE_TOKEN=xxx
MEETUP_API_KEY=xxx
```

**Key Features:**
- Auto-import from Google Calendar (daily sync)
- Manual sync button for immediate updates
- Geocode locations to lat/lng for map display
- Auto-tag events based on keywords
- Discover public events nearby via Eventbrite/Meetup
- User can review before importing
- Skip personal events (only import with locations)
- Two-way sync (future): RSVP in Weavink → Update Google Calendar

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
| Event Discovery | Automated import from Google Calendar, Eventbrite, Meetup |
| Geocoding | Converting location strings to latitude/longitude for map display |
| Calendar Sync | Automated daily synchronization of Google Calendar events |
| Event Source | Origin of event data (manual, google_calendar, eventbrite, meetup) |
| Public Events | Events with isPublic=true, visible to ALL users (admin-only creation) |
| Bulk Import | API endpoint to import multiple events at once (max 100 per request) |
| Admin-Only | Features restricted to users in process.env.ADMIN_EMAILS |

---

**Status**: 🚧 In Progress - Sprint 5.5 Complete (Public Events & Bulk Import + Map Integration)
**Last Updated**: 2025-11-27
**Author**: Claude Code
**Progress**: 5.5/7 Sprints Complete (115 tests passing - 100%)
**Map Integration**: Events now display on ContactsMap with purple calendar markers (scale 2.0)

### Test Suite Summary (115 total)
| Suite | Tests | Status |
|-------|-------|--------|
| Neo4j Event Methods | 12 | ✅ |
| Visibility System | 8 | ✅ |
| AI Matching | 10 | ✅ |
| EventService Firestore | 15 | ✅ |
| VisibilityService Class | 10 | ✅ |
| EventPanel API Integration | 10 | ✅ |
| MatchingService (Sprint 4) | 15 | ✅ |
| MeetingZoneService (Sprint 5) | 15 | ✅ |
| Public Events (Sprint 5.5) | 8 | ✅ |
| Bulk Import (Sprint 5.5) | 12 | ✅ |
