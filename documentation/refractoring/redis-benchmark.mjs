#!/usr/bin/env node
/**
 * Redis Benchmark: Redis Cloud vs Self-Hosted
 * 
 * Benchmarks real caching use cases for Weavink:
 * 1. Simple GET/SET operations
 * 2. Session storage (JSON objects)
 * 3. Cache with TTL
 * 4. Bulk operations (MGET/MSET)
 * 5. Hash operations (user profiles)
 * 6. List operations (activity feeds)
 * 7. Increment operations (counters/rate limiting)
 * 
 * Requirements:
 * - npm install ioredis
 */

import Redis from 'ioredis';

// ============================================================================
// CONFIGURATION
// ============================================================================

const REDIS_CLOUD_CONFIG = {
  host: 'redis-11432.crce202.eu-west-3-1.ec2.redns.redis-cloud.com',
  port: 11432,
  password: 'cv7qij6GjYrg9SnOJ8BSl7NNnplEfgcs',
  name: 'Redis Cloud',
  tls: {} // Redis Cloud requires TLS
};

const SELF_HOSTED_CONFIG = {
  host: '10.0.2.4', // Update this with actual Redis container IP
  port: 6379,
  password: null,
  name: 'Self-Hosted'
};

const WARMUP_ITERATIONS = 5;
const TEST_ITERATIONS = 50;
const CLEANUP_AFTER_TEST = true;

// ============================================================================
// UTILITIES
// ============================================================================

function calculateStats(timings) {
  if (!timings || timings.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, total: 0 };
  }
  const sorted = [...timings].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    total: sum
  };
}

function formatDuration(ms) {
  if (ms < 0.01) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1) return `${ms.toFixed(3)}ms`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate realistic Weavink data
function generateContactData() {
  return {
    id: `contact_${Date.now()}_${generateRandomString(8)}`,
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    company: ['Acme Corp', 'Tech Inc', 'StartupXYZ', 'BigCo'][Math.floor(Math.random() * 4)],
    jobTitle: ['CEO', 'CTO', 'Engineer', 'Designer', 'PM'][Math.floor(Math.random() * 5)],
    phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    tags: ['investor', 'partner', 'customer', 'lead'].slice(0, Math.floor(Math.random() * 3) + 1),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function generateSessionData() {
  return {
    userId: `user_${generateRandomString(24)}`,
    email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    name: `User ${Math.floor(Math.random() * 1000)}`,
    role: 'user',
    subscription: 'pro',
    loginAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };
}

// ============================================================================
// BENCHMARK TESTS
// ============================================================================

const TESTS = [
  {
    name: 'Simple SET',
    description: 'Basic key-value write',
    run: async (redis, iteration) => {
      const key = `benchmark:set:${iteration}`;
      const value = generateRandomString(100);
      const start = performance.now();
      await redis.set(key, value);
      return performance.now() - start;
    }
  },
  {
    name: 'Simple GET',
    description: 'Basic key-value read',
    setup: async (redis) => {
      await redis.set('benchmark:get:test', generateRandomString(100));
    },
    run: async (redis, iteration) => {
      const start = performance.now();
      await redis.get('benchmark:get:test');
      return performance.now() - start;
    }
  },
  {
    name: 'SET with TTL (Session)',
    description: 'Write with expiration (session storage)',
    run: async (redis, iteration) => {
      const key = `benchmark:session:${iteration}`;
      const session = JSON.stringify(generateSessionData());
      const start = performance.now();
      await redis.setex(key, 3600, session); // 1 hour TTL
      return performance.now() - start;
    }
  },
  {
    name: 'GET JSON (Session Read)',
    description: 'Read and parse session data',
    setup: async (redis) => {
      const session = JSON.stringify(generateSessionData());
      await redis.setex('benchmark:session:read', 3600, session);
    },
    run: async (redis, iteration) => {
      const start = performance.now();
      const data = await redis.get('benchmark:session:read');
      JSON.parse(data); // Include parse time
      return performance.now() - start;
    }
  },
  {
    name: 'MSET (Bulk Write 10 keys)',
    description: 'Write multiple keys at once',
    run: async (redis, iteration) => {
      const pairs = [];
      for (let i = 0; i < 10; i++) {
        pairs.push(`benchmark:mset:${iteration}:${i}`, generateRandomString(50));
      }
      const start = performance.now();
      await redis.mset(...pairs);
      return performance.now() - start;
    }
  },
  {
    name: 'MGET (Bulk Read 10 keys)',
    description: 'Read multiple keys at once',
    setup: async (redis) => {
      const pairs = [];
      for (let i = 0; i < 10; i++) {
        pairs.push(`benchmark:mget:${i}`, generateRandomString(50));
      }
      await redis.mset(...pairs);
    },
    run: async (redis, iteration) => {
      const keys = Array.from({ length: 10 }, (_, i) => `benchmark:mget:${i}`);
      const start = performance.now();
      await redis.mget(...keys);
      return performance.now() - start;
    }
  },
  {
    name: 'HSET (Contact Profile)',
    description: 'Store contact as hash',
    run: async (redis, iteration) => {
      const key = `benchmark:contact:${iteration}`;
      const contact = generateContactData();
      const start = performance.now();
      await redis.hset(key, contact);
      return performance.now() - start;
    }
  },
  {
    name: 'HGETALL (Read Contact)',
    description: 'Read full contact hash',
    setup: async (redis) => {
      const contact = generateContactData();
      await redis.hset('benchmark:contact:read', contact);
    },
    run: async (redis, iteration) => {
      const start = performance.now();
      await redis.hgetall('benchmark:contact:read');
      return performance.now() - start;
    }
  },
  {
    name: 'LPUSH + LTRIM (Activity Feed)',
    description: 'Add to list and trim (activity feed pattern)',
    run: async (redis, iteration) => {
      const key = `benchmark:feed:${iteration % 10}`; // Reuse some keys
      const activity = JSON.stringify({
        type: 'contact_added',
        contactId: `contact_${iteration}`,
        timestamp: Date.now()
      });
      const start = performance.now();
      await redis.lpush(key, activity);
      await redis.ltrim(key, 0, 99); // Keep last 100 items
      return performance.now() - start;
    }
  },
  {
    name: 'LRANGE (Read Feed)',
    description: 'Read activity feed (last 20 items)',
    setup: async (redis) => {
      const activities = [];
      for (let i = 0; i < 50; i++) {
        activities.push(JSON.stringify({
          type: 'contact_added',
          contactId: `contact_${i}`,
          timestamp: Date.now() - i * 1000
        }));
      }
      await redis.lpush('benchmark:feed:read', ...activities);
    },
    run: async (redis, iteration) => {
      const start = performance.now();
      await redis.lrange('benchmark:feed:read', 0, 19);
      return performance.now() - start;
    }
  },
  {
    name: 'INCR (Rate Limiting)',
    description: 'Increment counter (rate limiting pattern)',
    run: async (redis, iteration) => {
      const key = `benchmark:ratelimit:user:${iteration % 100}`;
      const start = performance.now();
      await redis.incr(key);
      return performance.now() - start;
    }
  },
  {
    name: 'INCR + EXPIRE (Rate Limit Window)',
    description: 'Increment with TTL (sliding window)',
    run: async (redis, iteration) => {
      const key = `benchmark:ratelimit:window:${iteration}`;
      const start = performance.now();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 60); // 1 minute window
      }
      return performance.now() - start;
    }
  },
  {
    name: 'EXISTS Check',
    description: 'Check if key exists (cache check)',
    setup: async (redis) => {
      await redis.set('benchmark:exists:yes', 'value');
    },
    run: async (redis, iteration) => {
      const key = iteration % 2 === 0 ? 'benchmark:exists:yes' : 'benchmark:exists:no';
      const start = performance.now();
      await redis.exists(key);
      return performance.now() - start;
    }
  },
  {
    name: 'DEL (Cache Invalidation)',
    description: 'Delete key (cache invalidation)',
    setup: async (redis) => {
      for (let i = 0; i < TEST_ITERATIONS + WARMUP_ITERATIONS; i++) {
        await redis.set(`benchmark:del:${i}`, 'value');
      }
    },
    run: async (redis, iteration) => {
      const start = performance.now();
      await redis.del(`benchmark:del:${iteration}`);
      return performance.now() - start;
    }
  },
  {
    name: 'Pipeline (5 operations)',
    description: 'Batched operations in pipeline',
    run: async (redis, iteration) => {
      const start = performance.now();
      const pipeline = redis.pipeline();
      pipeline.set(`benchmark:pipe:${iteration}:1`, 'value1');
      pipeline.set(`benchmark:pipe:${iteration}:2`, 'value2');
      pipeline.get(`benchmark:pipe:${iteration}:1`);
      pipeline.incr(`benchmark:pipe:counter:${iteration}`);
      pipeline.expire(`benchmark:pipe:${iteration}:1`, 3600);
      await pipeline.exec();
      return performance.now() - start;
    }
  }
];

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

class BenchmarkRunner {
  constructor() {
    this.results = {};
  }

  async connectRedis(config) {
    const options = {
      host: config.host,
      port: config.port,
      password: config.password,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000
    };

    // Add TLS for Redis Cloud
    if (config.tls) {
      options.tls = config.tls;
    }

    const redis = new Redis(options);

    return new Promise((resolve, reject) => {
      redis.on('connect', () => {
        console.log(`✅ Connected to ${config.name}`);
        resolve(redis);
      });
      redis.on('error', (err) => {
        console.error(`❌ Failed to connect to ${config.name}: ${err.message}`);
        reject(err);
      });
    });
  }

  async runTest(redis, test, dbName) {
    const timings = [];

    // Setup if needed
    if (test.setup) {
      await test.setup(redis);
    }

    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      await test.run(redis, `warmup_${i}`);
    }

    // Actual test
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      const duration = await test.run(redis, i);
      timings.push(duration);
    }

    return calculateStats(timings);
  }

  async runAllTests(redis, dbName) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Running benchmarks for ${dbName}`);
    console.log('='.repeat(70));

    const results = {};

    for (const test of TESTS) {
      process.stdout.write(`  Testing: ${test.name.padEnd(35)}`);

      try {
        const stats = await this.runTest(redis, test, dbName);
        results[test.name] = stats;
        console.log(`✅ Avg: ${formatDuration(stats.avg)}, P95: ${formatDuration(stats.p95)}`);
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        results[test.name] = null;
      }
    }

    return results;
  }

  async cleanup(redis) {
    if (!CLEANUP_AFTER_TEST) return;

    console.log('\n🧹 Cleaning up benchmark keys...');
    const keys = await redis.keys('benchmark:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`   Deleted ${keys.length} keys`);
    }
  }

  printComparison(cloudResults, selfHostedResults) {
    console.log(`\n${'='.repeat(110)}`);
    console.log('📈 BENCHMARK RESULTS COMPARISON');
    console.log('='.repeat(110));

    console.log('\n' + '─'.repeat(110));
    console.log(
      'Test'.padEnd(40) +
      'Redis Cloud'.padEnd(15) +
      'Self-Hosted'.padEnd(15) +
      'Winner'.padEnd(18) +
      'Speedup'
    );
    console.log('─'.repeat(110));

    let cloudWins = 0;
    let selfHostedWins = 0;
    let totalCloudTime = 0;
    let totalSelfHostedTime = 0;

    for (const test of TESTS) {
      const cloudStats = cloudResults[test.name];
      const selfStats = selfHostedResults[test.name];

      if (!cloudStats || !selfStats) {
        console.log(
          test.name.padEnd(40) +
          (cloudStats ? formatDuration(cloudStats.avg) : 'FAILED').padEnd(15) +
          (selfStats ? formatDuration(selfStats.avg) : 'FAILED').padEnd(15) +
          'N/A'.padEnd(18) +
          'N/A'
        );
        continue;
      }

      totalCloudTime += cloudStats.avg;
      totalSelfHostedTime += selfStats.avg;

      const winner = selfStats.avg < cloudStats.avg ? 'Self-Hosted' : 'Redis Cloud';
      const speedup = selfStats.avg < cloudStats.avg
        ? `${(cloudStats.avg / selfStats.avg).toFixed(1)}x`
        : `${(selfStats.avg / cloudStats.avg).toFixed(1)}x`;

      if (winner === 'Self-Hosted') selfHostedWins++;
      else cloudWins++;

      const winnerIcon = winner === 'Self-Hosted' ? '🥇' : '🏆';

      console.log(
        test.name.padEnd(40) +
        formatDuration(cloudStats.avg).padEnd(15) +
        formatDuration(selfStats.avg).padEnd(15) +
        `${winnerIcon} ${winner}`.padEnd(22) +
        speedup
      );
    }

    console.log('─'.repeat(110));

    // Detailed stats
    console.log('\n' + '─'.repeat(110));
    console.log('DETAILED STATISTICS (Min / P50 / P95 / P99 / Max)');
    console.log('─'.repeat(110));

    for (const test of TESTS) {
      const cloudStats = cloudResults[test.name];
      const selfStats = selfHostedResults[test.name];

      if (!cloudStats || !selfStats) continue;

      console.log(`\n${test.name}:`);
      console.log(
        '  Redis Cloud:  '.padEnd(18) +
        `${formatDuration(cloudStats.min)} / ${formatDuration(cloudStats.p50)} / ${formatDuration(cloudStats.p95)} / ${formatDuration(cloudStats.p99)} / ${formatDuration(cloudStats.max)}`
      );
      console.log(
        '  Self-Hosted:  '.padEnd(18) +
        `${formatDuration(selfStats.min)} / ${formatDuration(selfStats.p50)} / ${formatDuration(selfStats.p95)} / ${formatDuration(selfStats.p99)} / ${formatDuration(selfStats.max)}`
      );
    }

    // Summary
    console.log('\n' + '─'.repeat(110));
    console.log('\n📊 SUMMARY');
    console.log('─'.repeat(110));
    console.log(`Redis Cloud wins: ${cloudWins} tests`);
    console.log(`Self-Hosted wins: ${selfHostedWins} tests`);

    const overallWinner = selfHostedWins > cloudWins ? 'Self-Hosted' : 'Redis Cloud';
    const avgSpeedup = totalCloudTime / totalSelfHostedTime;

    console.log(`\n🏆 Overall winner: ${overallWinner}`);
    console.log(`Average latency - Redis Cloud: ${formatDuration(totalCloudTime / TESTS.length)}`);
    console.log(`Average latency - Self-Hosted: ${formatDuration(totalSelfHostedTime / TESTS.length)}`);
    console.log(`Overall speedup: ${avgSpeedup.toFixed(1)}x faster`);

    // Throughput estimation
    const cloudOpsPerSec = 1000 / (totalCloudTime / TESTS.length);
    const selfHostedOpsPerSec = 1000 / (totalSelfHostedTime / TESTS.length);

    console.log(`\nEstimated throughput:`);
    console.log(`  Redis Cloud:  ~${Math.floor(cloudOpsPerSec).toLocaleString()} ops/sec`);
    console.log(`  Self-Hosted:  ~${Math.floor(selfHostedOpsPerSec).toLocaleString()} ops/sec`);

    // Recommendations
    console.log('\n' + '─'.repeat(110));
    console.log('💡 RECOMMENDATIONS');
    console.log('─'.repeat(110));

    if (overallWinner === 'Self-Hosted') {
      console.log('✅ Self-hosted Redis is significantly faster.');
      console.log('   - Sub-millisecond latency for most operations');
      console.log('   - Better suited for latency-sensitive caching');
      console.log('   - No additional cost (included in VPS)');
      console.log('   - Keep the self-hosted setup');
    } else {
      console.log('✅ Redis Cloud is performing better.');
      console.log('   - Consider the managed service benefits');
      console.log('   - Automatic failover and backups');
    }

    console.log('\n💰 COST COMPARISON:');
    console.log('   Redis Cloud: €5-25/month (depending on plan)');
    console.log('   Self-Hosted: €0/month (included in VPS)');
    console.log(`   Annual savings: €60-300/year`);

    console.log('\n🔧 USE CASE IMPACT:');
    console.log('   Session storage: Each page load hits Redis');
    console.log('   Rate limiting: Multiple Redis calls per request');
    console.log('   Caching: Contact data, API responses, etc.');
    console.log(`   With ${avgSpeedup.toFixed(0)}x speedup, your app will feel noticeably faster.`);

    console.log('\n' + '='.repeat(110));
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Redis Benchmark: Redis Cloud vs Self-Hosted');
  console.log('='.repeat(70));
  console.log(`Warmup iterations: ${WARMUP_ITERATIONS}`);
  console.log(`Test iterations per operation: ${TEST_ITERATIONS}`);
  console.log(`Total tests: ${TESTS.length}`);

  const runner = new BenchmarkRunner();

  let cloudRedis = null;
  let selfHostedRedis = null;

  try {
    // Connect to both Redis instances
    console.log('\n📡 Connecting to Redis instances...');

    try {
      cloudRedis = await runner.connectRedis(REDIS_CLOUD_CONFIG);
    } catch (err) {
      console.error('Failed to connect to Redis Cloud:', err.message);
    }

    try {
      selfHostedRedis = await runner.connectRedis(SELF_HOSTED_CONFIG);
    } catch (err) {
      console.error('Failed to connect to Self-Hosted Redis:', err.message);
      console.log('\n💡 To find the correct Redis IP, run:');
      console.log('   docker inspect $(docker ps -q -f name=redis) | grep IPAddress');
    }

    if (!cloudRedis || !selfHostedRedis) {
      console.error('\n❌ Cannot proceed without both Redis connections.');
      process.exit(1);
    }

    // Verify connections with PING
    console.log('\n🏓 Testing connections...');
    const cloudPing = await cloudRedis.ping();
    console.log(`   Redis Cloud: ${cloudPing}`);
    const selfHostedPing = await selfHostedRedis.ping();
    console.log(`   Self-Hosted: ${selfHostedPing}`);

    // Run benchmarks
    const cloudResults = await runner.runAllTests(cloudRedis, REDIS_CLOUD_CONFIG.name);
    const selfHostedResults = await runner.runAllTests(selfHostedRedis, SELF_HOSTED_CONFIG.name);

    // Print comparison
    runner.printComparison(cloudResults, selfHostedResults);

    // Cleanup
    await runner.cleanup(cloudRedis);
    await runner.cleanup(selfHostedRedis);

    console.log('\n✅ Benchmark complete!');

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connections
    if (cloudRedis) {
      await cloudRedis.quit();
    }
    if (selfHostedRedis) {
      await selfHostedRedis.quit();
    }
  }
}

main();
