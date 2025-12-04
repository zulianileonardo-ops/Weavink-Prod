#!/usr/bin/env node
// scripts/benchmark-rerankers.mjs
// Benchmark reranker models: BGE, Jina vs Cohere
//
// Usage:
//   node scripts/benchmark-rerankers.mjs [options]
//
// Options:
//   --embed-server=URL           Embed server URL (default: http://localhost:5555)
//   --regenerate-baseline        Force regeneration of Cohere baseline cache
//   --warmup                     Pre-load models before benchmarking
//   --quick                      Quick mode: fewer iterations
//
// Environment variables:
//   EMBED_SERVER_URL             Python embed server (default: http://localhost:5555)
//   COHERE_API_KEY               Cohere API key (for baseline)

import { CohereClient } from 'cohere-ai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get script directory for cache file path
const __dirname = dirname(fileURLToPath(import.meta.url));
const COHERE_RERANK_CACHE_PATH = join(__dirname, 'cohere-rerank-cache.json');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_EMBED_SERVER_URL = 'http://localhost:5555';
function getEmbedServerUrl() {
  return process.env.EMBED_SERVER_URL || DEFAULT_EMBED_SERVER_URL;
}

// Reranker models to benchmark
const RERANKER_MODELS = {
  'bge-base': {
    name: 'BAAI/bge-reranker-base',
    method: 'fastembed',
  },
  'jina-v2-multi': {
    name: 'jinaai/jina-reranker-v2-base-multilingual',
    method: 'sentence-transformers',
    trust_remote_code: true,
  },
};

// Test corpus (20 realistic contacts) - same as embedding benchmark
const TEST_CORPUS = [
  { id: 1, name: 'John Smith', text: 'John Smith - Senior React Developer at Google, 10 years JavaScript experience. Met at ReactConf 2024. Interested in performance optimization.' },
  { id: 2, name: 'Sarah Chen', text: 'Sarah Chen - Data Scientist at Meta, ML/AI specialist, Python expert. PhD in Machine Learning from Stanford. Working on recommendation systems.' },
  { id: 3, name: 'Carlos Rodriguez', text: 'Carlos Rodriguez - Backend Engineer, Node.js and PostgreSQL. Previously at Stripe. Expertise in payment systems and API design.' },
  { id: 4, name: 'Priya Patel', text: 'Priya Patel - DevOps Engineer at Amazon AWS, Kubernetes and Terraform expert. Cloud architecture specialist.' },
  { id: 5, name: 'Marie Dupont', text: 'Marie Dupont - Marketing Director, B2B SaaS, Fortune 500 campaigns. French native, fluent English. Growth hacking expertise.' },
  { id: 6, name: 'Michael Brown', text: 'Michael Brown - VP Sales at Salesforce, enterprise sales, 15 years experience. Built sales teams from 5 to 200 people.' },
  { id: 7, name: 'Lisa Wagner', text: 'Lisa Wagner - HR Director, talent acquisition, employee engagement. Built recruiting pipeline at 3 unicorn startups.' },
  { id: 8, name: 'Pierre Martin', text: 'Pierre Martin - CTO at Capgemini, cloud architecture and DevOps. Former Google engineer. Speaks at KubeCon.' },
  { id: 9, name: 'Jennifer Lee', text: 'Jennifer Lee - CEO at TechStartup Inc, former McKinsey consultant. Y Combinator W22 batch. Focus on AI products.' },
  { id: 10, name: 'David Kim', text: 'David Kim - CFO at Fintech Corp, 20 years finance experience. Goldman Sachs alum. IPO specialist.' },
  { id: 11, name: 'Emma Johnson', text: 'Emma Johnson - UX Designer, Figma expert, user research specialist. Led design system at Airbnb. Published in UX Collective.' },
  { id: 12, name: 'Alex Turner', text: 'Alex Turner - Product Manager at Spotify, data-driven PM. Previously at Netflix. Expertise in A/B testing.' },
  { id: 13, name: 'Ahmed Hassan', text: 'Ahmed Hassan - iOS Developer, Swift and Objective-C, 8 years mobile. Built apps with 10M+ downloads. Apple WWDC speaker.' },
  { id: 14, name: 'Yuki Tanaka', text: 'Yuki Tanaka - Blockchain Developer, Solidity and Rust. Built DeFi protocols. Core contributor to Ethereum.' },
  { id: 15, name: 'Sofia Garcia', text: 'Sofia Garcia - AI Research Scientist at OpenAI, NLP specialist. Co-authored GPT papers. MIT PhD.' },
  { id: 16, name: 'Robert Chen', text: 'Robert Chen - Partner at Sequoia Capital, Series A/B investments. Focus on B2B SaaS and AI. Board member at 12 companies.' },
  { id: 17, name: 'Anna Schmidt', text: 'Anna Schmidt - Angel Investor, 50+ startup investments. Former founder (exit to Google). Advisor to Y Combinator.' },
  { id: 18, name: 'François Dubois', text: 'François Dubois - Directeur Commercial chez L\'Oréal, 15 ans d\'expérience en ventes B2B. Basé à Paris. Parle anglais couramment.' },
  { id: 19, name: 'Hans Mueller', text: 'Hans Mueller - Geschäftsführer bei BMW Digital, Automotive Tech. 20 Jahre Erfahrung in der Automobilindustrie.' },
  { id: 20, name: 'Mei Lin', text: 'Mei Lin - 阿里巴巴产品总监, 10年电商经验. 专注于跨境电商和支付系统. Also fluent in English.' },
];

// Test queries (subset for reranker benchmark - 50 diverse queries)
const TEST_QUERIES = [
  // Role-based
  { query: 'React frontend developer', expectedTop3: [1, 3, 13], category: 'role' },
  { query: 'backend engineer Node.js', expectedTop3: [3, 4, 1], category: 'role' },
  { query: 'data scientist machine learning', expectedTop3: [2, 15, 12], category: 'role' },
  { query: 'DevOps infrastructure engineer', expectedTop3: [4, 8, 3], category: 'role' },
  { query: 'UX UI designer', expectedTop3: [11, 12, 5], category: 'role' },
  { query: 'développeur frontend React', expectedTop3: [1, 3, 13], category: 'role' },

  // Skill-based
  { query: 'Python programming expert', expectedTop3: [2, 15, 3], category: 'skill' },
  { query: 'JavaScript TypeScript developer', expectedTop3: [1, 3, 13], category: 'skill' },
  { query: 'Kubernetes container orchestration', expectedTop3: [4, 8, 3], category: 'skill' },
  { query: 'machine learning deep learning', expectedTop3: [2, 15, 12], category: 'skill' },

  // Expertise
  { query: 'someone who can help with fundraising', expectedTop3: [16, 17, 10], category: 'expertise' },
  { query: 'expert in scaling startups', expectedTop3: [17, 9, 16], category: 'expertise' },
  { query: 'blockchain smart contracts specialist', expectedTop3: [14, 3, 15], category: 'expertise' },
  { query: 'growth hacking marketing specialist', expectedTop3: [5, 6, 9], category: 'expertise' },

  // Company
  { query: 'people from Google', expectedTop3: [1, 8, 17], category: 'company' },
  { query: 'worked at Meta Facebook', expectedTop3: [2, 1, 15], category: 'company' },
  { query: 'Amazon AWS experience', expectedTop3: [4, 3, 8], category: 'company' },
  { query: 'Y Combinator alumni', expectedTop3: [9, 17, 16], category: 'company' },

  // Industry
  { query: 'fintech financial technology', expectedTop3: [10, 3, 14], category: 'industry' },
  { query: 'automotive car industry', expectedTop3: [19, 8, 4], category: 'industry' },
  { query: 'e-commerce online retail', expectedTop3: [20, 5, 12], category: 'industry' },
  { query: 'SaaS software as a service', expectedTop3: [5, 16, 9], category: 'industry' },

  // Leadership
  { query: 'CEO founder startup', expectedTop3: [9, 17, 8], category: 'leadership' },
  { query: 'CTO technical leader', expectedTop3: [8, 4, 3], category: 'leadership' },
  { query: 'investor venture capital partner', expectedTop3: [16, 17, 10], category: 'leadership' },
  { query: 'board member advisor', expectedTop3: [16, 17, 9], category: 'leadership' },

  // Language
  { query: 'French speaking contacts', expectedTop3: [18, 5, 8], category: 'language' },
  { query: 'speaks German fluently', expectedTop3: [19, 7, 17], category: 'language' },
  { query: 'Chinese Mandarin speaker', expectedTop3: [20, 2, 15], category: 'language' },
  { query: 'contacts francophones', expectedTop3: [18, 5, 8], category: 'language' },

  // Technical
  { query: 'API development REST GraphQL', expectedTop3: [3, 4, 1], category: 'technical' },
  { query: 'cloud architecture AWS Azure', expectedTop3: [4, 8, 3], category: 'technical' },
  { query: 'microservices distributed systems', expectedTop3: [3, 4, 8], category: 'technical' },

  // Edge cases - Typos
  { query: 'developper react', expectedTop3: [1, 3, 13], category: 'edge_typo' },
  { query: 'devops engeneer', expectedTop3: [4, 8, 3], category: 'edge_typo' },
  { query: 'machien learning', expectedTop3: [2, 15, 12], category: 'edge_typo' },

  // Edge cases - Vague
  { query: 'tech', expectedTop3: [1, 3, 4], category: 'edge_vague' },
  { query: 'marketing', expectedTop3: [5, 6, 7], category: 'edge_vague' },
  { query: 'AI', expectedTop3: [2, 15, 9], category: 'edge_vague' },

  // Edge cases - Natural language
  { query: 'who can build me a mobile app', expectedTop3: [13, 1, 3], category: 'edge_natural' },
  { query: 'I need someone to redesign our website', expectedTop3: [11, 1, 12], category: 'edge_natural' },
  { query: 'looking for a technical cofounder', expectedTop3: [8, 4, 3], category: 'edge_natural' },
  { query: 'need help with our pitch deck', expectedTop3: [17, 16, 9], category: 'edge_natural' },

  // French queries
  { query: 'développeur backend Python', expectedTop3: [2, 3, 4], category: 'french' },
  { query: 'expert marketing digital', expectedTop3: [5, 6, 12], category: 'french' },
  { query: 'investisseur startup tech', expectedTop3: [16, 17, 10], category: 'french' },
  { query: 'directeur technique cloud', expectedTop3: [8, 4, 3], category: 'french' },
];

// ============================================================================
// Cohere Client
// ============================================================================

let cohereClient = null;
function getCohere() {
  if (!cohereClient && process.env.COHERE_API_KEY) {
    cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return cohereClient;
}

// ============================================================================
// Reranker Functions
// ============================================================================

/**
 * Rerank documents using the Python embed server
 */
async function rerankWithServer(method, modelName, query, documents, options = {}) {
  const url = `${getEmbedServerUrl()}/rerank`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method,
      model: modelName,
      query,
      documents,
      trust_remote_code: options.trust_remote_code || false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Rerank failed: ${error}`);
  }

  return response.json();
}

/**
 * Rerank documents using Cohere API
 */
async function rerankWithCohere(query, documents) {
  const cohere = getCohere();
  if (!cohere) throw new Error('COHERE_API_KEY not set');

  const response = await cohere.rerank({
    query,
    documents,
    model: 'rerank-v3.5',
    topN: documents.length,
    returnDocuments: false,
  });

  return {
    results: response.results.map(r => ({
      index: r.index,
      score: r.relevanceScore,
      document: documents[r.index],
    })),
    latency_ms: 0, // Cohere doesn't return latency
  };
}

// ============================================================================
// Cohere Baseline Caching
// ============================================================================

function saveCohereRerankCache(baseline) {
  try {
    const cacheData = {
      version: 1,
      timestamp: new Date().toISOString(),
      queryCount: TEST_QUERIES.length,
      corpusCount: TEST_CORPUS.length,
      rankings: baseline.rankings,
    };
    writeFileSync(COHERE_RERANK_CACHE_PATH, JSON.stringify(cacheData, null, 2));
    console.log(`  💾 Cached Cohere rerank baseline to ${COHERE_RERANK_CACHE_PATH}`);
    return true;
  } catch (err) {
    console.log(`  ⚠️ Failed to cache baseline: ${err.message}`);
    return false;
  }
}

function loadCohereRerankCache() {
  try {
    if (!existsSync(COHERE_RERANK_CACHE_PATH)) {
      return null;
    }

    const cacheData = JSON.parse(readFileSync(COHERE_RERANK_CACHE_PATH, 'utf8'));

    // Validate cache matches current test data
    if (cacheData.queryCount !== TEST_QUERIES.length || cacheData.corpusCount !== TEST_CORPUS.length) {
      console.log(`  ⚠️ Cache invalid: query/corpus count mismatch`);
      return null;
    }

    console.log(`  📂 Loaded Cohere rerank baseline from cache (${cacheData.timestamp})`);
    return cacheData;
  } catch (err) {
    console.log(`  ⚠️ Failed to load cache: ${err.message}`);
    return null;
  }
}

async function generateCohereBaseline(forceRegenerate = false) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`  📏 LOADING COHERE RERANK BASELINE...`);

  // Try to load from cache first
  if (!forceRegenerate) {
    const cached = loadCohereRerankCache();
    if (cached) {
      return { available: true, rankings: cached.rankings, cached: true };
    }
    console.log(`  No valid cache found, generating fresh baseline...`);
  } else {
    console.log(`  Force regeneration requested...`);
  }

  // Check Cohere availability
  const cohere = getCohere();
  if (!cohere) {
    console.log(`  ❌ Cohere not available: COHERE_API_KEY not set`);
    return { available: false, error: 'COHERE_API_KEY not set' };
  }

  const corpusTexts = TEST_CORPUS.map(c => c.text);
  const rankings = {};

  console.log(`  Generating rankings for ${TEST_QUERIES.length} queries...`);

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const queryObj = TEST_QUERIES[i];
    try {
      const result = await rerankWithCohere(queryObj.query, corpusTexts);
      rankings[queryObj.query] = result.results.map(r => ({
        index: r.index,
        score: r.score,
        name: TEST_CORPUS[r.index].name,
      }));

      if ((i + 1) % 10 === 0) {
        console.log(`  📦 Progress: ${i + 1}/${TEST_QUERIES.length} queries...`);
      }
    } catch (err) {
      console.log(`  ❌ Failed query "${queryObj.query}": ${err.message}`);
      return { available: false, error: err.message };
    }
  }

  const baseline = { available: true, rankings, cached: false };
  saveCohereRerankCache(baseline);

  // Show sample rankings
  console.log(`\n  Cohere baseline rankings (sample):`);
  const samplesToShow = Math.min(5, TEST_QUERIES.length);
  for (let i = 0; i < samplesToShow; i++) {
    const query = TEST_QUERIES[i].query;
    const top3 = rankings[query].slice(0, 3).map(r => r.name);
    console.log(`    "${query}" → [${top3.join(', ')}]`);
  }

  return baseline;
}

// ============================================================================
// Quality Metrics
// ============================================================================

/**
 * Calculate Top-K Recall vs Cohere baseline
 */
function calculateRecall(modelRanking, cohereRanking, k = 3) {
  const modelTopK = new Set(modelRanking.slice(0, k).map(r => r.index));
  const cohereTopK = new Set(cohereRanking.slice(0, k).map(r => r.index));

  let matches = 0;
  for (const idx of modelTopK) {
    if (cohereTopK.has(idx)) matches++;
  }

  return matches / k;
}

/**
 * Calculate NDCG@K
 */
function calculateNDCG(modelRanking, cohereRanking, k = 10) {
  // Create relevance scores based on Cohere ranking position
  const relevance = {};
  cohereRanking.forEach((r, pos) => {
    relevance[r.index] = cohereRanking.length - pos; // Higher score for higher rank
  });

  // Calculate DCG for model ranking
  let dcg = 0;
  for (let i = 0; i < Math.min(k, modelRanking.length); i++) {
    const rel = relevance[modelRanking[i].index] || 0;
    dcg += rel / Math.log2(i + 2);
  }

  // Calculate ideal DCG (Cohere's ranking)
  let idcg = 0;
  for (let i = 0; i < Math.min(k, cohereRanking.length); i++) {
    const rel = relevance[cohereRanking[i].index] || 0;
    idcg += rel / Math.log2(i + 2);
  }

  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Calculate Spearman rank correlation
 */
function calculateSpearman(modelRanking, cohereRanking) {
  const n = Math.min(modelRanking.length, cohereRanking.length);
  if (n < 2) return 0;

  // Create rank maps
  const modelRanks = {};
  const cohereRanks = {};
  modelRanking.forEach((r, i) => { modelRanks[r.index] = i + 1; });
  cohereRanking.forEach((r, i) => { cohereRanks[r.index] = i + 1; });

  // Calculate sum of squared rank differences
  let sumD2 = 0;
  for (const r of cohereRanking) {
    const modelRank = modelRanks[r.index] || n + 1;
    const cohereRank = cohereRanks[r.index];
    sumD2 += Math.pow(modelRank - cohereRank, 2);
  }

  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

// ============================================================================
// Benchmark Functions
// ============================================================================

async function checkServerAvailable() {
  try {
    const response = await fetch(`${getEmbedServerUrl()}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function warmupRerankers(models) {
  console.log(`\n  🔥 WARMING UP RERANKERS...`);

  const rerankers = Object.entries(models).map(([id, config]) => ({
    method: config.method,
    model: config.name,
    trust_remote_code: config.trust_remote_code || false,
  }));

  try {
    const response = await fetch(`${getEmbedServerUrl()}/warmup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rerankers }),
    });

    if (response.ok) {
      const results = await response.json();
      for (const [key, result] of Object.entries(results)) {
        if (result.success) {
          console.log(`  ✅ ${key}: loaded in ${result.load_time_ms}ms`);
        } else {
          console.log(`  ⚠️ ${key}: ${result.error}`);
        }
      }
    }
  } catch (err) {
    console.log(`  ⚠️ Warmup failed: ${err.message}`);
  }
}

async function benchmarkReranker(modelId, modelConfig, cohereBaseline, iterations = 3) {
  const corpusTexts = TEST_CORPUS.map(c => c.text);
  const latencies = [];
  const qualityResults = [];

  console.log(`\n  Testing ${modelId}...`);

  for (let iter = 0; iter < iterations; iter++) {
    for (const queryObj of TEST_QUERIES) {
      try {
        const start = performance.now();
        const result = await rerankWithServer(
          modelConfig.method,
          modelConfig.name,
          queryObj.query,
          corpusTexts,
          { trust_remote_code: modelConfig.trust_remote_code }
        );
        const elapsed = performance.now() - start;
        latencies.push(elapsed);

        // Calculate quality metrics on first iteration only
        if (iter === 0 && cohereBaseline.rankings[queryObj.query]) {
          const cohereRanking = cohereBaseline.rankings[queryObj.query];
          qualityResults.push({
            query: queryObj.query,
            category: queryObj.category,
            recall: calculateRecall(result.results, cohereRanking, 3),
            ndcg: calculateNDCG(result.results, cohereRanking, 10),
            spearman: calculateSpearman(result.results, cohereRanking),
          });
        }
      } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
        return { available: false, error: err.message };
      }
    }
    process.stdout.write('.');
  }
  console.log('');

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const stats = {
    avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
    p99: latencies[Math.floor(latencies.length * 0.99)],
  };

  // Calculate average quality metrics
  const avgRecall = qualityResults.reduce((a, b) => a + b.recall, 0) / qualityResults.length;
  const avgNdcg = qualityResults.reduce((a, b) => a + b.ndcg, 0) / qualityResults.length;
  const avgSpearman = qualityResults.reduce((a, b) => a + b.spearman, 0) / qualityResults.length;

  console.log(`  ✅ ${latencies.length} reranks | Avg: ${stats.avg.toFixed(1)}ms | P95: ${stats.p95.toFixed(1)}ms`);
  console.log(`  📊 Recall@3: ${(avgRecall * 100).toFixed(0)}% | NDCG@10: ${avgNdcg.toFixed(2)} | Spearman: ${avgSpearman.toFixed(2)}`);

  return {
    available: true,
    stats,
    quality: {
      recall: avgRecall,
      ndcg: avgNdcg,
      spearman: avgSpearman,
    },
    qualityByCategory: groupByCategory(qualityResults),
  };
}

function groupByCategory(qualityResults) {
  const categories = {};
  for (const result of qualityResults) {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
  }

  const summary = {};
  for (const [cat, results] of Object.entries(categories)) {
    summary[cat] = {
      recall: results.reduce((a, b) => a + b.recall, 0) / results.length,
      ndcg: results.reduce((a, b) => a + b.ndcg, 0) / results.length,
      spearman: results.reduce((a, b) => a + b.spearman, 0) / results.length,
      count: results.length,
    };
  }
  return summary;
}

// ============================================================================
// Output Formatting
// ============================================================================

function printComparisonTable(results) {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  📊 RERANKER COMPARISON`);
  console.log(`${'═'.repeat(100)}`);
  console.log(`  ${'Model'.padEnd(35)} │ ${'Latency'.padStart(10)} │ ${'Recall@3'.padStart(10)} │ ${'NDCG@10'.padStart(10)} │ ${'Spearman'.padStart(10)}`);
  console.log(`${'─'.repeat(100)}`);

  // Cohere baseline row
  console.log(`  ${'Cohere rerank-v3.5 (baseline)'.padEnd(35)} │ ${'N/A'.padStart(10)} │ ${'100%★'.padStart(10)} │ ${'1.00★'.padStart(10)} │ ${'1.00★'.padStart(10)}`);

  // Model rows
  for (const [modelId, result] of Object.entries(results)) {
    if (!result.available) {
      console.log(`  ${modelId.padEnd(35)} │ ${'❌ N/A'.padStart(10)} │ ${'❌ N/A'.padStart(10)} │ ${'❌ N/A'.padStart(10)} │ ${'❌ N/A'.padStart(10)}`);
      continue;
    }

    const latency = `${result.stats.avg.toFixed(0)}ms`;
    const recall = `${(result.quality.recall * 100).toFixed(0)}%`;
    const ndcg = result.quality.ndcg.toFixed(2);
    const spearman = result.quality.spearman.toFixed(2);

    console.log(`  ${modelId.padEnd(35)} │ ${latency.padStart(10)} │ ${recall.padStart(10)} │ ${ndcg.padStart(10)} │ ${spearman.padStart(10)}`);
  }

  console.log(`${'═'.repeat(100)}`);
}

function printCategoryBreakdown(results) {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  📊 QUALITY BY CATEGORY`);
  console.log(`${'═'.repeat(100)}`);

  // Get all categories
  const categories = new Set();
  for (const result of Object.values(results)) {
    if (result.available && result.qualityByCategory) {
      for (const cat of Object.keys(result.qualityByCategory)) {
        categories.add(cat);
      }
    }
  }

  // Header
  const modelIds = Object.keys(results);
  console.log(`  ${'Category'.padEnd(20)} │ ${modelIds.map(m => m.padStart(20)).join(' │ ')}`);
  console.log(`${'─'.repeat(100)}`);

  // Rows
  for (const cat of Array.from(categories).sort()) {
    const values = modelIds.map(modelId => {
      const result = results[modelId];
      if (!result.available || !result.qualityByCategory || !result.qualityByCategory[cat]) {
        return 'N/A'.padStart(20);
      }
      const q = result.qualityByCategory[cat];
      return `${(q.recall * 100).toFixed(0)}%/${q.ndcg.toFixed(2)}`.padStart(20);
    });
    console.log(`  ${cat.padEnd(20)} │ ${values.join(' │ ')}`);
  }

  console.log(`${'═'.repeat(100)}`);
  console.log(`  Format: Recall@3 / NDCG@10`);
}

// ============================================================================
// Main
// ============================================================================

async function runRerankBenchmark(options = {}) {
  const {
    warmup = false,
    regenerateBaseline = false,
    quick = false,
  } = options;

  const iterations = quick ? 1 : 3;

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  🔄 RERANKER BENCHMARK`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`  Models: ${Object.keys(RERANKER_MODELS).join(', ')}, Cohere rerank-v3.5`);
  console.log(`  Queries: ${TEST_QUERIES.length}`);
  console.log(`  Corpus: ${TEST_CORPUS.length} documents`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Embed server: ${getEmbedServerUrl()}`);
  console.log(`${'─'.repeat(80)}`);

  // Check server availability
  const serverAvailable = await checkServerAvailable();
  if (!serverAvailable) {
    console.log(`\n  ⚠️ Embed server not available at ${getEmbedServerUrl()}`);
    console.log(`     Run: python scripts/embed-server.py --port 5555`);
    console.log(`${'─'.repeat(80)}`);
  }

  // Generate Cohere baseline
  const cohereBaseline = await generateCohereBaseline(regenerateBaseline);
  if (!cohereBaseline.available) {
    console.log(`\n  ❌ Cannot run benchmark without Cohere baseline`);
    return;
  }

  // Warmup if requested
  if (warmup && serverAvailable) {
    await warmupRerankers(RERANKER_MODELS);
  }

  // Benchmark each model
  const results = {};
  for (const [modelId, modelConfig] of Object.entries(RERANKER_MODELS)) {
    if (!serverAvailable) {
      results[modelId] = { available: false, error: 'Server not available' };
      continue;
    }
    results[modelId] = await benchmarkReranker(modelId, modelConfig, cohereBaseline, iterations);
  }

  // Print results
  printComparisonTable(results);
  printCategoryBreakdown(results);

  return results;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--embed-server=')) {
      process.env.EMBED_SERVER_URL = arg.split('=')[1];
    } else if (arg === '--regenerate-baseline') {
      options.regenerateBaseline = true;
    } else if (arg === '--warmup') {
      options.warmup = true;
    } else if (arg === '--quick') {
      options.quick = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/benchmark-rerankers.mjs [options]

Options:
  --embed-server=URL       Embed server URL (default: ${getEmbedServerUrl()})
  --regenerate-baseline    Force regeneration of Cohere baseline cache
  --warmup                 Pre-load models before benchmarking
  --quick                  Quick mode: 1 iteration (default: 3)

Examples:
  # Run full benchmark with warmup
  node scripts/benchmark-rerankers.mjs --warmup

  # Quick test
  node scripts/benchmark-rerankers.mjs --quick --warmup

  # Regenerate Cohere baseline
  COHERE_API_KEY=xxx node scripts/benchmark-rerankers.mjs --regenerate-baseline
`);
      process.exit(0);
    }
  }

  runRerankBenchmark(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Benchmark failed:', err);
      process.exit(1);
    });
}
