/**
 * Import Grenoble Public Events to Firestore
 *
 * Run with: node --experimental-loader ./loader.mjs -r dotenv/config scripts/import-grenoble-events.mjs
 */

import { config } from 'dotenv';
config();

import { adminDb } from '../lib/firebaseAdmin.js';
import { neo4jClient } from '../lib/services/serviceContact/server/neo4j/neo4jClient.js';

const ADMIN_USER_ID = 'system-admin';

const events = [
  {
    name: "Salon Naturissima",
    description: "Le salon du bio, du bien-être et de l'environnement. Naturissima accueille les visiteurs qui recherchent le bon et le naturel sous toutes ses formes.",
    startDate: "2025-11-26T09:00:00Z",
    endDate: "2025-11-30T18:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["bio", "bien-être", "environnement", "grand public"]
  },
  {
    name: "Salon Artisa",
    description: "Le grand rendez-vous des créateurs d'art. Une grande galerie d'artisanat d'art proposant couture, textile, bijoux, sculptures, et plus.",
    startDate: "2025-11-26T09:00:00Z",
    endDate: "2025-11-30T18:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["artisanat", "art", "créateurs", "grand public"]
  },
  {
    name: "Salon 2tonnes50",
    description: "Un salon fédérateur pour baisser, ensemble, notre empreinte carbone.",
    startDate: "2025-11-26T09:00:00Z",
    endDate: "2025-11-30T18:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["écologie", "empreinte carbone", "environnement", "grand public"]
  },
  {
    name: "Salon de l'Etudiant Grenoble",
    description: "Un événement pour l'orientation des jeunes, avec des conférences, ateliers et stands d'information sur les formations et débouchés.",
    startDate: "2025-11-29T08:00:00Z",
    endDate: "2025-11-29T16:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["étudiant", "orientation", "formation", "grand public"]
  },
  {
    name: "Cap Lycée",
    description: "Événement pour aider les collégiens et lycéens à choisir leur orientation et découvrir les lycées et parcours de formation.",
    startDate: "2025-12-03T14:00:00Z",
    endDate: "2025-12-03T19:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["lycée", "orientation", "éducation", "grand public"]
  },
  {
    name: "SnowCamp",
    description: "Conférence technique destinée aux professionnels du logiciel et de l'informatique autour des outils et technologies actuelles.",
    startDate: "2026-01-14T08:00:00Z",
    endDate: "2026-01-16T16:30:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["tech", "logiciel", "informatique", "professionnel"]
  },
  {
    name: "Minalogic Business Meetings",
    description: "Les rendez-vous d'affaires internationaux des technologies du numérique, de la micro/nano-électronique à l'IA.",
    startDate: "2026-03-17T07:00:00Z",
    endDate: "2026-03-17T17:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["numérique", "business", "technologie", "professionnel"]
  },
  {
    name: "Marché aux tissus et loisirs créatifs",
    description: "Tisséade, le salon des passionnés de couture, tissus, kits et accessoires.",
    startDate: "2026-09-13T07:30:00Z",
    endDate: "2026-09-13T15:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["couture", "loisirs créatifs", "tissus", "grand public"]
  },
  {
    name: "Conférence Internationale Matériaux",
    description: "Conférence scientifique et technique majeure pour les acteurs du monde des matériaux.",
    startDate: "2026-11-16T08:00:00Z",
    endDate: "2026-11-20T16:00:00Z",
    location: {
      address: "Avenue d'Innsbruck, 38100 Grenoble, France",
      latitude: 45.1585,
      longitude: 5.7345,
      venue: "Alpexpo"
    },
    source: "manual",
    tags: ["matériaux", "science", "conférence", "professionnel"]
  }
];

async function importEvents() {
  console.log('\n========================================');
  console.log('🗓️  GRENOBLE PUBLIC EVENTS IMPORT');
  console.log('========================================\n');

  const now = new Date().toISOString();
  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      // Generate unique event ID
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const event = {
        id: eventId,
        userId: ADMIN_USER_ID,
        isPublic: true,
        name: eventData.name,
        description: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        location: eventData.location,
        source: eventData.source,
        sourceId: null,
        tags: eventData.tags,
        isRecurring: false,
        recurrenceRule: null,
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore
      await adminDb.collection('events').doc(eventId).set(event);

      // Sync to Neo4j
      try {
        await neo4jClient.upsertEvent(ADMIN_USER_ID, {
          id: eventId,
          name: event.name,
          description: event.description,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          address: event.location?.address,
          latitude: event.location?.latitude,
          longitude: event.location?.longitude,
          source: event.source
        });
        console.log(`✅ ${event.name} (Neo4j synced)`);
      } catch (neo4jError) {
        console.log(`✅ ${event.name} (Neo4j sync failed: ${neo4jError.message})`);
      }

      success++;

      // Small delay to ensure unique IDs
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.log(`❌ ${eventData.name}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log('📊 IMPORT RESULTS');
  console.log('========================================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📍 Location: Alpexpo, Grenoble`);
  console.log(`🔓 Visibility: PUBLIC (all users can see)`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

importEvents().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
