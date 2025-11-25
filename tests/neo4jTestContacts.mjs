// tests/neo4jTestContacts.mjs
// Test script to create contacts with all fields for Neo4j testing
// Creates 100 contacts across 10 companies with overlapping tags

/**
 * RUN THIS TEST:
 * node tests/neo4jTestContacts.mjs
 *
 * ENVIRONMENT:
 * - Requires .env with Firestore and Neo4j credentials
 * - TEST_USER_ID: User ID to create contacts for (defaults to env var)
 *
 * FEATURES TESTED:
 * - Company relationships (WORKS_AT)
 * - Tag relationships (HAS_TAG)
 * - Semantic similarity discovery (SIMILAR_TO)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

// Dynamic imports for Firebase Admin
const adminModule = await import('../lib/firebaseAdmin.js');
const { adminDb, adminAuth } = adminModule;
const { FieldValue } = await import('firebase-admin/firestore');

// Import Neo4j services
const neo4jClientModule = await import('../lib/services/serviceContact/server/neo4j/neo4jClient.js');
const neo4jSyncModule = await import('../lib/services/serviceContact/server/neo4j/Neo4jSyncService.js');
const { neo4jClient } = neo4jClientModule;
const Neo4jSyncService = neo4jSyncModule.default;

// Import Pinecone SDK directly (avoids @/lib path aliases that only work in Next.js)
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client for vector creation
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const PINECONE_INDEX_NAME = 'weavink';  // Must match app's SEMANTIC_SEARCH_CONFIG.INDEX_NAME
const PINECONE_EMBEDDING_MODEL = 'multilingual-e5-large';

/**
 * Ensure Pinecone index exists, create if not
 * The main app's IndexManagementService auto-creates, but this script bypasses that
 */
async function ensureIndexExists() {
  console.log('Checking Pinecone index...');
  const indexList = await pinecone.listIndexes();
  const indexExists = indexList.indexes?.some(idx => idx.name === PINECONE_INDEX_NAME);

  if (!indexExists) {
    console.log(`Creating Pinecone index: ${PINECONE_INDEX_NAME}...`);
    await pinecone.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: 1024, // multilingual-e5-large dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    console.log('Index created. Waiting 30s for initialization...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  } else {
    console.log('Pinecone index exists.');
  }
}

// Test configuration
const TEST_USERNAME = process.env.TEST_TARGET_USERNAME || 'zulianileonardo';
let TEST_USER_ID = process.env.TEST_USER_ID || process.env.ADMIN_USER_ID;

/**
 * Lookup user ID from username via Firestore
 */
async function getUserIdFromUsername(username) {
  const usersRef = adminDb.collection('users');
  const snapshot = await usersRef.where('username', '==', username).limit(1).get();

  if (snapshot.empty) {
    throw new Error(`User not found with username: ${username}`);
  }

  return snapshot.docs[0].id;
}

// Companies with their domains and typical job roles
const COMPANIES = [
  { name: 'Tesla, Inc.', domain: 'tesla.com', industry: 'automotive', roles: ['Software Engineer', 'Battery Researcher', 'Autopilot Engineer', 'Manufacturing Lead', 'Design Engineer', 'Product Manager', 'Marketing Manager', 'Sales Director', 'HR Manager', 'Finance Analyst'] },
  { name: 'Google', domain: 'google.com', industry: 'technology', roles: ['ML Engineer', 'Research Scientist', 'Product Manager', 'UX Designer', 'DevOps Engineer', 'Data Scientist', 'Security Engineer', 'Cloud Architect', 'Technical Writer', 'Program Manager'] },
  { name: 'Microsoft', domain: 'microsoft.com', industry: 'technology', roles: ['Cloud Architect', 'AI Platform Lead', 'Software Developer', 'Program Manager', 'Solutions Architect', 'Security Analyst', 'DevOps Engineer', 'Product Manager', 'Data Engineer', 'Support Engineer'] },
  { name: 'Apple', domain: 'apple.com', industry: 'technology', roles: ['iOS Developer', 'Hardware Engineer', 'Design Lead', 'Product Manager', 'ML Engineer', 'Security Engineer', 'Supply Chain Manager', 'Retail Manager', 'Marketing Lead', 'Finance Director'] },
  { name: 'Amazon', domain: 'amazon.com', industry: 'e-commerce', roles: ['Software Development Engineer', 'Solutions Architect', 'Operations Manager', 'Product Manager', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Supply Chain Analyst', 'Business Analyst', 'Technical Program Manager'] },
  { name: 'Meta', domain: 'meta.com', industry: 'social-media', roles: ['Software Engineer', 'ML Research Scientist', 'Product Designer', 'Data Engineer', 'Reality Labs Engineer', 'Content Strategist', 'Policy Manager', 'Marketing Manager', 'Recruiter', 'Finance Manager'] },
  { name: 'Netflix', domain: 'netflix.com', industry: 'entertainment', roles: ['Senior Engineer', 'ML Engineer', 'Content Strategist', 'Product Manager', 'Data Scientist', 'Platform Engineer', 'Security Engineer', 'Creative Director', 'Marketing Manager', 'Finance Analyst'] },
  { name: 'Salesforce', domain: 'salesforce.com', industry: 'crm', roles: ['Solutions Engineer', 'Account Executive', 'Product Manager', 'Developer Advocate', 'Platform Engineer', 'Data Architect', 'Success Manager', 'Marketing Specialist', 'Business Analyst', 'Support Engineer'] },
  { name: 'Stripe', domain: 'stripe.com', industry: 'fintech', roles: ['Backend Engineer', 'Infrastructure Engineer', 'Product Manager', 'Risk Analyst', 'DevOps Engineer', 'Security Engineer', 'Solutions Architect', 'Technical Writer', 'Support Specialist', 'Finance Manager'] },
  { name: 'Freelance', domain: null, industry: 'consulting', roles: ['Independent Consultant', 'Freelance Developer', 'Strategy Advisor', 'Technical Consultant', 'Design Consultant', 'Marketing Consultant', 'Business Coach', 'Executive Coach', 'Project Manager', 'Content Creator'] }
];

// Tag categories for variety
const TAG_CATEGORIES = {
  technical: ['engineering', 'software', 'backend', 'frontend', 'devops', 'cloud', 'infrastructure', 'security', 'platform'],
  ai: ['ai', 'machine-learning', 'deep-learning', 'nlp', 'computer-vision', 'data-science', 'analytics'],
  business: ['product', 'strategy', 'marketing', 'sales', 'finance', 'operations', 'leadership'],
  domain: ['fintech', 'e-commerce', 'healthcare', 'automotive', 'entertainment', 'social-media', 'enterprise'],
  soft: ['networking', 'mentorship', 'speaking', 'writing', 'consulting']
};

// First names and last names for generating contacts
const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo', 'Maya', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Rachel', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zack', 'Anna', 'Ben', 'Clara', 'Dan', 'Emma', 'Finn', 'Gina', 'Hugo', 'Iris', 'James', 'Kelly', 'Luke', 'Mia', 'Nick', 'Ora', 'Paul', 'Rose', 'Steve', 'Tina', 'Uri', 'Vera', 'Will', 'Xena', 'Yuki'];
const LAST_NAMES = ['Smith', 'Johnson', 'Davis', 'Chen', 'Martinez', 'Wilson', 'Lee', 'Brown', 'Taylor', 'White', 'Garcia', 'Anderson', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Thompson', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Morris', 'Murphy', 'Rivera', 'Cook', 'Rogers', 'Morgan'];

// Public email domains for freelancers
const PUBLIC_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com', 'icloud.com'];

/**
 * Generate random tags for a contact based on their role
 */
function generateTags(role, company) {
  const tags = new Set();

  // Add 2-4 technical tags based on role
  if (role.toLowerCase().includes('engineer') || role.toLowerCase().includes('developer')) {
    tags.add('engineering');
    tags.add(TAG_CATEGORIES.technical[Math.floor(Math.random() * TAG_CATEGORIES.technical.length)]);
  }

  // Add AI tags for ML/AI roles
  if (role.toLowerCase().includes('ml') || role.toLowerCase().includes('ai') || role.toLowerCase().includes('data')) {
    tags.add('ai');
    tags.add(TAG_CATEGORIES.ai[Math.floor(Math.random() * TAG_CATEGORIES.ai.length)]);
  }

  // Add business tags for PM/business roles
  if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('director') || role.toLowerCase().includes('product')) {
    tags.add(TAG_CATEGORIES.business[Math.floor(Math.random() * TAG_CATEGORIES.business.length)]);
  }

  // Add industry tag
  if (company.industry) {
    tags.add(company.industry);
  }

  // Add 1-2 random tags
  const allTags = Object.values(TAG_CATEGORIES).flat();
  tags.add(allTags[Math.floor(Math.random() * allTags.length)]);

  return Array.from(tags);
}

/**
 * Generate 100 test contacts
 */
function generateTestContacts() {
  const contacts = [];
  let contactIndex = 0;

  // Distribute contacts across companies (approximately 10 per company)
  for (const company of COMPANIES) {
    const contactsPerCompany = company.name === 'Freelance' ? 10 : 10;

    for (let i = 0; i < contactsPerCompany && contactIndex < 100; i++) {
      const firstName = FIRST_NAMES[contactIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[contactIndex % LAST_NAMES.length];
      const role = company.roles[i % company.roles.length];

      // Generate email
      let email;
      if (company.domain) {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.domain}`;
      } else {
        // Freelancers use public email domains
        const publicDomain = PUBLIC_DOMAINS[Math.floor(Math.random() * PUBLIC_DOMAINS.length)];
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${publicDomain}`;
      }

      contacts.push({
        name: `${firstName} ${lastName}`,
        email: email,
        company: company.name,
        jobTitle: role,
        tags: generateTags(role, company),
        website: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        message: `Contact from ${company.name} - ${role}`,
        status: 'active',
        source: 'neo4j-test'
      });

      contactIndex++;
    }
  }

  return contacts;
}

// Generate the test contacts
const TEST_CONTACTS = generateTestContacts();

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  contacts: [],
  errors: []
};

/**
 * Generate a unique contact ID
 */
function generateContactId() {
  return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a contact in Firestore
 */
async function createContactInFirestore(userId, contactData) {
  const newContact = {
    ...contactData,
    id: generateContactId(),
    createdBy: userId,
    submittedAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  const contactsRef = adminDb.collection('Contacts').doc(userId);
  const doc = await contactsRef.get();

  if (doc.exists) {
    await contactsRef.update({
      contacts: FieldValue.arrayUnion(newContact)
    });
  } else {
    await contactsRef.set({
      contacts: [newContact],
      userId: userId,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    });
  }

  return newContact;
}

/**
 * Sync contact to Neo4j
 */
async function syncToNeo4j(userId, contact) {
  return Neo4jSyncService.syncContact(userId, contact);
}

/**
 * Generate embedding using Pinecone Inference API directly
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} 1024-dimensional embedding vector
 */
async function generateEmbedding(text) {
  const result = await pinecone.inference.embed(
    PINECONE_EMBEDDING_MODEL,
    [text],
    { inputType: 'passage' }
  );
  return result.data[0].values;
}

/**
 * Get namespaced Pinecone index for user
 * @param {string} userId - User ID
 * @returns {PineconeNamespace} Namespaced index
 */
function getNamespacedIndex(userId) {
  const index = pinecone.index(PINECONE_INDEX_NAME);
  return index.namespace(`user_${userId}`);
}

/**
 * Create Pinecone vector for contact
 * Generates embedding and upserts to Pinecone for semantic similarity
 */
async function createPineconeVector(userId, contact) {
  try {
    // Build document text for embedding (same format as VectorStorageService)
    const documentText = [
      `[Contact Name]: ${contact.name}`,
      `[Email Address]: ${contact.email}`,
      `[Company]: ${contact.company}`,
      `[Organization]: ${contact.company}`,
      `[Job Title]: ${contact.jobTitle}`,
      `[Semantic Tags]: ${contact.tags.join(', ')}`,
      `[Searchable Categories]: ${contact.tags.join(' ')}`
    ].join('\n');

    // Generate embedding using Pinecone Inference API
    const embedding = await generateEmbedding(documentText);

    // Get namespaced index
    const index = getNamespacedIndex(userId);

    // Upsert vector with metadata
    await index.upsert([{
      id: contact.id,
      values: embedding,
      metadata: {
        userId,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        jobTitle: contact.jobTitle,
        tags: contact.tags.join(','),
        status: contact.status || 'active',
        message: contact.message || ''
      }
    }]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('Neo4j Test Contacts Script (100 Contacts)');
  console.log('='.repeat(60));

  // Resolve user ID
  if (!TEST_USER_ID) {
    console.log(`\nLooking up user ID for username: ${TEST_USERNAME}`);
    try {
      TEST_USER_ID = await getUserIdFromUsername(TEST_USERNAME);
      console.log(`Found user ID: ${TEST_USER_ID}`);
    } catch (error) {
      console.error(`ERROR: ${error.message}`);
      console.error('Set TEST_USER_ID in .env or ensure TEST_TARGET_USERNAME is correct');
      process.exit(1);
    }
  }

  console.log(`\nUser ID: ${TEST_USER_ID}`);
  console.log(`Creating ${TEST_CONTACTS.length} test contacts...\n`);

  // Check Neo4j connection
  console.log('Checking Neo4j connection...');
  try {
    await neo4jClient.connect();
    console.log('Neo4j connected successfully.\n');
  } catch (error) {
    console.error('ERROR: Neo4j connection failed:', error.message);
    console.error('Make sure NEO4J_URI and NEO4J_PASSWORD are set in .env');
    process.exit(1);
  }

  // Ensure Pinecone index exists (auto-create if needed)
  try {
    await ensureIndexExists();
  } catch (error) {
    console.error('ERROR: Pinecone index check failed:', error.message);
    console.error('Make sure PINECONE_API_KEY is set in .env');
    process.exit(1);
  }

  // Count by company for progress tracking
  const companyCount = {};

  // Create contacts
  for (let i = 0; i < TEST_CONTACTS.length; i++) {
    const contactData = TEST_CONTACTS[i];
    try {
      // Track company counts
      companyCount[contactData.company] = (companyCount[contactData.company] || 0) + 1;

      // Progress indicator every 10 contacts
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${TEST_CONTACTS.length} contacts created...`);
      }

      // 1. Create in Firestore
      const contact = await createContactInFirestore(TEST_USER_ID, contactData);

      // 2. Sync to Neo4j
      const syncResult = await syncToNeo4j(TEST_USER_ID, contact);

      // 3. Create Pinecone vector for semantic similarity
      const vectorResult = await createPineconeVector(TEST_USER_ID, contact);

      // Track success
      if (syncResult.success && vectorResult.success) {
        results.passed++;
      } else {
        if (!syncResult.success) {
          console.log(`  Warning: Neo4j sync issue for ${contact.name}: ${syncResult.reason || 'unknown'}`);
        }
        if (!vectorResult.success) {
          console.log(`  Warning: Vector creation failed for ${contact.name}: ${vectorResult.error || 'unknown'}`);
        }
      }

      results.contacts.push({
        name: contact.name,
        id: contact.id,
        company: contact.company,
        tags: contact.tags,
        neo4jSynced: syncResult.success,
        vectorCreated: vectorResult.success
      });

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error(`  ERROR creating ${contactData.name}: ${error.message}`);
      results.failed++;
      results.errors.push({
        contact: contactData.name,
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total contacts: ${TEST_CONTACTS.length}`);
  console.log(`Fully created (Firestore + Neo4j + Pinecone): ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  // Count vector successes
  const vectorSuccess = results.contacts.filter(c => c.vectorCreated).length;
  const neo4jSuccess = results.contacts.filter(c => c.neo4jSynced).length;
  console.log(`\nBreakdown:`);
  console.log(`  Neo4j synced: ${neo4jSuccess}/${TEST_CONTACTS.length}`);
  console.log(`  Pinecone vectors: ${vectorSuccess}/${TEST_CONTACTS.length}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    for (const err of results.errors) {
      console.log(`  - ${err.contact}: ${err.error}`);
    }
  }

  // Print company distribution
  console.log('\n' + '='.repeat(60));
  console.log('COMPANY DISTRIBUTION');
  console.log('='.repeat(60));
  for (const [company, count] of Object.entries(companyCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${company}: ${count} contacts`);
  }

  // Print expected Neo4j structure
  console.log('\n' + '='.repeat(60));
  console.log('EXPECTED NEO4J STRUCTURE');
  console.log('='.repeat(60));
  console.log('\nCompanies (should see 10):');
  console.log('  - Tesla, Google, Microsoft, Apple, Amazon');
  console.log('  - Meta, Netflix, Salesforce, Stripe, Freelance');

  console.log('\nTag clusters you should see:');
  console.log('  - engineering: ~40+ contacts');
  console.log('  - ai/machine-learning: ~20+ contacts');
  console.log('  - product/business: ~20+ contacts');

  console.log('\nTo verify in Graph Explorer:');
  console.log('  1. Open your contacts page');
  console.log('  2. Go to Groups > Graph Explorer tab');
  console.log('  3. Click "Discover Relationships"');
  console.log('  4. You should see 10 company clusters forming');

  // Cleanup
  await neo4jClient.close?.();

  console.log('\nDone!');
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
