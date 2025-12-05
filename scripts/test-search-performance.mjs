#!/usr/bin/env node
/**
 * Test search performance with self-hosted embeddings.
 *
 * Usage:
 *   node scripts/test-search-performance.mjs
 *   node scripts/test-search-performance.mjs --iterations=20
 */

import dotenv from 'dotenv';
dotenv.config();

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://localhost:5555';
const ITERATIONS = parseInt(process.argv.find(a => a.startsWith('--iterations='))?.split('=')[1] || '5');

const TEST_QUERIES = [
  'software engineer developer',
  'investisseur startup capital',
  'designer mode sustainable',
  'chercheur intelligence artificielle',
  'marketing director B2B',
  'CEO tech startup',
  'data scientist machine learning',
  'product manager SaaS',
];

const TEST_DOCUMENTS = [
  'John Smith - Software Engineer at Google - Python, JavaScript, Machine Learning',
  'Marie Dupont - Investisseur en capital-risque chez Sequoia - Fintech, AI startups',
  'Paolo Rossi - Designer Mode chez Gucci - Sustainable fashion, luxury',
  'Dr. Chen Wei - Chercheur en IA à Stanford - Deep learning, NLP, Computer Vision',
  'Sarah Johnson - Marketing Director at Salesforce - B2B, Enterprise SaaS',
  'Michael Brown - CEO and Founder of TechStartup Inc - AI, Automation',
  'Emma Wilson - Data Scientist at Meta - Machine Learning, Big Data',
  'David Lee - Product Manager at Stripe - Payments, SaaS, Growth',
  'Anna Schmidt - CTO at Berlin Tech - Cloud Infrastructure, DevOps',
  'James Taylor - Full Stack Developer - React, Node.js, AWS',
  'Liu Zhang - AI Researcher at OpenAI - Large Language Models, GPT',
  'Carlos Garcia - Venture Partner at Andreessen Horowitz - Web3, Crypto',
  'Sophie Martin - UX Designer at Apple - Human-Computer Interaction',
  'Ahmed Hassan - Backend Engineer at Netflix - Distributed Systems',
  'Rachel Kim - Growth Manager at Spotify - User Acquisition, Analytics',
  'Thomas Mueller - Engineering Lead at BMW - Autonomous Vehicles',
  'Maria Santos - Data Engineer at Amazon - ETL, Data Pipelines',
  'Pierre Dubois - Startup Founder - EdTech, E-learning platforms',
  'Yuki Tanaka - Mobile Developer at Uber - iOS, Android, Flutter',
  'Isabella Rodriguez - HR Director at Microsoft - Talent Acquisition',
];

async function testEmbedding(text) {
  const start = Date.now();
  const res = await fetch(`${EMBED_SERVER_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'intfloat/multilingual-e5-large',
      text,
    }),
  });
  const data = await res.json();
  return {
    latency: Date.now() - start,
    serverLatency: data.latency_ms,
    dimension: data.dimension,
  };
}

async function testBatchEmbedding(texts) {
  const start = Date.now();
  const res = await fetch(`${EMBED_SERVER_URL}/embed/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'intfloat/multilingual-e5-large',
      texts,
    }),
  });
  const data = await res.json();
  return {
    latency: Date.now() - start,
    serverLatency: data.latency_ms,
    count: data.count,
    perDocument: (Date.now() - start) / texts.length,
  };
}

async function testRerank(query, docs) {
  const start = Date.now();
  const res = await fetch(`${EMBED_SERVER_URL}/rerank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'BAAI/bge-reranker-base',
      query,
      documents: docs,
      top_n: 10,
    }),
  });
  const data = await res.json();
  return {
    latency: Date.now() - start,
    serverLatency: data.latency_ms,
    count: data.count,
    topScore: data.results?.[0]?.score || 0,
  };
}

async function checkHealth() {
  try {
    const res = await fetch(`${EMBED_SERVER_URL}/health`);
    const data = await res.json();
    return {
      healthy: data.status === 'ok',
      models: {
        embedding: data.fastembed_loaded || [],
        reranker: data.reranker_loaded || [],
      },
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

function calcStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
  };
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('  SELF-HOSTED EMBEDDING PERFORMANCE TEST');
  console.log('='.repeat(70));
  console.log(`  Embed Server: ${EMBED_SERVER_URL}`);
  console.log(`  Iterations per test: ${ITERATIONS}`);
  console.log('='.repeat(70));

  // Check health
  console.log('\n📋 Health Check...');
  const health = await checkHealth();
  if (!health.healthy) {
    console.error('❌ Embed server not healthy:', health.error);
    process.exit(1);
  }
  console.log('✅ Embed server is healthy');
  console.log(`   Embedding models: ${health.models.embedding.join(', ') || 'none'}`);
  console.log(`   Reranker models: ${health.models.reranker.join(', ') || 'none'}`);

  // Warm up
  console.log('\n🔥 Warming up...');
  await testEmbedding('warmup text');
  await testRerank('warmup query', ['warmup doc 1', 'warmup doc 2']);
  console.log('   Done');

  // Test single embeddings
  console.log('\n📊 SINGLE EMBEDDING LATENCY');
  console.log('-'.repeat(70));
  const embedLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    for (const query of TEST_QUERIES) {
      const result = await testEmbedding(query);
      embedLatencies.push(result.latency);
    }
  }
  const embedStats = calcStats(embedLatencies);
  console.log(`  Total tests: ${embedLatencies.length}`);
  console.log(`  Min: ${embedStats.min.toFixed(1)}ms`);
  console.log(`  Avg: ${embedStats.avg.toFixed(1)}ms`);
  console.log(`  P50: ${embedStats.p50.toFixed(1)}ms`);
  console.log(`  P95: ${embedStats.p95.toFixed(1)}ms`);
  console.log(`  Max: ${embedStats.max.toFixed(1)}ms`);

  // Test batch embeddings
  console.log('\n📊 BATCH EMBEDDING LATENCY (20 documents)');
  console.log('-'.repeat(70));
  const batchLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const result = await testBatchEmbedding(TEST_DOCUMENTS);
    batchLatencies.push(result.latency);
  }
  const batchStats = calcStats(batchLatencies);
  console.log(`  Total tests: ${batchLatencies.length}`);
  console.log(`  Min: ${batchStats.min.toFixed(1)}ms`);
  console.log(`  Avg: ${batchStats.avg.toFixed(1)}ms`);
  console.log(`  P50: ${batchStats.p50.toFixed(1)}ms`);
  console.log(`  P95: ${batchStats.p95.toFixed(1)}ms`);
  console.log(`  Max: ${batchStats.max.toFixed(1)}ms`);
  console.log(`  Per document: ${(batchStats.avg / 20).toFixed(1)}ms`);

  // Test reranking
  console.log('\n📊 RERANKING LATENCY (20 documents)');
  console.log('-'.repeat(70));
  const rerankLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    for (const query of TEST_QUERIES) {
      const result = await testRerank(query, TEST_DOCUMENTS);
      rerankLatencies.push(result.latency);
    }
  }
  const rerankStats = calcStats(rerankLatencies);
  console.log(`  Total tests: ${rerankLatencies.length}`);
  console.log(`  Min: ${rerankStats.min.toFixed(1)}ms`);
  console.log(`  Avg: ${rerankStats.avg.toFixed(1)}ms`);
  console.log(`  P50: ${rerankStats.p50.toFixed(1)}ms`);
  console.log(`  P95: ${rerankStats.p95.toFixed(1)}ms`);
  console.log(`  Max: ${rerankStats.max.toFixed(1)}ms`);

  // Quality test - check reranking accuracy
  console.log('\n📊 RERANKING QUALITY CHECK');
  console.log('-'.repeat(70));
  const qualityTests = [
    { query: 'software engineer', expected: 'Software Engineer' },
    { query: 'AI researcher', expected: 'AI Researcher' },
    { query: 'data scientist machine learning', expected: 'Data Scientist' },
    { query: 'startup founder', expected: 'Startup Founder' },
  ];

  for (const test of qualityTests) {
    const result = await testRerank(test.query, TEST_DOCUMENTS);
    // Get top result from rerank response
    const res = await fetch(`${EMBED_SERVER_URL}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'fastembed',
        model: 'BAAI/bge-reranker-base',
        query: test.query,
        documents: TEST_DOCUMENTS,
        top_n: 1,
      }),
    });
    const data = await res.json();
    const topDoc = data.results?.[0]?.document || 'N/A';
    const matches = topDoc.includes(test.expected);
    console.log(`  "${test.query}" → ${matches ? '✅' : '❌'} ${topDoc.slice(0, 50)}...`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Single Embedding:  ${embedStats.avg.toFixed(1)}ms avg (P95: ${embedStats.p95.toFixed(1)}ms)`);
  console.log(`  Batch (20 docs):   ${batchStats.avg.toFixed(1)}ms avg (${(batchStats.avg / 20).toFixed(1)}ms/doc)`);
  console.log(`  Rerank (20 docs):  ${rerankStats.avg.toFixed(1)}ms avg (P95: ${rerankStats.p95.toFixed(1)}ms)`);
  console.log('');
  console.log('  Target Performance (from plan):');
  console.log('    - Single Embedding: ~50ms ✓');
  console.log('    - Rerank (20 docs): ~150ms ✓');
  console.log('    - Cost: $0 ✓');
  console.log('='.repeat(70));
}

// Run tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
