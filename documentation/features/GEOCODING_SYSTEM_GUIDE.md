---
id: features-geocoding-system-082
title: Geocoding System - Complete Technical Guide
category: features
tags: [geocoding, google-maps, reverse-geocoding, cost-tracking, location, gps, api, budget, session-tracking]
status: active
created: 2025-11-21
updated: 2025-11-22
related:
  - SESSION_BASED_ENRICHMENT.md
  - SESSION_VS_STANDALONE_TRACKING.md
  - VENUE_ENRICHMENT_FEATURE.md
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
  - COST_TRACKING_MIGRATION_GUIDE.md
  - CONTACT_ANONYMIZATION_IMPLEMENTATION_GUIDE.md
---

# Geocoding System - Complete Technical Guide

**Status**: Production
**Cost**: $0.005 per request
**Provider**: Google Maps Geocoding API
**Last Updated**: 2025-11-21

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Session-Based vs Standalone Geocoding](#session-based-vs-standalone-geocoding)
4. [API Endpoint Specification](#api-endpoint-specification)
5. [Implementation Details](#implementation-details)
6. [Location Data Model](#location-data-model)
7. [Cost Tracking System](#cost-tracking-system)
8. [Budget Management](#budget-management)
9. [Usage Examples](#usage-examples)
10. [Integration Points](#integration-points)
11. [GDPR Compliance](#gdpr-compliance)
12. [Configuration & Constants](#configuration--constants)
13. [Monitoring & Debugging](#monitoring--debugging)
14. [Future Features](#future-features)
15. [File Reference](#file-reference)

---

## Overview

### What is Geocoding in Weavink?

The geocoding system converts GPS coordinates (latitude, longitude) into human-readable addresses using Google Maps Geocoding API. This is called **reverse geocoding**.

**Example**:
```
Input:  45.1772416, 5.7212928
Output: Grenoble, France
```

### When Is It Used?

1. **Exchange Contacts**: When users exchange contact information with GPS coordinates
2. **Public Profiles**: When visitors view public profiles with location data
3. **Venue Enrichment**: As part of automatic venue detection for contact groups

### Key Characteristics

- **Cost**: $0.005 per request (Google Maps standard pricing)
- **Public Endpoint**: No authentication required
- **Budget Tracked**: Cost charged to profile owner
- **GDPR Compliant**: Location data properly anonymized
- **Optimized**: Cost-controlled with minimal field masks

---

## System Architecture

### High-Level Flow

```
User visits public profile
    ↓
Browser requests GPS coordinates
    ↓
Frontend calls: /api/user/contacts/geocode?lat=45.177&lng=5.721&userId=XXX
    ↓
API checks budget: Can user afford $0.005?
    ↓
    ✅ Yes → Call Google Maps API
    ❌ No → Return 402 Payment Required
    ↓
Google Maps Geocoding API
    ↓
Parse response into structured address
    ↓
Record $0.005 cost in Firestore (ApiUsage collection)
    ↓
Return enriched location data to frontend
```

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  - ExchangeModal.jsx                                        │
│  - Public profile viewers                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  - /api/user/contacts/geocode/route.js                     │
│  - Budget checking                                          │
│  - Cost recording                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                           │
│  - PlacesApiClient.reverseGeocode()                        │
│  - CostTrackingService                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                     External API                            │
│  - Google Maps Geocoding API                                │
│  - https://maps.googleapis.com/maps/api/geocode/json       │
└─────────────────────────────────────────────────────────────┘
```

---

## Session-Based vs Standalone Geocoding

### Overview

Geocoding in Weavink can occur in **two different contexts**:

1. **Standalone Geocoding**: Single, independent reverse geocoding operation
2. **Session-Based Geocoding**: Part of a multi-step enrichment session (geocoding + venue search)

The choice between these approaches affects cost tracking, data storage, and audit trails.

### Standalone Geocoding

**When Used**:
- Public profile viewing (one-off address lookup)
- Manual geocoding requests
- Single geocoding without venue enrichment

**Cost Tracking**: Writes to `ApiUsage/{userId}/monthly/{YYYY-MM}`

**Example**:
```javascript
// Single geocoding request (no sessionId)
const response = await fetch(
  `/api/user/contacts/geocode?lat=45.177&lng=5.721&userId=${userId}`
);

// Tracked in ApiUsage monthly aggregation
// No session document created
```

**Database Structure**:
```
ApiUsage/
  {userId}/
    monthly/
      2025-11/
        totalCost: 0.015
        totalRuns: 3
        featureBreakdown:
          google_maps_geocoding:
            cost: 0.015
            runs: 3
```

### Session-Based Geocoding

**When Used**:
- Contact exchange with auto-enrichment enabled
- Multi-step enrichment flow (geocoding + venue search)
- Operations requiring detailed step-by-step audit trails

**Cost Tracking**: Writes to `SessionUsage/{userId}/sessions/{sessionId}`

**Example**:
```javascript
// Part of enrichment session
const sessionId = `session_enrich_${Date.now()}_${randomString}`;

// Step 1: Reverse geocoding
await CostTrackingService.recordUsage({
  userId,
  sessionId,  // ← Session tracking enabled
  feature: 'location_reverse_geocoding',
  cost: 0.005,
  stepLabel: 'Step 1: Reverse Geocoding'
});

// Step 2: Venue search
await CostTrackingService.recordUsage({
  userId,
  sessionId,  // ← Same session
  feature: 'location_venue_search',
  cost: 0.032,
  stepLabel: 'Step 2: Venue Search'
});

// Finalize session
await SessionTrackingService.finalizeSession({ userId, sessionId });
```

**Database Structure**:
```
SessionUsage/
  {userId}/
    sessions/
      {sessionId}/
        feature: "location"
        status: "completed"
        totalCost: 0.037
        totalRuns: 2
        steps: [
          {
            stepLabel: "Step 1: Reverse Geocoding"
            feature: "location_reverse_geocoding"
            cost: 0.005
            metadata: { city: "Grenoble", country: "France" }
          },
          {
            stepLabel: "Step 2: Venue Search"
            feature: "location_venue_search"
            cost: 0.032
            metadata: { venueName: "Conference Center" }
          }
        ]
```

### Key Differences

| Aspect | Standalone | Session-Based |
|--------|-----------|---------------|
| **Storage** | `ApiUsage/monthly` | `SessionUsage/sessions` |
| **Cost Tracking** | Aggregated monthly | Detailed per-step |
| **Audit Trail** | Operation-level | Step-by-step |
| **Use Case** | Single geocoding | Multi-step enrichment |
| **Session ID** | `null` | `session_enrich_...` |
| **Example Cost** | $0.005 | $0.005 - $0.037 |

### Decision Guide

**Use Standalone When**:
- ✅ Single geocoding request
- ✅ Public profile viewing
- ✅ No venue enrichment needed
- ✅ Fast monthly aggregation queries

**Use Session-Based When**:
- ✅ Multi-step enrichment (geocoding + venue search)
- ✅ Need detailed audit trail
- ✅ Want atomic cost tracking across steps
- ✅ Contact exchange with auto-enrichment

### Related Documentation

For comprehensive information about session-based tracking:
- `SESSION_BASED_ENRICHMENT.md` - Complete session enrichment guide
- `SESSION_VS_STANDALONE_TRACKING.md` - Detailed comparison and decision guide

---

## API Endpoint Specification

### Endpoint

```
GET /api/user/contacts/geocode
```

**Type**: Public (no authentication required)

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes | Latitude coordinate (-90 to 90) |
| `lng` | number | Yes | Longitude coordinate (-180 to 180) |
| `userId` | string | Yes | User ID to charge costs against |

### Request Example

```
GET /api/user/contacts/geocode?lat=45.1772416&lng=5.7212928&userId=ScmVq6p8ubQ9JFbniF2Vg5ocmbv2
```

### Response Format

**Success (200 OK)**:
```json
{
  "success": true,
  "address": {
    "formattedAddress": "Grenoble, France",
    "country": "France",
    "countryCode": "FR",
    "city": "Grenoble",
    "region": "Auvergne-Rhône-Alpes",
    "regionCode": "Auvergne-Rhône-Alpes",
    "postalCode": "38000",
    "streetAddress": "5-7 Place Robert Schuman",
    "streetNumber": "5",
    "route": "Place Robert Schuman",
    "latitude": 45.1772416,
    "longitude": 5.7212928
  },
  "coordinates": {
    "latitude": 45.1772416,
    "longitude": 5.7212928
  },
  "costTracking": {
    "cost": 0.005,
    "charged": true,
    "userId": "ScmVq6p8ubQ9JFbniF2Vg5ocmbv2"
  }
}
```

**Budget Exceeded (402 Payment Required)**:
```json
{
  "success": false,
  "error": "Profile owner has reached their monthly API limit",
  "reason": "budget_exceeded",
  "details": {
    "currentCost": 2.95,
    "limit": 3.00,
    "attemptedCost": 0.005
  }
}
```

**Invalid Coordinates (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Invalid coordinates",
  "details": {
    "lat": "Must be between -90 and 90",
    "lng": "Must be between -180 and 180"
  }
}
```

**Google Maps API Error (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Geocoding failed",
  "details": {
    "message": "Google Maps API error",
    "status": "OVER_QUERY_LIMIT"
  }
}
```

### Response Headers

```
Content-Type: application/json
Cache-Control: public, max-age=3600  // Coordinates rarely change
```

---

## Implementation Details

### API Route Implementation

**File**: `/app/api/user/contacts/geocode/route.js` (Lines 1-141)

#### Step 1: Parameter Validation

```javascript
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseFloat(searchParams.get('lat'));
  const longitude = parseFloat(searchParams.get('lng'));
  const userId = searchParams.get('userId');

  // Validate coordinates
  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { success: false, error: 'Invalid coordinates' },
      { status: 400 }
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { success: false, error: 'Coordinates out of range' },
      { status: 400 }
    );
  }
}
```

#### Step 2: Budget Check

```javascript
if (userId) {
  // Get estimated cost from constants
  const estimatedCost = API_COSTS.GOOGLE_MAPS.GEOCODING.PER_REQUEST;  // 0.005

  console.log(`💸 [CostTracking] Checking AI affordability:`, {
    userId,
    estimatedCost,
    requireRuns: 1
  });

  // Check if user can afford this operation
  const affordabilityCheck = await CostTrackingService.canAffordOperation(
    userId,
    estimatedCost,
    1 // Requires 1 billable run
  );

  if (!affordabilityCheck.canAfford) {
    console.warn(`[API Geocoding] User ${userId} cannot afford geocoding: ${affordabilityCheck.reason}`);

    return NextResponse.json(
      {
        success: false,
        error: 'Profile owner has reached their monthly API limit',
        reason: affordabilityCheck.reason,
        details: {
          currentCost: affordabilityCheck.currentUsage?.totalCost,
          limit: affordabilityCheck.limits?.maxCost,
          attemptedCost: estimatedCost
        }
      },
      { status: 402 } // Payment Required
    );
  }

  console.log(`✅ [CostTracking] User can afford operation`);
  console.log(`[API Geocoding] Budget check passed for user ${userId}`);
}
```

#### Step 3: Create Places API Client

```javascript
console.log(`🏗️ [COST-OPTIMIZED] Creating Places API client with cost controls`);
console.log(`💡 Cost optimizations active:`);
console.log(`   ✅ Minimal field masks by default`);
console.log(`   ✅ Reduced batch sizes`);
console.log(`   ✅ Conservative rate limiting`);
console.log(`   ✅ Quota protection`);
console.log(`   ✅ Cost estimation and tracking`);

const placesClient = new PlacesApiClient();
```

#### Step 4: Reverse Geocode

```javascript
console.log(`🌍 [REVERSE-GEOCODE] Looking up address for: ${latitude}, ${longitude}`);

const addressData = await placesClient.reverseGeocode(latitude, longitude);

if (!addressData || !addressData.formattedAddress) {
  console.log(`❌ [REVERSE-GEOCODE] No address found for coordinates`);
  return NextResponse.json(
    { success: false, error: 'Address not found for coordinates' },
    { status: 404 }
  );
}

console.log(`✅ [REVERSE-GEOCODE] Found: ${addressData.city}, ${addressData.country}`);
console.log(`✅ Geocoding API: Found address for ${latitude}, ${longitude}`);
```

#### Step 5: Record Usage Cost

```javascript
if (userId) {
  const actualCost = API_COSTS.GOOGLE_MAPS.GEOCODING.PER_REQUEST;

  console.log(`💰 [CostTracking] Recording ApiUsage:`, {
    userId,
    feature: 'google_maps_geocoding',
    cost: actualCost,
    isBillableRun: true,
    provider: 'google_maps',
    sessionId: 'none',
    stepLabel: 'none'
  });

  await CostTrackingService.recordUsage({
    userId,
    usageType: 'ApiUsage',
    feature: 'google_maps_geocoding',    // Feature identifier
    cost: actualCost,                    // $0.005
    isBillableRun: true,                 // Counts toward monthly limit
    provider: 'google_maps',
    sessionId: null,
    stepLabel: null,
    metadata: {
      latitude,
      longitude,
      addressFound: !!addressData,
      isPublicProfile: true,
      timestamp: new Date().toISOString()
    }
  });

  console.log(`💰 [Geocoding] Tracked usage: $${actualCost.toFixed(3)} for user ${userId}`);
}
```

#### Step 6: Return Response

```javascript
return NextResponse.json({
  success: true,
  address: addressData,
  coordinates: { latitude, longitude },
  costTracking: userId ? {
    cost: API_COSTS.GOOGLE_MAPS.GEOCODING.PER_REQUEST,
    charged: true,
    userId
  } : {
    cost: 0,
    charged: false
  }
});
```

### Places API Client Implementation

**File**: `/lib/services/placesApiClient.js` (Lines 407-512)

#### Reverse Geocoding Method

```javascript
/**
 * Reverse geocode coordinates to address
 * Uses Geocoding API (not Places API) - more accurate for reverse geocoding
 *
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} Structured address data
 */
async reverseGeocode(latitude, longitude) {
  try {
    console.log(`🔍 [PlacesAPI] Reverse geocoding: ${latitude}, ${longitude}`);

    // Use Geocoding API (more accurate than Places API for reverse geocoding)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`⚠️ [PlacesAPI] Geocoding returned no results:`, data.status);
      return null;
    }

    // Parse the first result
    const result = data.results[0];
    const addressData = this.parseGeocodingResult(result);

    console.log(`✅ [PlacesAPI] Reverse geocode successful:`, addressData.formattedAddress);

    return addressData;

  } catch (error) {
    console.error(`❌ [PlacesAPI] Reverse geocoding error:`, error);
    throw error;
  }
}
```

#### Address Parsing Method

```javascript
/**
 * Parse Google Geocoding API result into structured address
 *
 * @param {Object} result - Geocoding API result
 * @returns {Object} Structured address data
 */
parseGeocodingResult(result) {
  const addressComponents = result.address_components || [];
  const addressData = {
    formattedAddress: result.formatted_address || '',
    country: null,
    countryCode: null,
    city: null,
    region: null,
    regionCode: null,
    postalCode: null,
    streetAddress: null,
    streetNumber: null,
    route: null,
    latitude: result.geometry?.location?.lat || null,
    longitude: result.geometry?.location?.lng || null
  };

  // Extract components from Google's address_components array
  for (const component of addressComponents) {
    const types = component.types;

    if (types.includes('country')) {
      addressData.country = component.long_name;
      addressData.countryCode = component.short_name;
    }

    if (types.includes('locality') || types.includes('postal_town')) {
      addressData.city = component.long_name;
    }

    if (types.includes('administrative_area_level_1')) {
      addressData.region = component.long_name;
      addressData.regionCode = component.short_name;
    }

    if (types.includes('postal_code')) {
      addressData.postalCode = component.long_name;
    }

    if (types.includes('street_number')) {
      addressData.streetNumber = component.long_name;
    }

    if (types.includes('route')) {
      addressData.route = component.long_name;
    }
  }

  // Build street address from components
  if (addressData.streetNumber && addressData.route) {
    addressData.streetAddress = `${addressData.streetNumber} ${addressData.route}`;
  } else if (addressData.route) {
    addressData.streetAddress = addressData.route;
  }

  return addressData;
}
```

---

## Location Data Model

### Complete Structure

The location object stored in Firestore contacts has this structure:

```javascript
{
  // GPS Coordinates (PII - ANONYMIZED on account deletion)
  latitude: number | null,        // Example: 45.1772416
  longitude: number | null,       // Example: 5.7212928

  // Address (PII - ANONYMIZED on account deletion)
  address: string,                // Example: "5-7 Place Robert Schuman"
  streetAddress: string,          // Example: "5-7 Place Robert Schuman"
  streetNumber: string,           // Example: "5"
  route: string,                  // Example: "Place Robert Schuman"
  formattedAddress: string,       // Example: "5-7 Place Robert Schuman, 38000 Grenoble, France"

  // City/Region (Business Context - PRESERVED on account deletion)
  city: string,                   // Example: "Grenoble"
  country: string,                // Example: "France"
  countryCode: string,            // Example: "FR"
  region: string,                 // Example: "Auvergne-Rhône-Alpes"
  regionCode: string,             // Example: "ARA"
  postalCode: string,             // Example: "38000"

  // Metadata
  accuracy: number,               // Example: 18.563 (meters)
  timestamp: string               // Example: "2025-11-04T18:29:13.786Z"
}
```

### Field Categories

#### PII Fields (Removed on Anonymization)

These fields are set to `null` or `"[deleted]"` when the contact deletes their account:

```javascript
{
  latitude: null,                 // ← Anonymized
  longitude: null,                // ← Anonymized
  address: "[deleted]",           // ← Anonymized
  streetAddress: null,            // ← Removed
  streetNumber: null,             // ← Removed
  route: null,                    // ← Removed
  formattedAddress: null          // ← Removed
}
```

**Rationale**: GPS coordinates and street addresses can identify a person's home or workplace.

#### Business Context Fields (Preserved on Anonymization)

These fields are kept even after anonymization:

```javascript
{
  city: "Grenoble",              // ← Kept
  country: "France",             // ← Kept
  countryCode: "FR",             // ← Kept
  region: "Auvergne-Rhône-Alpes", // ← Kept
  regionCode: "ARA",             // ← Kept
  postalCode: "38000"            // ← Kept
}
```

**Rationale**: City-level information is useful business context but not precise enough to identify individuals.

### Example Data

#### Before Anonymization

```json
{
  "location": {
    "latitude": 45.1772416,
    "longitude": 5.7212928,
    "address": "5-7 Place Robert Schuman",
    "streetAddress": "5-7 Place Robert Schuman",
    "streetNumber": "5",
    "route": "Place Robert Schuman",
    "formattedAddress": "5-7 Place Robert Schuman, 38000 Grenoble, France",
    "city": "Grenoble",
    "country": "France",
    "countryCode": "FR",
    "region": "Auvergne-Rhône-Alpes",
    "regionCode": "ARA",
    "postalCode": "38000",
    "accuracy": 18.563,
    "timestamp": "2025-11-04T18:29:13.786Z"
  }
}
```

#### After Anonymization

```json
{
  "location": {
    "latitude": null,
    "longitude": null,
    "address": "[deleted]",
    "streetAddress": null,
    "streetNumber": null,
    "route": null,
    "formattedAddress": null,
    "city": "Grenoble",
    "country": "France",
    "countryCode": "FR",
    "region": "Auvergne-Rhône-Alpes",
    "regionCode": "ARA",
    "postalCode": "38000",
    "accuracy": null,
    "timestamp": "2025-11-04T18:29:13.786Z"
  }
}
```

---

## Cost Tracking System

### Overview

Every geocoding API call is tracked in Firestore with:
- **Cost**: $0.005 per request
- **Feature**: `google_maps_geocoding` (standalone) or `location_reverse_geocoding` (session)
- **Type**: `ApiUsage` (standalone) or `SessionUsage` (session-based)
- **Billable**: Yes (counts toward monthly API limit)

**Important**: Geocoding cost tracking depends on the context:
- **Standalone**: Single geocoding requests write to `ApiUsage` collection
- **Session-Based**: Multi-step enrichment writes to `SessionUsage` collection (includes geocoding + venue search)

See [Session-Based vs Standalone Geocoding](#session-based-vs-standalone-geocoding) for details.

### Firestore Structure (Standalone)

```
Firestore
└── ApiUsage/
    └── {userId}/
        ├── monthly/
        │   └── 2025-11/
        │       ├── totalCost: 0.035
        │       ├── totalRuns: 7
        │       ├── totalApiCalls: 150
        │       ├── featureBreakdown:
        │       │   ├── google_maps_geocoding:
        │       │   │   ├── count: 7
        │       │   │   └── totalCost: 0.035
        │       │   └── google_maps_nearby_search:
        │       │       ├── count: 12
        │       │       └── totalCost: 0.384
        │       ├── providerBreakdown:
        │       │   └── google_maps:
        │       │       ├── count: 19
        │       │       └── totalCost: 0.419
        │       └── lastUpdated: Timestamp
        │
        └── operations/
            └── usage_1763722493600_8ey5/
                ├── feature: "google_maps_geocoding"
                ├── cost: 0.005
                ├── isBillableRun: true
                ├── provider: "google_maps"
                ├── timestamp: "2025-11-21T10:54:53.600Z"
                └── metadata:
                    ├── latitude: 45.1772416
                    ├── longitude: 5.7212928
                    ├── addressFound: true
                    ├── isPublicProfile: true
                    └── timestamp: "2025-11-21T10:54:53.600Z"
```

### Firestore Structure (Session-Based)

For multi-step enrichment sessions (geocoding + venue search):

```
Firestore
└── SessionUsage/
    └── {userId}/
        └── sessions/
            └── {sessionId}/
                ├── feature: "location"
                ├── status: "completed"
                ├── totalCost: 0.037
                ├── totalRuns: 2
                ├── createdAt: Timestamp
                ├── completedAt: Timestamp
                └── steps: [
                    {
                      stepLabel: "Step 1: Reverse Geocoding"
                      operationId: "usage_1763805372067_v0i9"
                      feature: "location_reverse_geocoding"
                      provider: "google_maps"
                      cost: 0.005
                      isBillableRun: true
                      timestamp: "2025-11-22T09:56:12.067Z"
                      metadata: {
                        latitude: 45.1772416
                        longitude: 5.7212928
                        city: "Grenoble"
                        country: "France"
                        formattedAddress: "8 Rue Léo Lagrange, 38100 Grenoble, France"
                        success: true
                        duration: 431
                      }
                    },
                    {
                      stepLabel: "Step 2: Venue Search (Cache Hit)"
                      operationId: "usage_1763805373023_o6yk"
                      feature: "location_venue_search_cached"
                      provider: "redis_cache"
                      cost: 0
                      isBillableRun: false
                      timestamp: "2025-11-22T09:56:13.023Z"
                      metadata: {
                        cacheKey: "location:45.177:5.721"
                        venueName: "Le Carré de la Source"
                        cacheHit: true
                      }
                    }
                  ]
```

**Key Differences**:
- Session-based tracking groups related operations together
- Provides step-by-step audit trail with detailed metadata
- Tracks total cost across all steps
- Used when geocoding is part of a larger enrichment workflow

See `SESSION_BASED_ENRICHMENT.md` for complete implementation details.

### Cost Recording Process

**File**: `/lib/services/serviceContact/server/costTrackingService.js`

```javascript
export class CostTrackingService {
  static async recordUsage({
    userId,
    usageType = 'ApiUsage',           // For geocoding: 'ApiUsage'
    feature,                          // For geocoding: 'google_maps_geocoding'
    cost = 0,                         // For geocoding: 0.005
    isBillableRun = false,            // For geocoding: true
    provider = 'unknown',             // For geocoding: 'google_maps'
    metadata = {},
    sessionId = null,
    stepLabel = null
  }) {
    console.log(`🚀 [DEBUG] recordUsage called:`, {
      operationId,
      userId,
      sessionId,
      cost,
      isBillableRun,
      usageType,
      feature,
      provider
    });

    // Generate operation ID
    const operationId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-11"

    // Write to monthly aggregation
    const monthlyDocRef = adminDb
      .collection(usageType)
      .doc(userId)
      .collection('monthly')
      .doc(currentMonth);

    await adminDb.runTransaction(async (transaction) => {
      const monthlyDoc = await transaction.get(monthlyDocRef);
      const monthlyData = monthlyDoc.exists ? monthlyDoc.data() : {
        totalCost: 0,
        totalRuns: 0,
        totalApiCalls: 0,
        featureBreakdown: {},
        providerBreakdown: {},
        lastUpdated: null
      };

      // Update totals
      monthlyData.totalCost = (Number(monthlyData.totalCost) || 0) + cost;
      monthlyData.totalApiCalls = (Number(monthlyData.totalApiCalls) || 0) + 1;

      if (isBillableRun) {
        monthlyData.totalRuns = (Number(monthlyData.totalRuns) || 0) + 1;
      }

      // Update feature breakdown
      if (!monthlyData.featureBreakdown[feature]) {
        monthlyData.featureBreakdown[feature] = { count: 0, totalCost: 0 };
      }
      monthlyData.featureBreakdown[feature].count += 1;
      monthlyData.featureBreakdown[feature].totalCost += cost;

      // Update provider breakdown
      if (!monthlyData.providerBreakdown[provider]) {
        monthlyData.providerBreakdown[provider] = { count: 0, totalCost: 0 };
      }
      monthlyData.providerBreakdown[provider].count += 1;
      monthlyData.providerBreakdown[provider].totalCost += cost;

      monthlyData.lastUpdated = FieldValue.serverTimestamp();

      transaction.set(monthlyDocRef, monthlyData, { merge: true });
    });

    // Write operation details
    const operationRef = adminDb
      .collection(usageType)
      .doc(userId)
      .collection('operations')
      .doc(operationId);

    await operationRef.set({
      feature,
      cost,
      isBillableRun,
      provider,
      timestamp: new Date().toISOString(),
      metadata
    });

    console.log(`✅ [CostTracking] Usage recorded:`, {
      operationType: 'Standalone',
      usageType,
      cost: `$${cost.toFixed(6)}`,
      feature,
      provider,
      isBillableRun,
      recordedIn: usageType
    });
  }
}
```

### Budget Checking

Before making any geocoding request, the system checks if the user can afford it:

```javascript
static async canAffordOperation(userId, estimatedCost, requireRuns = 0) {
  console.log(`💸 [CostTracking] Checking affordability:`, {
    userId,
    estimatedCost,
    requireRuns
  });

  // Get user's monthly usage
  const usage = await this.getUserMonthlyUsage(userId, 'ApiUsage');

  console.log(`📊 [CostTracking] Monthly usage:`, {
    totalCost: usage.usage.totalCost,
    totalRuns: usage.usage.totalRuns,
    subscriptionLevel: usage.subscriptionLevel
  });

  // Enterprise has unlimited budget
  if (usage.subscriptionLevel === 'ENTERPRISE') {
    return {
      canAfford: true,
      reason: 'enterprise_unlimited',
      currentUsage: usage.usage,
      limits: usage.limits
    };
  }

  // Check budget limit
  const wouldExceedBudget =
    (usage.usage.totalCost + estimatedCost) > usage.limits.maxCost;

  if (wouldExceedBudget) {
    return {
      canAfford: false,
      reason: 'budget_exceeded',
      currentUsage: usage.usage,
      limits: usage.limits,
      attemptedCost: estimatedCost
    };
  }

  // Check run limit
  const wouldExceedRuns =
    (usage.usage.totalRuns + requireRuns) > usage.limits.maxRuns;

  if (wouldExceedRuns) {
    return {
      canAfford: false,
      reason: 'runs_exceeded',
      currentUsage: usage.usage,
      limits: usage.limits,
      attemptedRuns: requireRuns
    };
  }

  // User can afford
  return {
    canAfford: true,
    reason: 'within_limits',
    currentUsage: usage.usage,
    limits: usage.limits
  };
}
```

---

## Budget Management

### Subscription Tier Limits

**File**: `/lib/services/serviceContact/client/constants/contactConstants.js`

```javascript
export const CONTACT_LIMITS = {
  [SUBSCRIPTION_LEVELS.PRO]: {
    aiCostBudget: 1.5,          // $1.50/month
    maxAiRunsPerMonth: 0,       // No AI operations
    maxApiCallsPerMonth: 50     // 50 API calls (including geocoding)
  },

  [SUBSCRIPTION_LEVELS.PREMIUM]: {
    aiCostBudget: 3.0,          // $3.00/month
    maxAiRunsPerMonth: 30,
    maxApiCallsPerMonth: 100    // 100 geocoding calls max
  },

  [SUBSCRIPTION_LEVELS.BUSINESS]: {
    aiCostBudget: 5.0,          // $5.00/month
    maxAiRunsPerMonth: 50,
    maxApiCallsPerMonth: 200    // 200 geocoding calls max
  },

  [SUBSCRIPTION_LEVELS.ENTERPRISE]: {
    aiCostBudget: -1,           // Unlimited
    maxAiRunsPerMonth: -1,      // Unlimited
    maxApiCallsPerMonth: -1     // Unlimited geocoding calls
  }
};
```

### Geocoding Cost by Tier

| Tier | Monthly Budget | Geocoding Calls | Cost per Call | Notes |
|------|---------------|----------------|---------------|-------|
| **Pro** | $1.50 | 50 max | $0.005 | Shared with other API calls |
| **Premium** | $3.00 | 100 max | $0.005 | 600 geocoding calls possible if only geocoding |
| **Business** | $5.00 | 200 max | $0.005 | 1,000 geocoding calls possible if only geocoding |
| **Enterprise** | Unlimited | Unlimited | $0.005 | No limits |

**Example: Premium User**
- Budget: $3.00/month
- Geocoding cost: $0.005/request
- **Maximum geocoding calls**: 600 (if entire budget used for geocoding)
- **With mixed usage**: If user spends $1.50 on AI features, they have $1.50 remaining = 300 geocoding calls

### Monthly Reset

Budgets reset on the 1st of each month:

```javascript
// Check if month changed
const userCurrentMonth = userData.monthlyUsageMonth;
const systemCurrentMonth = new Date().toISOString().slice(0, 7); // "2025-11"

if (userCurrentMonth !== systemCurrentMonth) {
  // Reset counters
  await userDocRef.update({
    monthlyTotalCost: 0,
    monthlyBillableRunsAI: 0,
    monthlyBillableRunsAPI: 0,
    monthlyUsageMonth: systemCurrentMonth,
    monthlyUsageLastUpdated: FieldValue.serverTimestamp()
  });

  console.log(`🔄 [CostTracking] Monthly reset for user ${userId}`);
}
```

### Budget Exceeded Handling

When a user exceeds their budget:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "success": false,
  "error": "Profile owner has reached their monthly API limit",
  "reason": "budget_exceeded",
  "details": {
    "currentCost": 2.95,
    "limit": 3.00,
    "attemptedCost": 0.005
  }
}
```

**Frontend Behavior**:
- Show graceful error message
- Don't display address (show GPS coordinates only)
- Suggest upgrading plan

---

## Usage Examples

### Example 1: Exchange Contact Flow

**File**: `/app/[userId]/components/ExchangeModal.jsx` (Lines 81-111)

```javascript
// User fills out exchange form with GPS location
const submitExchangeForm = async () => {
  const contactData = {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    company: formData.company,
    jobTitle: formData.jobTitle
  };

  // If user has GPS location, perform reverse geocoding
  if (userLocation?.latitude && userLocation?.longitude) {
    console.log("🌍 Performing reverse geocoding...");

    // Build geocoding URL
    const geocodeUrl = `/api/user/contacts/geocode?lat=${userLocation.latitude}&lng=${userLocation.longitude}`;

    // Add userId if we need to track costs against profile owner
    const geocodeUrlWithUser = profileOwnerId
      ? `${geocodeUrl}&userId=${profileOwnerId}`
      : geocodeUrl;

    console.log(`📍 Geocoding URL: ${geocodeUrlWithUser}`);

    try {
      const geocodeResponse = await fetch(geocodeUrlWithUser);

      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.success && geocodeData.address) {
          console.log("✅ Geocoding successful:", geocodeData.address.city);

          // Enrich contact with location data
          contactData.location = {
            ...geocodeData.address,
            latitude: geocodeData.coordinates.latitude,
            longitude: geocodeData.coordinates.longitude,
            accuracy: userLocation.accuracy,
            timestamp: new Date().toISOString()
          };
        } else {
          console.warn("⚠️ Geocoding returned no address");
          // Use raw GPS coordinates
          contactData.location = {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            accuracy: userLocation.accuracy,
            timestamp: new Date().toISOString()
          };
        }
      } else if (geocodeResponse.status === 402) {
        // Budget exceeded
        const error = await geocodeResponse.json();
        console.error("💰 Budget exceeded:", error);

        // Still save contact with raw GPS
        contactData.location = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          accuracy: userLocation.accuracy,
          timestamp: new Date().toISOString()
        };

        // Show user-friendly message
        showNotification({
          type: 'warning',
          message: 'Location saved with GPS coordinates (address lookup unavailable)'
        });
      }
    } catch (error) {
      console.error("❌ Geocoding error:", error);
      // Graceful fallback to raw GPS
      contactData.location = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Submit contact with enriched location data
  await submitContact(contactData);
};
```

### Example 2: Public Profile Viewing

```javascript
// Public profile page
const ProfilePage = ({ userId }) => {
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch(`/api/public/profile/${userId}`);
      const data = await response.json();

      // Profile includes GPS coordinates but not address
      setProfileData(data);

      // If GPS coordinates present, geocode them
      if (data.location?.latitude && data.location?.longitude) {
        const { latitude, longitude } = data.location;

        // Geocode with userId to charge profile owner
        const geocodeUrl = `/api/user/contacts/geocode?lat=${latitude}&lng=${longitude}&userId=${userId}`;

        const geocodeResponse = await fetch(geocodeUrl);

        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();

          if (geocodeData.success) {
            // Update UI with address
            setProfileData(prev => ({
              ...prev,
              location: {
                ...prev.location,
                ...geocodeData.address
              }
            }));
          }
        }
      }
    };

    loadProfile();
  }, [userId]);

  return (
    <div>
      <h1>{profileData?.name}</h1>
      {profileData?.location && (
        <div className="location">
          📍 {profileData.location.city}, {profileData.location.country}
        </div>
      )}
    </div>
  );
};
```

### Example 3: Venue Enrichment Integration

**File**: `/lib/services/serviceContact/server/GroupService/placesService.js`

```javascript
// Calculate centroid of contact group
const calculateCentroid = (contacts) => {
  let totalLat = 0;
  let totalLng = 0;
  let count = 0;

  for (const contact of contacts) {
    if (contact.location?.latitude && contact.location?.longitude) {
      totalLat += contact.location.latitude;
      totalLng += contact.location.longitude;
      count++;
    }
  }

  if (count === 0) return null;

  return {
    latitude: totalLat / count,
    longitude: totalLng / count
  };
};

// Enrich group with venue data
const enrichGroupWithVenue = async (group, userId) => {
  const centroid = calculateCentroid(group.contacts);

  if (!centroid) return group;

  // First, reverse geocode to get general location
  const placesClient = new PlacesApiClient();
  const address = await placesClient.reverseGeocode(
    centroid.latitude,
    centroid.longitude
  );

  // Then search for nearby venues
  const venues = await placesClient.searchNearby({
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    radius: 100, // 100 meters
    types: ['conference_center', 'convention_center', 'event_venue']
  });

  if (venues.length > 0) {
    const topVenue = venues[0];

    return {
      ...group,
      name: `${topVenue.name} Event`,
      location: {
        ...address,
        venueName: topVenue.name,
        venueType: topVenue.types[0],
        centroid
      }
    };
  }

  return group;
};
```

---

## Integration Points

### 1. Exchange Contact Flow

**Entry Point**: User fills out exchange form with GPS location

**Flow**:
```
User submits form
    ↓
ExchangeModal.jsx detects GPS coordinates
    ↓
Calls /api/user/contacts/geocode
    ↓
Returns enriched location data
    ↓
Saves contact to Firestore with full location object
    ↓
Vector storage service uses location for semantic search
```

**Files Involved**:
- `app/[userId]/components/ExchangeModal.jsx`
- `app/api/user/contacts/exchange/submit/route.js`
- `app/api/user/contacts/geocode/route.js`
- `lib/services/serviceContact/server/exchangeService.js`

### 2. Venue Enrichment

**Entry Point**: Automatic group generation detects 5+ contacts at same location

**Flow**:
```
GroupService detects contact cluster
    ↓
Calculates centroid of cluster
    ↓
Calls reverseGeocode() to get general area
    ↓
Calls searchNearby() to find venues
    ↓
Renames group: "Event on Nov 21" → "World Trade Center Event"
```

**Files Involved**:
- `lib/services/serviceContact/server/GroupService/placesService.js`
- `lib/services/placesApiClient.js`

### 3. Cost Tracking Service

**Entry Point**: Every API call triggers cost recording

**Flow**:
```
API endpoint completes request
    ↓
Calls CostTrackingService.recordUsage()
    ↓
Updates Firestore monthly aggregation
    ↓
Creates operation record
    ↓
Updates user's monthly totals
```

**Files Involved**:
- `lib/services/serviceContact/server/costTrackingService.js`
- Firestore: `ApiUsage/{userId}/monthly/{YYYY-MM}/`

### 4. Contact Anonymization

**Entry Point**: User deletes their account

**Flow**:
```
User A deletes account
    ↓
AccountDeletionService.cascadeDeleteContact()
    ↓
ContactAnonymizationService.anonymizeContact()
    ↓
Location fields anonymized:
  - latitude → null
  - longitude → null
  - address → "[deleted]"
  - streetAddress → removed
  - City, country, region → PRESERVED
```

**Files Involved**:
- `lib/services/servicePrivacy/server/accountDeletionService.js`
- `lib/services/servicePrivacy/server/contactAnonymizationService.js`
- `lib/services/servicePrivacy/constants/anonymizationConstants.js`

---

## GDPR Compliance

### Location Data as PII

GPS coordinates and street addresses are considered **Personally Identifiable Information (PII)** under GDPR because they can reveal:
- Home address
- Workplace location
- Frequently visited places
- Movement patterns

### Anonymization Strategy

**File**: `/lib/services/servicePrivacy/constants/anonymizationConstants.js`

```javascript
export const ANONYMIZATION_CONFIG = {
  // Location fields to anonymize (PII)
  LOCATION_FIELDS_TO_ANONYMIZE: [
    'latitude',
    'longitude',
    'address',
    'streetAddress',
    'streetNumber',
    'route',
    'formattedAddress',
    'accuracy'
  ],

  // Location fields to preserve (Business Context)
  LOCATION_FIELDS_TO_PRESERVE: [
    'city',
    'country',
    'countryCode',
    'region',
    'regionCode',
    'postalCode',
    'timestamp'
  ]
};
```

### Anonymization Implementation

**File**: `/lib/services/servicePrivacy/server/contactAnonymizationService.js`

```javascript
static anonymizeLocationData(location) {
  if (!location) return location;

  const anonymized = { ...location };

  // Anonymize PII fields
  ANONYMIZATION_CONFIG.LOCATION_FIELDS_TO_ANONYMIZE.forEach(field => {
    if (field === 'latitude' || field === 'longitude' || field === 'accuracy') {
      anonymized[field] = null;
    } else if (field === 'address') {
      anonymized[field] = '[deleted]';
    } else {
      delete anonymized[field];
    }
  });

  // Preserve business context fields
  ANONYMIZATION_CONFIG.LOCATION_FIELDS_TO_PRESERVE.forEach(field => {
    // These fields remain unchanged
  });

  return anonymized;
}
```

### GDPR Article 17 Compliance

When User A deletes their account:

1. **Immediate Deletion**: User A's own location data deleted
2. **Cascade Anonymization**: User A's location in User B's contacts anonymized
3. **Preservation**: City/country preserved for business context
4. **Logging**: Anonymization logged for audit trail
5. **Verification**: User can verify via manual testing

**Example**: User A (home: 5 Place Robert Schuman, Grenoble) deletes account

Before:
```json
{
  "location": {
    "latitude": 45.1888,
    "longitude": 5.7248,
    "address": "5 Place Robert Schuman",
    "city": "Grenoble",
    "country": "France"
  }
}
```

After:
```json
{
  "location": {
    "latitude": null,
    "longitude": null,
    "address": "[deleted]",
    "city": "Grenoble",
    "country": "France"
  }
}
```

User B can still see: "Met at event in Grenoble, France" (business context)
User B cannot see: Exact GPS location or street address (PII removed)

---

## Configuration & Constants

### API Costs

**File**: `/lib/services/constants/apiCosts.js` (Lines 40-45)

```javascript
export const API_COSTS = {
  GOOGLE_MAPS: {
    // Geocoding API Pricing
    // Reference: https://developers.google.com/maps/billing-and-pricing/pricing
    GEOCODING: {
      PER_1000: 5.00,      // $5.00 per 1,000 requests
      PER_REQUEST: 0.005   // $0.005 per individual request
    },

    // Places API - Nearby Search Pricing
    NEARBY_SEARCH: {
      PER_REQUEST: 0.032   // $0.032 per request (more expensive)
    },

    // Places API - Text Search Pricing
    TEXT_SEARCH: {
      PER_REQUEST: 0.032
    }
  }
};
```

### Subscription Limits

**File**: `/lib/services/serviceContact/client/constants/contactConstants.js`

```javascript
export const SUBSCRIPTION_LEVELS = {
  BASE: 'base',
  PRO: 'pro',
  PREMIUM: 'premium',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise'
};

export const CONTACT_LIMITS = {
  [SUBSCRIPTION_LEVELS.PRO]: {
    aiCostBudget: 1.5,
    maxAiRunsPerMonth: 0,
    maxApiCallsPerMonth: 50
  },
  [SUBSCRIPTION_LEVELS.PREMIUM]: {
    aiCostBudget: 3.0,
    maxAiRunsPerMonth: 30,
    maxApiCallsPerMonth: 100
  },
  [SUBSCRIPTION_LEVELS.BUSINESS]: {
    aiCostBudget: 5.0,
    maxAiRunsPerMonth: 50,
    maxApiCallsPerMonth: 200
  },
  [SUBSCRIPTION_LEVELS.ENTERPRISE]: {
    aiCostBudget: -1,  // Unlimited
    maxAiRunsPerMonth: -1,
    maxApiCallsPerMonth: -1
  }
};
```

### Environment Variables

**File**: `.env.local`

```bash
# Google Maps API Key (required for geocoding)
GOOGLE_MAPS_API_KEY=AIza...

# Firebase Admin SDK (required for cost tracking)
FIREBASE_ADMIN_SDK_KEY=...
FIREBASE_PROJECT_ID=weavink-prod
```

### Rate Limiting

**File**: `/lib/services/placesApiClient.js`

```javascript
class PlacesApiClient {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Conservative rate limits
    this.rateLimit = {
      maxRequestsPerSecond: 50,
      maxRequestsPerMinute: 1000,
      maxRequestsPerDay: 100000
    };

    // Cost tracking
    this.costPerRequest = {
      geocoding: 0.005,
      nearbySearch: 0.032,
      textSearch: 0.032
    };
  }
}
```

---

## Monitoring & Debugging

### Log Format

Geocoding operations produce structured logs with prefixes for easy filtering:

```bash
# Budget check
💸 [CostTracking] [afford_check_1763722492596_432t] Checking AI affordability
👤 [CostTracking] [monthly_usage_1763722492597_262q] User subscription: premium
✅ [CostTracking] [afford_check_1763722492596_432t] User can afford operation

# API client creation
🏗️ [COST-OPTIMIZED] Creating Places API client with cost controls
💡 Cost optimizations active:
   ✅ Minimal field masks by default
   ✅ Reduced batch sizes
   ✅ Conservative rate limiting
   ✅ Quota protection
   ✅ Cost estimation and tracking

# Reverse geocoding
🌍 [REVERSE-GEOCODE] Looking up address for: 45.1772416, 5.7212928
✅ [REVERSE-GEOCODE] Found: Grenoble, France
✅ Geocoding API: Found address for 45.1772416, 5.7212928

# Cost recording
💰 [CostTracking] [usage_1763722493600_8ey5] Recording ApiUsage
🚀 [DEBUG] recordUsage called
💾 [CostTracking] [usage_1763722493600_8ey5] Standalone operation - updating monthly docs
💰 [Geocoding] Tracked usage: $0.005 for user ScmVq6p8ubQ9JFbniF2Vg5ocmbv2
```

### Log Filtering Commands

```bash
# View all geocoding logs
grep "\[REVERSE-GEOCODE\]" production.log

# View cost tracking for specific user
grep "Tracked usage.*ScmVq6p8ubQ9JFbniF2Vg5ocmbv2" production.log

# View budget exceeded events
grep "cannot afford geocoding" production.log

# View all geocoding costs
grep "google_maps_geocoding" production.log | grep "Recording"
```

### Error Scenarios

#### Scenario 1: Budget Exceeded

**Logs**:
```
💸 [CostTracking] Checking affordability: { cost: 0.005, userId: 'XXX' }
📊 [CostTracking] Monthly usage: { totalCost: 2.995, limit: 3.0 }
❌ [CostTracking] Budget would be exceeded: 2.995 + 0.005 > 3.0
⚠️ [API Geocoding] User XXX cannot afford geocoding: budget_exceeded
```

**Response**: HTTP 402 Payment Required

**Solution**: User needs to:
1. Upgrade subscription plan
2. Wait for monthly reset
3. Use fewer geocoding calls

#### Scenario 2: Invalid Coordinates

**Logs**:
```
❌ [API Geocoding] Invalid coordinates: { lat: 95, lng: 200 }
```

**Response**: HTTP 400 Bad Request

**Solution**: Frontend validation should catch this

#### Scenario 3: Google Maps API Error

**Logs**:
```
🌍 [REVERSE-GEOCODE] Looking up address for: 45.177, 5.721
❌ [PlacesAPI] Geocoding API error: OVER_QUERY_LIMIT
⚠️ [API Geocoding] Google Maps API failed
```

**Response**: HTTP 500 Internal Server Error

**Solution**:
1. Check Google Cloud quota
2. Verify API key is valid
3. Check billing account status

### Debugging Tips

1. **Check User Budget**:
```javascript
// In browser console
const userId = 'ScmVq6p8ubQ9JFbniF2Vg5ocmbv2';
const response = await fetch(`/api/user/usage/monthly?userId=${userId}`);
const usage = await response.json();
console.log('Budget:', usage.limits.maxCost);
console.log('Used:', usage.usage.totalCost);
console.log('Remaining:', usage.limits.maxCost - usage.usage.totalCost);
```

2. **Test Geocoding Directly**:
```bash
curl "http://localhost:3000/api/user/contacts/geocode?lat=45.1772416&lng=5.7212928&userId=TEST_USER"
```

3. **Verify Google Maps API**:
```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?latlng=45.1772416,5.7212928&key=YOUR_API_KEY"
```

4. **Check Firestore Usage Data**:
```javascript
// Firebase Console → Firestore
// Navigate to: ApiUsage/{userId}/monthly/2025-11/
// Check: totalCost, totalRuns, featureBreakdown.google_maps_geocoding
```

---

## Future Features

### Location Services Auto-Tagging

**File**: `/documentation/features/LOCATION_SERVICES_AUTO_TAGGING_SPEC.md`

Planned feature that will significantly expand geocoding usage:

#### Features

1. **Reverse Location Search**
   - Auto-enrich contacts with venue names
   - "45.177, 5.721" → "Stade des Alpes"
   - Cost: $0.005 per reverse geocode + $0.032 per nearby search

2. **Smart Event Detection**
   - Detect when multiple contacts share location + time
   - Auto-create event groups
   - Cost: Minimal (uses existing geocoded data)

3. **AI Auto-Tagging**
   - Generate semantic tags for contacts based on location
   - "Met at Tech Conference, Grenoble"
   - Cost: Included in AI enhancement budget

#### Cost Optimization

**Grid-Based Caching**:
```
100m x 100m grid caching
    ↓
First contact at location: $0.005 + $0.032 = $0.037
    ↓
Next 50 contacts within 100m radius: Cache hit = $0.00
    ↓
70% cost reduction from caching
```

**Example**:
- 100 contacts at same conference
- Without caching: 100 × $0.037 = $3.70
- With caching: $0.037 + (99 × $0.00) = $0.037
- **Savings**: $3.663 (99% reduction)

#### Implementation Timeline

- Phase 1: Grid caching system (Q1 2026)
- Phase 2: Reverse location search (Q2 2026)
- Phase 3: Smart event detection (Q2 2026)
- Phase 4: AI auto-tagging (Q3 2026)

---

## File Reference

### Core Implementation

| File | Lines | Purpose |
|------|-------|---------|
| `/app/api/user/contacts/geocode/route.js` | 1-141 | Main geocoding API endpoint |
| `/lib/services/placesApiClient.js` | 407-512 | Reverse geocoding implementation |
| `/lib/services/constants/apiCosts.js` | 40-45 | Cost definitions ($0.005) |

### Cost Tracking

| File | Lines | Purpose |
|------|-------|---------|
| `/lib/services/serviceContact/server/costTrackingService.js` | 1-200+ | Usage recording and budget checking |
| `/lib/services/serviceContact/server/costTracking/sessionService.js` | 1-100+ | Session-based cost tracking |

### Integration

| File | Lines | Purpose |
|------|-------|---------|
| `/app/[userId]/components/ExchangeModal.jsx` | 81-111 | Triggers geocoding on exchange |
| `/lib/services/serviceContact/server/GroupService/placesService.js` | 1-500+ | Venue enrichment integration |
| `/lib/services/serviceContact/server/exchangeService.js` | 1-300+ | Exchange contact processing |

### GDPR Compliance

| File | Lines | Purpose |
|------|-------|---------|
| `/lib/services/servicePrivacy/server/contactAnonymizationService.js` | 1-165 | Location data anonymization |
| `/lib/services/servicePrivacy/constants/anonymizationConstants.js` | 1-76 | Anonymization configuration |
| `/lib/services/servicePrivacy/server/accountDeletionService.js` | 1-200+ | Account deletion with cascading |

### Configuration

| File | Lines | Purpose |
|------|-------|---------|
| `/lib/services/serviceContact/client/constants/contactConstants.js` | 1-800+ | Subscription limits and thresholds |
| `.env.local` | N/A | Environment variables (API keys) |

### Documentation

| File | Purpose |
|------|---------|
| `/documentation/features/VENUE_ENRICHMENT_FEATURE.md` | Venue enrichment details |
| `/documentation/features/LOCATION_SERVICES_AUTO_TAGGING_SPEC.md` | Future location features spec |
| `/documentation/infrastructure/COST_TRACKING_MIGRATION_GUIDE.md` | Cost tracking architecture |
| `/documentation/rgpd/CONTACT_ANONYMIZATION_IMPLEMENTATION_GUIDE.md` | GDPR anonymization guide |

---

## Quick Reference

### API Call

```bash
curl "https://weavink.com/api/user/contacts/geocode?lat=45.177&lng=5.721&userId=USER_ID"
```

### Cost Calculation

```
Cost per request = $0.005
Monthly budget (Premium) = $3.00
Maximum calls = $3.00 / $0.005 = 600 geocoding calls
```

### Location Object

```javascript
{
  // PII (anonymized)
  latitude: 45.177,
  longitude: 5.721,
  address: "5 Place Robert Schuman",

  // Business context (preserved)
  city: "Grenoble",
  country: "France",
  countryCode: "FR"
}
```

### Budget Check

```javascript
const canAfford = await CostTrackingService.canAffordOperation(
  userId,
  0.005,  // Cost
  1       // Billable runs
);

if (!canAfford.canAfford) {
  return { error: 'Budget exceeded', reason: canAfford.reason };
}
```

### Record Usage

```javascript
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',
  feature: 'google_maps_geocoding',
  cost: 0.005,
  isBillableRun: true,
  provider: 'google_maps',
  metadata: { latitude, longitude }
});
```

---

## Summary

The geocoding system is a production-ready, cost-tracked, GDPR-compliant feature that:

✅ Converts GPS coordinates to human-readable addresses
✅ Costs $0.005 per request (Google Maps standard pricing)
✅ Tracks costs against user budgets by subscription tier
✅ Properly anonymizes location data when users delete accounts
✅ Integrates with exchange contacts, venue enrichment, and future location features
✅ Provides comprehensive logging and monitoring
✅ Handles errors gracefully with fallbacks

**Status**: Fully implemented and operational in production.

---

**Last Updated**: 2025-11-22
**Author**: Weavink Development Team
**Version**: 1.1.0 (Added session-based tracking documentation)
