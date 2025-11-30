#!/usr/bin/env node
/**
 * Pinecone vs Qdrant Benchmark - 50 Users Simulation
 *
 * Simulates a realistic Weavink deployment with:
 * - 50 users
 * - Varying contact counts per user (10-200 contacts)
 * - Total ~5,000 vectors
 *
 * Tests:
 * 1. Setup: Create collections/namespaces and populate with vectors
 * 2. Single-user similarity search
 * 3. Cross-user queries (admin searching across all users)
 * 4. Concurrent user searches (parallel queries)
 * 5. Bulk operations
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { QdrantClient } from '@qdrant/js-client-rest';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX: 'weavink',
  QDRANT_URL: process.env.QDRANT_URL || 'http://10.0.4.2:6333',

  EMBEDDING_DIMENSION: 1024,
  ITERATIONS: 10,
  WARMUP_ITERATIONS: 2,

  // Simulation config
  NUM_USERS: 50,
  MIN_CONTACTS_PER_USER: 10,
  MAX_CONTACTS_PER_USER: 200,
  AVG_CONTACTS_PER_USER: 80,  // For realistic distribution
};

// ============================================================================
// UTILITIES
// ============================================================================

function calculateStats(values) {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0, norm1 = 0, norm2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function generateRandomVector(dim) {
  return Array(dim).fill(0).map(() => Math.random() * 2 - 1);
}

function generateUserId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 28; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateContactData(index) {
  const companies = ['Acme Corp', 'Tech Inc', 'StartupXYZ', 'BigCo', 'InnovateLabs', 'FutureTech', 'GlobalSoft'];
  const statuses = ['new', 'contacted', 'qualified', 'converted'];
  const tags = ['investor', 'partner', 'customer', 'lead', 'vip', 'event-met'];

  return {
    name: `Contact ${index}`,
    email: `contact${index}@example.com`,
    company: companies[Math.floor(Math.random() * companies.length)],
    jobTitle: ['CEO', 'CTO', 'VP Sales', 'Engineer', 'Designer', 'PM'][Math.floor(Math.random() * 6)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    tags: [tags[Math.floor(Math.random() * tags.length)]],
    message: `Met at event ${Math.floor(Math.random() * 100)}`,
  };
}

// Generate realistic contact count distribution (log-normal-ish)
function generateContactCount() {
  // Most users have few contacts, some power users have many
  const base = Math.random();
  if (base < 0.5) {
    // 50% of users: 10-50 contacts
    return Math.floor(10 + Math.random() * 40);
  } else if (base < 0.85) {
    // 35% of users: 50-120 contacts
    return Math.floor(50 + Math.random() * 70);
  } else {
    // 15% of users: 120-200 contacts (power users)
    return Math.floor(120 + Math.random() * 80);
  }
}

// ============================================================================
// SIMULATED DATA GENERATOR
// ============================================================================

class DataSimulator {
  constructor() {
    this.users = [];
    this.totalVectors = 0;
  }

  generate() {
    console.log(chalk.blue(`\n📊 Generating simulated data for ${CONFIG.NUM_USERS} users...\n`));

    for (let i = 0; i < CONFIG.NUM_USERS; i++) {
      const userId = generateUserId();
      const contactCount = generateContactCount();
      const contacts = [];

      for (let j = 0; j < contactCount; j++) {
        contacts.push({
          id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          values: generateRandomVector(CONFIG.EMBEDDING_DIMENSION),
          metadata: {
            ...generateContactData(j),
            userId: userId,
          },
        });
      }

      this.users.push({
        userId,
        namespace: `user_${userId}`,
        collection: userId,
        contacts,
      });

      this.totalVectors += contactCount;
    }

    // Print distribution
    const counts = this.users.map(u => u.contacts.length).sort((a, b) => a - b);
    console.log(chalk.green(`✅ Generated ${this.totalVectors} total vectors\n`));
    console.log(`   Users: ${CONFIG.NUM_USERS}`);
    console.log(`   Min contacts/user: ${counts[0]}`);
    console.log(`   Max contacts/user: ${counts[counts.length - 1]}`);
    console.log(`   Avg contacts/user: ${(this.totalVectors / CONFIG.NUM_USERS).toFixed(1)}`);
    console.log(`   Median contacts/user: ${counts[Math.floor(counts.length / 2)]}`);

    // Show distribution
    console.log(chalk.gray('\n   Distribution:'));
    const buckets = { '10-30': 0, '31-50': 0, '51-80': 0, '81-120': 0, '121-200': 0 };
    for (const count of counts) {
      if (count <= 30) buckets['10-30']++;
      else if (count <= 50) buckets['31-50']++;
      else if (count <= 80) buckets['51-80']++;
      else if (count <= 120) buckets['81-120']++;
      else buckets['121-200']++;
    }
    for (const [range, count] of Object.entries(buckets)) {
      const bar = '█'.repeat(Math.floor(count / 2));
      console.log(`   ${range.padEnd(8)} contacts: ${bar} ${count} users`);
    }

    return this;
  }
}

// ============================================================================
// DATABASE CLIENTS
// ============================================================================

class PineconeClient {
  constructor() {
    this.pc = new Pinecone({ apiKey: CONFIG.PINECONE_API_KEY });
    this.index = this.pc.index(CONFIG.PINECONE_INDEX);
  }

  async upsertBatch(vectors, namespace) {
    const records = vectors.map(v => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata,
    }));

    // Pinecone limits to 100 vectors per upsert
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await this.index.namespace(namespace).upsert(batch);
    }
  }

  async search(queryVector, namespace, topK = 10) {
    const start = Date.now();
    await this.index.namespace(namespace).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });
    return Date.now() - start;
  }

  async filteredSearch(queryVector, namespace, filter, topK = 10) {
    const start = Date.now();
    await this.index.namespace(namespace).query({
      vector: queryVector,
      topK,
      filter,
      includeMetadata: true,
    });
    return Date.now() - start;
  }

  async deleteNamespace(namespace) {
    try {
      await this.index.namespace(namespace).deleteAll();
    } catch (e) {
      // Namespace might not exist
    }
  }
}

class QdrantClientWrapper {
  constructor() {
    this.client = new QdrantClient({ url: CONFIG.QDRANT_URL });
  }

  async createCollection(name) {
    try {
      await this.client.getCollection(name);
    } catch (e) {
      await this.client.createCollection(name, {
        vectors: { size: CONFIG.EMBEDDING_DIMENSION, distance: 'Cosine' },
      });
    }
  }

  async upsertBatch(vectors, collection) {
    const points = vectors.map(v => ({
      id: crypto.randomUUID(),
      vector: v.values,
      payload: { ...v.metadata, id: v.id },
    }));

    // Qdrant can handle larger batches
    const batchSize = 500;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.client.upsert(collection, { points: batch });
    }
  }

  async search(queryVector, collection, topK = 10) {
    const start = Date.now();
    await this.client.search(collection, {
      vector: queryVector,
      limit: topK,
      with_payload: true,
    });
    return Date.now() - start;
  }

  async filteredSearch(queryVector, collection, filter, topK = 10) {
    const start = Date.now();
    await this.client.search(collection, {
      vector: queryVector,
      limit: topK,
      filter,
      with_payload: true,
    });
    return Date.now() - start;
  }

  async deleteCollection(name) {
    try {
      await this.client.deleteCollection(name);
    } catch (e) {
      // Collection might not exist
    }
  }
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

class BenchmarkRunner {
  constructor(pinecone, qdrant, simulator) {
    this.pinecone = pinecone;
    this.qdrant = qdrant;
    this.simulator = simulator;
    this.results = {};
  }

  async runTest(testName, testFn, iterations = CONFIG.ITERATIONS, warmup = CONFIG.WARMUP_ITERATIONS) {
    console.log(chalk.blue(`\n🧪 Test: ${testName}`));
    console.log(chalk.gray('─'.repeat(80)));

    const pineconeLatencies = [];
    const qdrantLatencies = [];

    for (let i = 0; i < warmup + iterations; i++) {
      const isWarmup = i < warmup;
      const label = isWarmup ? `Warmup ${i + 1}` : `Iteration ${i - warmup + 1}`;

      try {
        const pLatency = await testFn('pinecone');
        const qLatency = await testFn('qdrant');

        if (!isWarmup) {
          pineconeLatencies.push(pLatency);
          qdrantLatencies.push(qLatency);
        }

        const color = isWarmup ? chalk.gray : chalk.white;
        console.log(color(`  ${label}: Pinecone ${pLatency.toFixed(2)}ms, Qdrant ${qLatency.toFixed(2)}ms`));
      } catch (err) {
        console.log(chalk.red(`  ${label}: Error - ${err.message}`));
      }
    }

    const pStats = calculateStats(pineconeLatencies);
    const qStats = calculateStats(qdrantLatencies);

    this.results[testName] = { pinecone: pStats, qdrant: qStats };

    console.log(chalk.gray('\n  Statistics:'));
    console.log(chalk.cyan(`  Pinecone - Avg: ${pStats.avg.toFixed(2)}ms, P95: ${pStats.p95.toFixed(2)}ms`));
    console.log(chalk.magenta(`  Qdrant   - Avg: ${qStats.avg.toFixed(2)}ms, P95: ${qStats.p95.toFixed(2)}ms`));

    const winner = qStats.avg < pStats.avg ? 'Qdrant' : 'Pinecone';
    const speedup = ((Math.max(pStats.avg, qStats.avg) / Math.min(pStats.avg, qStats.avg) - 1) * 100).toFixed(1);
    console.log(chalk.green(`\n  🏆 Winner: ${winner} (${speedup}% faster)`));
  }

  async setupData(skipPinecone = false) {
    console.log(chalk.blue('\n🔧 Setting up test data...\n'));

    const users = this.simulator.users;
    let progress = 0;

    for (const user of users) {
      progress++;
      const pct = ((progress / users.length) * 100).toFixed(0);
      process.stdout.write(`\r  Setting up user ${progress}/${users.length} (${pct}%) - ${user.contacts.length} contacts...`);

      // Qdrant setup
      await this.qdrant.createCollection(user.collection);
      await this.qdrant.upsertBatch(user.contacts, user.collection);

      // Pinecone setup (optional - slower)
      if (!skipPinecone) {
        await this.pinecone.upsertBatch(user.contacts, user.namespace);
      }
    }

    console.log(chalk.green(`\n\n✅ Setup complete! ${this.simulator.totalVectors} vectors indexed.\n`));
  }

  async cleanupData(skipPinecone = false) {
    console.log(chalk.blue('\n🧹 Cleaning up test data...\n'));

    for (const user of this.simulator.users) {
      await this.qdrant.deleteCollection(user.collection);
      if (!skipPinecone) {
        await this.pinecone.deleteNamespace(user.namespace);
      }
    }

    console.log(chalk.green('✅ Cleanup complete!\n'));
  }

  // Test 1: Single user similarity search
  async testSingleUserSearch() {
    const user = this.simulator.users[Math.floor(this.simulator.users.length / 2)]; // Pick middle user
    const queryVector = user.contacts[0].values;

    console.log(chalk.gray(`  User: ${user.userId.substring(0, 8)}... (${user.contacts.length} contacts)`));

    await this.runTest('Single User Similarity Search', async (db) => {
      if (db === 'pinecone') {
        return await this.pinecone.search(queryVector, user.namespace, 10);
      } else {
        return await this.qdrant.search(queryVector, user.collection, 10);
      }
    });
  }

  // Test 2: Search in large user's collection
  async testPowerUserSearch() {
    // Find user with most contacts
    const user = this.simulator.users.reduce((max, u) =>
      u.contacts.length > max.contacts.length ? u : max
    );
    const queryVector = user.contacts[0].values;

    console.log(chalk.gray(`  Power user: ${user.userId.substring(0, 8)}... (${user.contacts.length} contacts)`));

    await this.runTest('Power User Search (Largest Collection)', async (db) => {
      if (db === 'pinecone') {
        return await this.pinecone.search(queryVector, user.namespace, 10);
      } else {
        return await this.qdrant.search(queryVector, user.collection, 10);
      }
    });
  }

  // Test 3: Filtered search
  async testFilteredSearch() {
    const user = this.simulator.users[0];
    const queryVector = user.contacts[0].values;

    console.log(chalk.gray(`  Searching with company filter`));

    await this.runTest('Filtered Search (by Company)', async (db) => {
      if (db === 'pinecone') {
        return await this.pinecone.filteredSearch(queryVector, user.namespace, {
          company: { $eq: 'Acme Corp' }
        }, 10);
      } else {
        return await this.qdrant.filteredSearch(queryVector, user.collection, {
          must: [{ key: 'company', match: { value: 'Acme Corp' } }]
        }, 10);
      }
    });
  }

  // Test 4: Concurrent searches (simulate multiple users searching at once)
  async testConcurrentSearches() {
    const numConcurrent = 10;
    const testUsers = this.simulator.users.slice(0, numConcurrent);

    console.log(chalk.gray(`  ${numConcurrent} concurrent user searches`));

    await this.runTest('Concurrent Searches (10 Users)', async (db) => {
      const start = Date.now();

      const promises = testUsers.map(user => {
        const queryVector = user.contacts[0].values;
        if (db === 'pinecone') {
          return this.pinecone.search(queryVector, user.namespace, 10);
        } else {
          return this.qdrant.search(queryVector, user.collection, 10);
        }
      });

      await Promise.all(promises);
      return Date.now() - start;
    });
  }

  // Test 5: Sequential searches across random users
  async testRandomUserSearches() {
    console.log(chalk.gray(`  10 sequential searches across random users`));

    await this.runTest('Random User Searches (10 Sequential)', async (db) => {
      const start = Date.now();

      for (let i = 0; i < 10; i++) {
        const user = this.simulator.users[Math.floor(Math.random() * this.simulator.users.length)];
        const queryVector = user.contacts[Math.floor(Math.random() * user.contacts.length)].values;

        if (db === 'pinecone') {
          await this.pinecone.search(queryVector, user.namespace, 10);
        } else {
          await this.qdrant.search(queryVector, user.collection, 10);
        }
      }

      return Date.now() - start;
    });
  }

  printResults() {
    console.log(chalk.blue('\n\n📊 FINAL COMPARISON TABLE (50 Users Simulation)'));
    console.log(chalk.gray('═'.repeat(120)));

    console.log(chalk.bold(
      `${'Test'.padEnd(45)} | ${'Pinecone Avg'.padEnd(15)} | ${'Qdrant Avg'.padEnd(15)} | ${'Winner'.padEnd(12)} | Speedup`
    ));
    console.log(chalk.gray('─'.repeat(120)));

    let qdrantWins = 0, pineconeWins = 0;

    for (const [testName, stats] of Object.entries(this.results)) {
      const pAvg = stats.pinecone.avg.toFixed(2);
      const qAvg = stats.qdrant.avg.toFixed(2);
      const winner = parseFloat(qAvg) < parseFloat(pAvg) ? 'Qdrant' : 'Pinecone';
      const faster = Math.min(stats.pinecone.avg, stats.qdrant.avg);
      const slower = Math.max(stats.pinecone.avg, stats.qdrant.avg);
      const speedup = (((slower / faster) - 1) * 100).toFixed(1);

      if (winner === 'Qdrant') qdrantWins++;
      else pineconeWins++;

      const winnerColor = winner === 'Qdrant' ? chalk.green : chalk.cyan;
      console.log(
        `${testName.substring(0, 44).padEnd(45)} | ${pAvg.padEnd(13)}ms | ${qAvg.padEnd(13)}ms | ${winnerColor(winner.padEnd(12))} | ${speedup}%`
      );
    }

    console.log(chalk.gray('═'.repeat(120)));

    // Summary
    console.log(chalk.blue('\n📈 SUMMARY\n'));
    console.log(`   Total vectors: ${this.simulator.totalVectors.toLocaleString()}`);
    console.log(`   Users: ${CONFIG.NUM_USERS}`);
    console.log(`   Qdrant wins: ${qdrantWins}/${Object.keys(this.results).length} tests`);
    console.log(`   Pinecone wins: ${pineconeWins}/${Object.keys(this.results).length} tests`);

    // Projections
    console.log(chalk.blue('\n💰 COST PROJECTION (Monthly)\n'));

    const monthlyQueries = this.simulator.totalVectors * 30 * 10; // Assume 10 queries per contact per month
    const pineconeCost = (monthlyQueries / 1000000) * 2; // $2 per million queries

    console.log(`   Estimated monthly queries: ${monthlyQueries.toLocaleString()}`);
    console.log(chalk.cyan(`   Pinecone cost: $${pineconeCost.toFixed(2)}/month (queries only)`));
    console.log(chalk.green(`   Qdrant cost: $0 (self-hosted on existing VPS)`));

    // Scale projections
    console.log(chalk.blue('\n📐 SCALE PROJECTIONS\n'));

    const scales = [
      { users: 100, contacts: 100 },
      { users: 500, contacts: 100 },
      { users: 1000, contacts: 100 },
      { users: 5000, contacts: 100 },
    ];

    console.log('   Users     | Total Vectors | Est. RAM (Qdrant) | Pinecone Storage Cost');
    console.log(chalk.gray('   ' + '─'.repeat(75)));

    for (const scale of scales) {
      const totalVectors = scale.users * scale.contacts;
      const ramGB = (totalVectors * CONFIG.EMBEDDING_DIMENSION * 4) / (1024 * 1024 * 1024); // 4 bytes per float
      const storageCost = (totalVectors * CONFIG.EMBEDDING_DIMENSION * 4) / (1024 * 1024 * 1024) * 0.33;

      console.log(
        `   ${scale.users.toString().padEnd(9)} | ${totalVectors.toLocaleString().padEnd(13)} | ${ramGB.toFixed(2)} GB${' '.repeat(10)} | $${storageCost.toFixed(2)}/month`
      );
    }

    console.log('\n');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(chalk.bold.blue('\n╔════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║     Pinecone vs Qdrant Benchmark - 50 Users Simulation                ║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════════════════════════════════════╝'));

  const args = process.argv.slice(2);
  const skipPinecone = args.includes('--skip-pinecone');
  const skipSetup = args.includes('--skip-setup');
  const skipCleanup = args.includes('--skip-cleanup');

  if (skipPinecone) {
    console.log(chalk.yellow('\n⚠️  Skipping Pinecone (--skip-pinecone flag set)\n'));
  }

  try {
    // Generate simulated data
    const simulator = new DataSimulator().generate();

    // Initialize clients
    console.log(chalk.blue('\n🔧 Initializing database clients...\n'));

    const pinecone = new PineconeClient();
    console.log(chalk.green('✅ Pinecone client initialized'));

    const qdrant = new QdrantClientWrapper();
    await qdrant.client.getCollections(); // Test connection
    console.log(chalk.green('✅ Qdrant client initialized'));

    // Create benchmark runner
    const runner = new BenchmarkRunner(pinecone, qdrant, simulator);

    // Setup data (this takes a while)
    if (!skipSetup) {
      console.log(chalk.yellow('\n⏳ Setting up data will take several minutes...\n'));
      console.log(chalk.gray('   Tip: Use --skip-pinecone to only test Qdrant (much faster)'));
      console.log(chalk.gray('   Tip: Use --skip-setup if data is already loaded\n'));

      await runner.setupData(skipPinecone);
    }

    // Run benchmarks
    console.log(chalk.blue('\n\n🚀 Running benchmarks...\n'));

    await runner.testSingleUserSearch();
    await runner.testPowerUserSearch();
    await runner.testFilteredSearch();
    await runner.testConcurrentSearches();
    await runner.testRandomUserSearches();

    // Print results
    runner.printResults();

    // Cleanup
    if (!skipCleanup) {
      await runner.cleanupData(skipPinecone);
    }

    console.log(chalk.green('✅ Benchmark complete!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Benchmark failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
