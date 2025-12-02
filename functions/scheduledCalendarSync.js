/**
 * Scheduled Calendar Sync - Firebase Cloud Function
 * Sprint 6: Event Discovery & Automation
 *
 * Runs daily to sync all connected Google Calendars.
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp, getApps, getApp, cert} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {google} = require("googleapis");

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// Use named database if specified, otherwise fall back to default
const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
const db = getFirestore(getApp(), databaseId);

// Configuration
const SYNC_CONFIG = {
  MAX_EVENTS_PER_SYNC: 100,
  SYNC_WINDOW_DAYS: 90,
  TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000,
};

const CONNECTION_STATUS = {
  CONNECTED: "connected",
  SYNCING: "syncing",
  ERROR: "error",
  TOKEN_EXPIRED: "token_expired",
};

/**
 * Create OAuth2 client
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
  );
}

/**
 * Refresh access token if needed
 */
async function refreshTokenIfNeeded(userId, tokens) {
  const oauth2Client = createOAuth2Client();

  // Check if token needs refresh
  if (tokens.expiryDate && tokens.expiryDate > Date.now() + SYNC_CONFIG.TOKEN_REFRESH_BUFFER_MS) {
    return {success: true, tokens};
  }

  if (!tokens.refreshToken) {
    await db.collection("calendar_tokens").doc(userId).update({
      status: CONNECTION_STATUS.TOKEN_EXPIRED,
    });
    return {success: false, error: "No refresh token"};
  }

  try {
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    });

    const {credentials} = await oauth2Client.refreshAccessToken();

    const updates = {
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
      status: CONNECTION_STATUS.CONNECTED,
    };

    if (credentials.refresh_token) {
      updates.refreshToken = credentials.refresh_token;
    }

    await db.collection("calendar_tokens").doc(userId).update(updates);

    return {
      success: true,
      tokens: {...tokens, ...updates},
    };
  } catch (error) {
    console.error(`[CalendarSync] Token refresh failed for ${userId}:`, error.message);
    await db.collection("calendar_tokens").doc(userId).update({
      status: CONNECTION_STATUS.TOKEN_EXPIRED,
    });
    return {success: false, error: error.message};
  }
}

/**
 * Sync events for a single user
 */
async function syncUserEvents(userId, tokens) {
  const result = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Update status to syncing
    await db.collection("calendar_tokens").doc(userId).update({
      status: CONNECTION_STATUS.SYNCING,
    });

    // Refresh token if needed
    const refreshResult = await refreshTokenIfNeeded(userId, tokens);
    if (!refreshResult.success) {
      result.errors.push({error: refreshResult.error});
      return result;
    }

    const validTokens = refreshResult.tokens;
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: validTokens.accessToken,
      refresh_token: validTokens.refreshToken,
    });

    const calendar = google.calendar({version: "v3", auth: oauth2Client});

    // Calculate sync window
    const startDate = new Date();
    const endDate = new Date(Date.now() + SYNC_CONFIG.SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // Fetch events
    const eventsResponse = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: SYNC_CONFIG.MAX_EVENTS_PER_SYNC,
      singleEvents: true,
      orderBy: "startTime",
    });

    const googleEvents = eventsResponse.data.items || [];
    console.log(`[CalendarSync] Found ${googleEvents.length} events for user ${userId}`);

    // Process each event
    for (const googleEvent of googleEvents) {
      try {
        // Skip cancelled or untitled events
        if (googleEvent.status === "cancelled" || !googleEvent.summary) {
          result.skipped++;
          continue;
        }

        // Check if already imported
        const existingEvents = await db.collection("events")
            .where("userId", "==", userId)
            .where("source", "==", "google_calendar")
            .where("sourceId", "==", googleEvent.id)
            .limit(1)
            .get();

        if (!existingEvents.empty) {
          result.skipped++;
          continue;
        }

        // Parse dates
        const startDate = googleEvent.start?.dateTime || googleEvent.start?.date;
        const endDate = googleEvent.end?.dateTime || googleEvent.end?.date;

        if (!startDate) {
          result.skipped++;
          continue;
        }

        // Create event (simplified - no geocoding in function)
        const eventData = {
          userId,
          name: googleEvent.summary,
          description: googleEvent.description || "",
          startDate: Timestamp.fromDate(new Date(startDate)),
          endDate: endDate ? Timestamp.fromDate(new Date(endDate)) : Timestamp.fromDate(new Date(startDate)),
          location: googleEvent.location ? {
            address: googleEvent.location,
            isOnline: googleEvent.location.toLowerCase().includes("http") ||
                                  googleEvent.location.toLowerCase().includes("zoom") ||
                                  googleEvent.location.toLowerCase().includes("meet"),
          } : null,
          source: "google_calendar",
          sourceId: googleEvent.id,
          sourceUrl: googleEvent.htmlLink,
          tags: [],
          isPublic: false,
          isRecurring: !!googleEvent.recurringEventId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await db.collection("events").add(eventData);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          eventId: googleEvent.id,
          error: error.message,
        });
      }
    }

    // Update last sync time
    await db.collection("calendar_tokens").doc(userId).update({
      lastSyncAt: Timestamp.now(),
      status: CONNECTION_STATUS.CONNECTED,
    });
  } catch (error) {
    console.error(`[CalendarSync] Sync failed for user ${userId}:`, error.message);
    result.errors.push({error: error.message});

    try {
      await db.collection("calendar_tokens").doc(userId).update({
        status: CONNECTION_STATUS.ERROR,
      });
    } catch (e) {
      // Ignore
    }
  }

  return result;
}

/**
 * Scheduled function - runs daily at 3 AM UTC
 */
exports.scheduledCalendarSync = onSchedule({
  schedule: "0 3 * * *", // Every day at 3 AM UTC
  timeZone: "UTC",
  memory: "256MiB",
  timeoutSeconds: 540, // 9 minutes
  region: "europe-west1",
}, async (event) => {
  console.log("[CalendarSync] Starting scheduled sync...");

  const stats = {
    total: 0,
    synced: 0,
    failed: 0,
    totalImported: 0,
    errors: [],
  };

  try {
    // Get all connected users
    const tokensSnapshot = await db.collection("calendar_tokens")
        .where("status", "==", CONNECTION_STATUS.CONNECTED)
        .get();

    stats.total = tokensSnapshot.size;
    console.log(`[CalendarSync] Found ${stats.total} users with connected calendars`);

    // Process each user
    for (const tokenDoc of tokensSnapshot.docs) {
      const userId = tokenDoc.id;
      const tokens = tokenDoc.data();

      console.log(`[CalendarSync] Syncing user ${userId}...`);

      try {
        const result = await syncUserEvents(userId, tokens);

        if (result.errors.length === 0 || result.imported > 0) {
          stats.synced++;
          stats.totalImported += result.imported;
        } else {
          stats.failed++;
          stats.errors.push({
            userId,
            error: result.errors[0]?.error || "Unknown error",
          });
        }

        console.log(`[CalendarSync] User ${userId}: imported=${result.imported}, skipped=${result.skipped}, failed=${result.failed}`);
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          userId,
          error: error.message,
        });
      }

      // Small delay between users
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error("[CalendarSync] Scheduled sync error:", error);
    stats.errors.push({error: error.message});
  }

  console.log(`[CalendarSync] Sync complete: ${stats.synced}/${stats.total} users, ${stats.totalImported} events imported, ${stats.failed} failed`);

  // Log summary to Firestore for monitoring
  await db.collection("sync_logs").add({
    type: "calendar_sync",
    ...stats,
    completedAt: Timestamp.now(),
  });

  return stats;
});
