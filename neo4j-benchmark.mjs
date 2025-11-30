import neo4j from 'neo4j-driver';

// Configuration
const AURA_CONFIG = {
  uri: 'neo4j+s://9077f1b7.databases.neo4j.io',
  user: 'neo4j',
  password: 'zBbVzgZPxFNJAm6cEeqDdKhfR0BbAnwTKmtC8WpWtKc',
  name: 'AuraDB'
};

const SELFHOSTED_CONFIG = {
  uri: 'bolt://10.0.4.3:7687',
  user: 'neo4j',
  password: 'YourSecurePassword123!',
  name: 'Self-Hosted'
};

const WARMUP_ITERATIONS = 3;
const TEST_ITERATIONS = 15;

// Test queries based on real Weavink use cases
const QUERIES = [
  {
    name: 'Contact lookup by userId',
    cypher: 'MATCH (c:Contact) WHERE c.userId IS NOT NULL RETURN c LIMIT 10',
    params: {}
  },
  {
    name: 'Contact with company relationship',
    cypher: 'MATCH (c:Contact)-[:WORKS_AT]->(comp:Company) RETURN c, comp LIMIT 10',
    params: {}
  },
  {
    name: 'Similar contacts query',
    cypher: 'MATCH (c:Contact)-[:SIMILAR_TO]->(other:Contact) RETURN c.name, other.name, c.userId LIMIT 20',
    params: {}
  },
  {
    name: 'Contact with tags',
    cypher: 'MATCH (c:Contact)-[:HAS_TAG]->(t:Tag) RETURN c, collect(t) AS tags LIMIT 10',
    params: {}
  },
  {
    name: 'Full contact graph (contacts + companies + tags)',
    cypher: `
      MATCH (c:Contact)
      OPTIONAL MATCH (c)-[:WORKS_AT]->(comp:Company)
      OPTIONAL MATCH (c)-[:HAS_TAG]->(t:Tag)
      RETURN c, comp, collect(t) AS tags
      LIMIT 10
    `,
    params: {}
  },
  {
    name: 'Count queries by label',
    cypher: 'MATCH (n) RETURN labels(n) AS type, count(*) AS count',
    params: {}
  },
  {
    name: 'Contact full-text search simulation',
    cypher: `
      MATCH (c:Contact)
      WHERE c.name IS NOT NULL
      RETURN c
      ORDER BY c.name
      LIMIT 20
    `,
    params: {}
  },
  {
    name: 'Event with attendees',
    cypher: 'MATCH (e:Event)<-[:ATTENDED]-(c:Contact) RETURN e, collect(c) AS attendees LIMIT 10',
    params: {}
  }
];

const WRITE_QUERY = {
  name: 'Create + Delete test contact',
  create: `
    CREATE (c:Contact {
      userId: $userId,
      name: $name,
      email: $email,
      isBenchmarkTest: true,
      createdAt: datetime()
    })
    RETURN c
  `,
  delete: `
    MATCH (c:Contact {isBenchmarkTest: true})
    DELETE c
  `
};

// Statistics calculation
function calculateStats(timings) {
  const sorted = [...timings].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

// Format duration in ms
function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Execute a single query and measure time
async function executeQuery(session, query, params = {}) {
  const start = performance.now();
  try {
    const result = await session.run(query, params);
    const duration = performance.now() - start;
    return { duration, success: true, recordCount: result.records.length };
  } catch (error) {
    const duration = performance.now() - start;
    return { duration, success: false, error: error.message };
  }
}

// Run benchmark for a single query
async function benchmarkQuery(driver, query, isWarmup = false) {
  const session = driver.session();
  const timings = [];

  try {
    const iterations = isWarmup ? WARMUP_ITERATIONS : TEST_ITERATIONS;

    for (let i = 0; i < iterations; i++) {
      const result = await executeQuery(session, query.cypher, query.params);

      if (!result.success) {
        console.error(`❌ Query failed: ${result.error}`);
        return null;
      }

      if (!isWarmup) {
        timings.push(result.duration);
      }

      // Small delay between iterations to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return timings;
  } finally {
    await session.close();
  }
}

// Run write benchmark (create + delete)
async function benchmarkWrite(driver) {
  const timings = [];

  for (let i = 0; i < TEST_ITERATIONS; i++) {
    const session = driver.session();

    try {
      const testData = {
        userId: `benchmark_test_${Date.now()}_${i}`,
        name: `Benchmark Test Contact ${i}`,
        email: `benchmark${i}@test.com`
      };

      const start = performance.now();

      // Create
      await session.run(WRITE_QUERY.create, testData);

      // Delete
      await session.run(WRITE_QUERY.delete);

      const duration = performance.now() - start;
      timings.push(duration);

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Write test failed: ${error.message}`);
      return null;
    } finally {
      await session.close();
    }
  }

  return timings;
}

// Test connection
async function testConnection(config) {
  const driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password),
    {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      disableLosslessIntegers: true
    }
  );

  try {
    await driver.verifyConnectivity();
    console.log(`✅ Connected to ${config.name}`);
    return driver;
  } catch (error) {
    console.error(`❌ Failed to connect to ${config.name}: ${error.message}`);
    return null;
  }
}

// Run all benchmarks for a single database
async function runBenchmarks(driver, dbName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Running benchmarks for ${dbName}`);
  console.log('='.repeat(60));

  const results = {};

  // Read queries
  for (const query of QUERIES) {
    console.log(`\n🔍 Testing: ${query.name}`);

    // Warmup
    console.log(`  ⏱️  Warmup (${WARMUP_ITERATIONS} iterations)...`);
    await benchmarkQuery(driver, query, true);

    // Actual test
    console.log(`  ⏱️  Running test (${TEST_ITERATIONS} iterations)...`);
    const timings = await benchmarkQuery(driver, query, false);

    if (timings) {
      const stats = calculateStats(timings);
      results[query.name] = stats;
      console.log(`  ✅ Avg: ${formatDuration(stats.avg)}, P95: ${formatDuration(stats.p95)}`);
    } else {
      results[query.name] = null;
    }
  }

  // Write query
  console.log(`\n✍️  Testing: ${WRITE_QUERY.name}`);
  console.log(`  ⏱️  Running test (${TEST_ITERATIONS} iterations)...`);
  const writeTimings = await benchmarkWrite(driver);

  if (writeTimings) {
    const stats = calculateStats(writeTimings);
    results[WRITE_QUERY.name] = stats;
    console.log(`  ✅ Avg: ${formatDuration(stats.avg)}, P95: ${formatDuration(stats.p95)}`);
  } else {
    results[WRITE_QUERY.name] = null;
  }

  return results;
}

// Print comparison table
function printComparison(auraResults, selfHostedResults) {
  console.log(`\n${'='.repeat(100)}`);
  console.log('📈 BENCHMARK RESULTS COMPARISON');
  console.log('='.repeat(100));

  const allQueries = [...QUERIES.map(q => q.name), WRITE_QUERY.name];

  console.log('\n' + '─'.repeat(100));
  console.log(
    'Query'.padEnd(45) +
    'AuraDB (avg)'.padEnd(15) +
    'Self-Hosted (avg)'.padEnd(18) +
    'Winner'.padEnd(15) +
    'Speedup'
  );
  console.log('─'.repeat(100));

  let auraWins = 0;
  let selfHostedWins = 0;

  for (const queryName of allQueries) {
    const auraStats = auraResults[queryName];
    const selfStats = selfHostedResults[queryName];

    if (!auraStats || !selfStats) {
      console.log(
        queryName.padEnd(45) +
        (auraStats ? formatDuration(auraStats.avg) : 'FAILED').padEnd(15) +
        (selfStats ? formatDuration(selfStats.avg) : 'FAILED').padEnd(18) +
        'N/A'.padEnd(15) +
        'N/A'
      );
      continue;
    }

    const winner = auraStats.avg < selfStats.avg ? 'AuraDB' : 'Self-Hosted';
    const speedup = winner === 'AuraDB'
      ? `${(selfStats.avg / auraStats.avg).toFixed(2)}x`
      : `${(auraStats.avg / selfStats.avg).toFixed(2)}x`;

    if (winner === 'AuraDB') auraWins++;
    else selfHostedWins++;

    const winnerSymbol = winner === 'AuraDB' ? '🏆' : '🥇';

    console.log(
      queryName.padEnd(45) +
      formatDuration(auraStats.avg).padEnd(15) +
      formatDuration(selfStats.avg).padEnd(18) +
      `${winnerSymbol} ${winner}`.padEnd(20) +
      speedup
    );
  }

  console.log('─'.repeat(100));

  // Detailed statistics table
  console.log('\n' + '─'.repeat(100));
  console.log('DETAILED STATISTICS (Min / P50 / P95 / P99 / Max)');
  console.log('─'.repeat(100));

  for (const queryName of allQueries) {
    const auraStats = auraResults[queryName];
    const selfStats = selfHostedResults[queryName];

    if (!auraStats || !selfStats) continue;

    console.log(`\n${queryName}:`);
    console.log(
      '  AuraDB:       '.padEnd(20) +
      `${formatDuration(auraStats.min)} / ${formatDuration(auraStats.p50)} / ${formatDuration(auraStats.p95)} / ${formatDuration(auraStats.p99)} / ${formatDuration(auraStats.max)}`
    );
    console.log(
      '  Self-Hosted:  '.padEnd(20) +
      `${formatDuration(selfStats.min)} / ${formatDuration(selfStats.p50)} / ${formatDuration(selfStats.p95)} / ${formatDuration(selfStats.p99)} / ${formatDuration(selfStats.max)}`
    );
  }

  console.log('\n' + '─'.repeat(100));

  // Summary
  console.log('\n📊 SUMMARY');
  console.log('─'.repeat(100));
  console.log(`AuraDB wins: ${auraWins} queries`);
  console.log(`Self-Hosted wins: ${selfHostedWins} queries`);

  const overallWinner = auraWins > selfHostedWins ? 'AuraDB' : 'Self-Hosted';
  console.log(`\n🏆 Overall winner: ${overallWinner}`);

  // Calculate average speedup
  let totalSpeedup = 0;
  let validComparisons = 0;

  for (const queryName of allQueries) {
    const auraStats = auraResults[queryName];
    const selfStats = selfHostedResults[queryName];

    if (auraStats && selfStats) {
      totalSpeedup += auraStats.avg < selfStats.avg
        ? selfStats.avg / auraStats.avg
        : auraStats.avg / selfStats.avg;
      validComparisons++;
    }
  }

  const avgSpeedup = totalSpeedup / validComparisons;
  console.log(`Average speedup factor: ${avgSpeedup.toFixed(2)}x`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('─'.repeat(100));

  if (overallWinner === 'Self-Hosted') {
    console.log('✅ Self-hosted Neo4j is performing better on average.');
    console.log('   - Lower latency for most queries');
    console.log('   - Better suited for VPS deployment');
    console.log('   - Consider keeping self-hosted setup');
  } else {
    console.log('✅ AuraDB is performing better on average.');
    console.log('   - Managed service benefits');
    console.log('   - Lower latency for most queries');
    console.log('   - Consider staying with AuraDB');
  }

  console.log('\n💰 COST CONSIDERATIONS:');
  console.log('   - AuraDB: Managed service (monthly subscription)');
  console.log('   - Self-Hosted: VPS resources + maintenance overhead');

  console.log('\n🔒 RELIABILITY CONSIDERATIONS:');
  console.log('   - AuraDB: Automatic backups, HA, monitoring');
  console.log('   - Self-Hosted: Manual backups, single point of failure (current setup)');

  console.log('\n' + '='.repeat(100));
}

// Main execution
async function main() {
  console.log('🚀 Neo4j Benchmark: AuraDB vs Self-Hosted');
  console.log('='.repeat(60));
  console.log(`Warmup iterations: ${WARMUP_ITERATIONS}`);
  console.log(`Test iterations per query: ${TEST_ITERATIONS}`);
  console.log(`Total queries: ${QUERIES.length + 1} (${QUERIES.length} read + 1 write)`);

  // Connect to both databases
  console.log('\n📡 Connecting to databases...');
  const auraDriver = await testConnection(AURA_CONFIG);
  const selfHostedDriver = await testConnection(SELFHOSTED_CONFIG);

  if (!auraDriver || !selfHostedDriver) {
    console.error('\n❌ Failed to connect to one or both databases. Exiting.');
    process.exit(1);
  }

  try {
    // Run benchmarks
    const auraResults = await runBenchmarks(auraDriver, AURA_CONFIG.name);
    const selfHostedResults = await runBenchmarks(selfHostedDriver, SELFHOSTED_CONFIG.name);

    // Print comparison
    printComparison(auraResults, selfHostedResults);

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up connections...');
    await auraDriver.close();
    await selfHostedDriver.close();
    console.log('✅ Benchmark complete!');
  }
}

// Run the benchmark
main().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
