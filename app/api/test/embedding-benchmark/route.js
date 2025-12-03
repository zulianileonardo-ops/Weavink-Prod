// app/api/test/embedding-benchmark/route.js
// API endpoint to benchmark embedding providers across multiple models and inference methods
//
// Usage:
//   GET /api/test/embedding-benchmark?iterations=10&models=bge-m3,e5-large&methods=fastembed,tei
//   GET /api/test/embedding-benchmark?warmup=true&warmupRounds=5
//   GET /api/test/embedding-benchmark?legacy=cohere,ollama
//
// Parameters:
//   - iterations: Number of benchmark iterations per text (default: 10)
//   - models: Comma-separated list of models (default: all)
//   - methods: Comma-separated list of inference methods (default: all)
//   - legacy: Comma-separated list of legacy providers (default: none)
//   - warmup: Whether to warm up models before benchmarking (default: true)
//   - warmupRounds: Number of warmup requests per provider (default: 3)

export const dynamic = 'force-dynamic';

import { CohereClient } from 'cohere-ai';

// ============================================================================
// Configuration
// ============================================================================

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://embed-server:5555';

// New 1024-dimension multilingual models
const MODELS = {
  'bge-m3': {
    name: 'BAAI/bge-m3',
    dimension: 1024,
    maxTokens: 8192,
    languages: '100+',
    fastembed: true,
  },
  'e5-large': {
    name: 'intfloat/multilingual-e5-large',
    dimension: 1024,
    maxTokens: 512,
    languages: '100',
    prefixQuery: 'query: ',
    prefixPassage: 'passage: ',
    fastembed: true,
  },
  'e5-large-instruct': {
    name: 'intfloat/multilingual-e5-large-instruct',
    dimension: 1024,
    maxTokens: 512,
    languages: '100',
    instructFormat: true,
    instructTemplate: 'Instruct: Given a query, retrieve relevant passages\nQuery: {text}',
    fastembed: false,
  },
  'jina-v3': {
    name: 'jinaai/jina-embeddings-v3',
    dimension: 1024,
    maxTokens: 8192,
    languages: '89',
    promptName: 'retrieval.query',
    trustRemoteCode: true,
    fastembed: false,
  },
};

const INFERENCE_METHODS = ['fastembed', 'sentence-transformers', 'tei'];

// TEI server URLs per model
const TEI_URLS = {
  'bge-m3': process.env.TEI_BGE_M3_URL || 'http://tei-bge-m3:8080',
  'e5-large': process.env.TEI_E5_URL || 'http://tei-e5:8081',
  'e5-large-instruct': process.env.TEI_E5_INSTRUCT_URL || 'http://tei-e5:8081',
  'jina-v3': process.env.TEI_JINA_URL || 'http://tei-jina:8082',
};

// Legacy providers for comparison
const LEGACY_PROVIDERS = {
  cohere: {
    name: 'Cohere API',
    dimension: 1024,
    model: 'embed-multilingual-v3.0',
  },
  ollama: {
    name: 'Ollama (nomic-embed-text)',
    dimension: 768,
    model: 'nomic-embed-text',
    url: process.env.OLLAMA_URL || 'http://ollama:11434',
  },
};

// Test texts (for latency benchmarks)
const TEST_TEXTS = [
  'React developers',
  'John Smith - Senior React Developer at Google with 10 years experience in JavaScript, TypeScript, and Node.js.',
  'Marie Dupont is a seasoned Marketing Director with over 15 years of experience in B2B SaaS growth strategies. She has led successful campaigns for Fortune 500 companies.',
  'Pierre Martin - Directeur Technique chez Capgemini, spécialisé en architecture cloud et DevOps.',
];

// Test corpus for retrieval quality testing
const TEST_CORPUS = [
  { id: 1, name: 'John Smith', text: 'John Smith - Senior React Developer at Google, 10 years JavaScript experience' },
  { id: 2, name: 'Marie Dupont', text: 'Marie Dupont - Marketing Director, B2B SaaS, Fortune 500 campaigns' },
  { id: 3, name: 'Pierre Martin', text: 'Pierre Martin - CTO at Capgemini, cloud architecture and DevOps' },
  { id: 4, name: 'Sarah Chen', text: 'Sarah Chen - Data Scientist at Meta, ML/AI specialist, Python expert' },
  { id: 5, name: 'Ahmed Hassan', text: 'Ahmed Hassan - iOS Developer, Swift and Objective-C, 8 years mobile' },
  { id: 6, name: 'Lisa Wagner', text: 'Lisa Wagner - HR Director, talent acquisition, employee engagement' },
  { id: 7, name: 'Carlos Rodriguez', text: 'Carlos Rodriguez - Backend Engineer, Node.js and PostgreSQL' },
  { id: 8, name: 'Emma Johnson', text: 'Emma Johnson - UX Designer, Figma expert, user research specialist' },
];

// Test queries for retrieval quality testing
const TEST_QUERIES = [
  'React frontend developer',
  'marketing B2B SaaS',
  'cloud DevOps engineer',
  'machine learning Python',
];

// ============================================================================
// Legacy Provider Functions
// ============================================================================

let cohereClient = null;
function getCohere() {
  if (!cohereClient && process.env.COHERE_API_KEY) {
    cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return cohereClient;
}

async function embedWithCohere(text) {
  const cohere = getCohere();
  if (!cohere) throw new Error('COHERE_API_KEY not set');

  const response = await cohere.embed({
    model: LEGACY_PROVIDERS.cohere.model,
    texts: [text],
    inputType: 'search_query',
    embeddingTypes: ['float'],
  });

  return response.embeddings.float[0];
}

async function embedWithOllama(text) {
  const response = await fetch(`${LEGACY_PROVIDERS.ollama.url}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LEGACY_PROVIDERS.ollama.model,
      prompt: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embedding;
}

// ============================================================================
// New Model Embedding Functions
// ============================================================================

function preprocessText(text, modelConfig) {
  if (modelConfig.prefixQuery) {
    return `${modelConfig.prefixQuery}${text}`;
  }
  if (modelConfig.instructFormat) {
    return modelConfig.instructTemplate.replace('{text}', text);
  }
  return text;
}

async function embedWithServer(method, text, modelConfig) {
  const processedText = preprocessText(text, modelConfig);

  const payload = {
    method,
    model: modelConfig.name,
    text: processedText,
  };

  if (modelConfig.promptName) {
    payload.prompt_name = modelConfig.promptName;
  }
  if (modelConfig.trustRemoteCode) {
    payload.trust_remote_code = true;
  }

  const response = await fetch(`${EMBED_SERVER_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.embedding;
}

async function embedWithTEI(modelId, text, modelConfig) {
  const url = TEI_URLS[modelId];
  if (!url) throw new Error(`No TEI URL configured for model: ${modelId}`);

  const processedText = preprocessText(text, modelConfig);

  const response = await fetch(`${url}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: processedText }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TEI: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data[0]) ? data[0] : data;
}

// ============================================================================
// Availability Checks
// ============================================================================

async function checkEmbedServerHealth() {
  try {
    const resp = await fetch(`${EMBED_SERVER_URL}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}

async function checkMethodAvailability(modelId, method) {
  const config = MODELS[modelId];

  try {
    if (method === 'fastembed') {
      if (config.fastembed === false) {
        return { available: false, error: 'Model not supported by Fastembed' };
      }
      await embedWithServer('fastembed', 'test', config);
      return { available: true };
    }

    if (method === 'sentence-transformers') {
      await embedWithServer('sentence-transformers', 'test', config);
      return { available: true };
    }

    if (method === 'tei') {
      const url = TEI_URLS[modelId];
      const resp = await fetch(`${url}/info`);
      if (!resp.ok) return { available: false, error: `TEI not running at ${url}` };
      return { available: true };
    }

    return { available: false, error: 'Unknown method' };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

async function checkLegacyProvider(provider) {
  try {
    if (provider === 'cohere') {
      if (!process.env.COHERE_API_KEY) return { available: false, error: 'COHERE_API_KEY not set' };
      await embedWithCohere('test');
      return { available: true };
    }

    if (provider === 'ollama') {
      const resp = await fetch(`${LEGACY_PROVIDERS.ollama.url}/api/tags`);
      if (!resp.ok) return { available: false, error: `HTTP ${resp.status}` };
      return { available: true };
    }

    return { available: false, error: 'Unknown provider' };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

// ============================================================================
// Statistics
// ============================================================================

function calcStats(times) {
  if (times.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  return {
    min: Math.min(...times).toFixed(2),
    max: Math.max(...times).toFixed(2),
    avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
    p50: sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
    p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2),
  };
}

// ============================================================================
// Quality Metrics Functions
// ============================================================================

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/**
 * Rank corpus by similarity to query embedding
 * Returns array of corpus IDs sorted by similarity (highest first)
 */
function rankBySimilarity(queryEmb, corpusEmbeddings) {
  const scores = corpusEmbeddings.map((emb, idx) => ({
    id: TEST_CORPUS[idx].id,
    name: TEST_CORPUS[idx].name,
    score: cosineSimilarity(queryEmb, emb),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Top-K Recall: % of baseline's top-K that appear in model's top-K
 */
function topKRecall(baselineRanking, modelRanking, k = 3) {
  const baselineTopK = new Set(baselineRanking.slice(0, k).map(r => r.id));
  const modelTopK = modelRanking.slice(0, k).map(r => r.id);
  const overlap = modelTopK.filter(id => baselineTopK.has(id)).length;
  return overlap / k;
}

/**
 * Spearman rank correlation coefficient
 */
function spearmanCorrelation(ranking1, ranking2) {
  const n = ranking1.length;
  if (n === 0) return 0;

  // Create rank maps (id -> position)
  const rank1 = {};
  const rank2 = {};
  ranking1.forEach((r, i) => { rank1[r.id] = i + 1; });
  ranking2.forEach((r, i) => { rank2[r.id] = i + 1; });

  // Calculate sum of squared rank differences
  let sumD2 = 0;
  for (const id of Object.keys(rank1)) {
    const d = (rank1[id] || 0) - (rank2[id] || 0);
    sumD2 += d * d;
  }

  // Spearman's rho = 1 - (6 * sum(d^2)) / (n * (n^2 - 1))
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

// ============================================================================
// Warmup
// ============================================================================

async function warmupModels(modelIds) {
  console.log(`\n  🔥 WARMING UP MODELS...`);

  const warmupPayload = {
    models: modelIds.flatMap(modelId => {
      const config = MODELS[modelId];
      const methods = [];

      if (config.fastembed !== false) {
        methods.push({ method: 'fastembed', model: config.name });
      }
      methods.push({
        method: 'sentence-transformers',
        model: config.name,
        trust_remote_code: config.trustRemoteCode || false,
      });

      return methods;
    }),
  };

  try {
    const response = await fetch(`${EMBED_SERVER_URL}/warmup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(warmupPayload),
    });

    const results = await response.json();

    for (const [key, result] of Object.entries(results)) {
      if (result.success) {
        console.log(`  ✅ ${key}: loaded in ${result.load_time_ms}ms`);
      } else {
        console.log(`  ⚠️ ${key}: ${result.error}`);
      }
    }

    return results;
  } catch (err) {
    console.log(`  ❌ Warmup failed: ${err.message}`);
    return { error: err.message };
  }
}

// ============================================================================
// Benchmarking
// ============================================================================

async function benchmarkModelMethod(modelId, method, iterations) {
  const modelConfig = MODELS[modelId];

  const embedFn = method === 'tei'
    ? (text) => embedWithTEI(modelId, text, modelConfig)
    : (text) => embedWithServer(method, text, modelConfig);

  console.log(`  Testing ${modelId} / ${method}...`);

  const status = await checkMethodAvailability(modelId, method);
  if (!status.available) {
    console.log(`  ❌ Not available: ${status.error}`);
    return { modelId, method, available: false, error: status.error };
  }

  const result = {
    modelId,
    method,
    modelName: modelConfig.name,
    expectedDimension: modelConfig.dimension,
    available: true,
    coldStart: null,
    timings: [],
    actualDimension: null,
  };

  // Cold start
  const coldStartTime = performance.now();
  try {
    const embedding = await embedFn(TEST_TEXTS[0]);
    result.coldStart = (performance.now() - coldStartTime).toFixed(2);
    result.actualDimension = embedding?.length;
  } catch (error) {
    console.log(`  ❌ Cold start failed: ${error.message}`);
    return { modelId, method, available: false, error: error.message };
  }

  // Warm runs
  for (let i = 0; i < iterations; i++) {
    for (const text of TEST_TEXTS) {
      const start = performance.now();
      try {
        await embedFn(text);
        result.timings.push(performance.now() - start);
      } catch {
        // Skip failed
      }
    }
  }

  result.stats = calcStats(result.timings);
  result.totalEmbeddings = result.timings.length;
  console.log(`  ✅ ${result.timings.length} embeddings | Avg: ${result.stats.avg}ms | P95: ${result.stats.p95}ms`);

  return result;
}

async function benchmarkLegacyProvider(provider, iterations) {
  const config = LEGACY_PROVIDERS[provider];
  const embedFn = provider === 'cohere' ? embedWithCohere : embedWithOllama;

  console.log(`  Testing ${config.name}...`);

  const status = await checkLegacyProvider(provider);
  if (!status.available) {
    console.log(`  ❌ Not available: ${status.error}`);
    return { provider, name: config.name, available: false, error: status.error };
  }

  const result = {
    provider,
    name: config.name,
    model: config.model,
    dimension: config.dimension,
    available: true,
    coldStart: null,
    timings: [],
  };

  // Cold start
  const coldStartTime = performance.now();
  try {
    const embedding = await embedFn(TEST_TEXTS[0]);
    result.coldStart = (performance.now() - coldStartTime).toFixed(2);
    result.actualDimension = embedding?.length;
  } catch (error) {
    console.log(`  ❌ Cold start failed: ${error.message}`);
    return { provider, name: config.name, available: false, error: error.message };
  }

  // Warm runs
  for (let i = 0; i < iterations; i++) {
    for (const text of TEST_TEXTS) {
      const start = performance.now();
      try {
        await embedFn(text);
        result.timings.push(performance.now() - start);
      } catch {
        // Skip failed
      }
    }
  }

  result.stats = calcStats(result.timings);
  result.totalEmbeddings = result.timings.length;
  console.log(`  ✅ ${result.timings.length} embeddings | Avg: ${result.stats.avg}ms`);

  return result;
}

// ============================================================================
// Cohere Baseline & Quality Testing
// ============================================================================

/**
 * Generate Cohere baseline embeddings for quality comparison
 */
async function generateCohereBaseline() {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`  📏 GENERATING COHERE BASELINE...`);

  const status = await checkLegacyProvider('cohere');
  if (!status.available) {
    console.log(`  ❌ Cohere not available: ${status.error}`);
    return { available: false, error: status.error };
  }

  const baseline = {
    available: true,
    corpusEmbeddings: [],
    queryEmbeddings: {},
    queryRankings: {},
    latency: { corpus: 0, queries: 0 },
  };

  // Embed corpus
  console.log(`  Embedding ${TEST_CORPUS.length} corpus texts...`);
  const corpusStart = performance.now();
  for (const item of TEST_CORPUS) {
    try {
      const emb = await embedWithCohere(item.text);
      baseline.corpusEmbeddings.push(emb);
    } catch (err) {
      console.log(`  ❌ Failed to embed corpus item ${item.id}: ${err.message}`);
      return { available: false, error: err.message };
    }
  }
  baseline.latency.corpus = performance.now() - corpusStart;
  console.log(`  ✅ Corpus embedded in ${baseline.latency.corpus.toFixed(0)}ms`);

  // Embed queries and compute rankings
  console.log(`  Embedding ${TEST_QUERIES.length} queries and computing rankings...`);
  const queriesStart = performance.now();
  for (const query of TEST_QUERIES) {
    try {
      const queryEmb = await embedWithCohere(query);
      baseline.queryEmbeddings[query] = queryEmb;
      baseline.queryRankings[query] = rankBySimilarity(queryEmb, baseline.corpusEmbeddings);
    } catch (err) {
      console.log(`  ❌ Failed to embed query "${query}": ${err.message}`);
      return { available: false, error: err.message };
    }
  }
  baseline.latency.queries = performance.now() - queriesStart;
  console.log(`  ✅ Queries processed in ${baseline.latency.queries.toFixed(0)}ms`);

  // Log Cohere rankings
  console.log(`\n  Cohere baseline rankings:`);
  for (const query of TEST_QUERIES) {
    const top3 = baseline.queryRankings[query].slice(0, 3).map(r => r.name);
    console.log(`    "${query}" → [${top3.join(', ')}]`);
  }

  return baseline;
}

/**
 * Run quality test for a model/method against Cohere baseline
 */
async function runQualityTest(embedFn, cohereBaseline, modelId, method) {
  const result = {
    perQuery: [],
    avgTopKRecall: 0,
    avgSpearman: 0,
  };

  // Embed corpus with this model
  const corpusEmbeddings = [];
  for (const item of TEST_CORPUS) {
    try {
      const emb = await embedFn(item.text);
      corpusEmbeddings.push(emb);
    } catch {
      return { error: 'Failed to embed corpus' };
    }
  }

  // Test each query
  for (const query of TEST_QUERIES) {
    try {
      const queryEmb = await embedFn(query);
      const modelRanking = rankBySimilarity(queryEmb, corpusEmbeddings);
      const cohereRanking = cohereBaseline.queryRankings[query];

      const recall = topKRecall(cohereRanking, modelRanking, 3);
      const spearman = spearmanCorrelation(cohereRanking, modelRanking);

      result.perQuery.push({
        query,
        modelTop3: modelRanking.slice(0, 3).map(r => r.name),
        cohereTop3: cohereRanking.slice(0, 3).map(r => r.name),
        topKRecall: recall,
        spearman,
      });
    } catch {
      result.perQuery.push({ query, error: 'Failed to embed query' });
    }
  }

  // Calculate averages
  const validResults = result.perQuery.filter(r => !r.error);
  if (validResults.length > 0) {
    result.avgTopKRecall = validResults.reduce((sum, r) => sum + r.topKRecall, 0) / validResults.length;
    result.avgSpearman = validResults.reduce((sum, r) => sum + r.spearman, 0) / validResults.length;
  }

  return result;
}

/**
 * Print detailed quality analysis
 */
function printQualityAnalysis(qualityResults, cohereBaseline) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  🔍 RETRIEVAL QUALITY ANALYSIS (Cohere = baseline)`);
  console.log(`${'═'.repeat(80)}`);

  for (const query of TEST_QUERIES) {
    const cohereTop3 = cohereBaseline.queryRankings[query].slice(0, 3).map(r => r.name);
    console.log(`\n  Query: "${query}"`);
    console.log(`  Cohere top-3: [${cohereTop3.join(', ')}]`);

    for (const [key, result] of Object.entries(qualityResults)) {
      if (result.error) continue;
      const qResult = result.perQuery.find(r => r.query === query);
      if (!qResult || qResult.error) continue;

      const recallPct = (qResult.topKRecall * 100).toFixed(0);
      const recallIcon = qResult.topKRecall === 1 ? '✓' : qResult.topKRecall >= 0.67 ? '~' : '✗';
      console.log(`    ${key}:`);
      console.log(`      Top-3: [${qResult.modelTop3.join(', ')}]`);
      console.log(`      Top-3 Recall: ${recallPct}% ${recallIcon} | Spearman ρ: ${qResult.spearman.toFixed(2)}`);
    }
  }

  // Summary table
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`  📈 QUALITY SUMMARY (averaged across all queries)`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`  ${'Model/Method'.padEnd(30)} │ Top-3 Recall │ Spearman ρ`);
  console.log(`${'─'.repeat(80)}`);

  for (const [key, result] of Object.entries(qualityResults)) {
    if (result.error) {
      console.log(`  ${key.padEnd(30)} │ ❌ ${result.error}`);
    } else {
      const recallPct = (result.avgTopKRecall * 100).toFixed(0) + '%';
      const spearman = result.avgSpearman.toFixed(2);
      console.log(`  ${key.padEnd(30)} │ ${recallPct.padStart(12)} │ ${spearman.padStart(10)}`);
    }
  }
  console.log(`${'═'.repeat(80)}`);
}

// ============================================================================
// API Handler
// ============================================================================

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const iterations = parseInt(searchParams.get('iterations') || '10');
  const modelsParam = searchParams.get('models');
  const methodsParam = searchParams.get('methods');
  const legacyParam = searchParams.get('legacy');
  const warmup = searchParams.get('warmup') !== 'false';

  const models = modelsParam
    ? modelsParam.split(',').filter(m => MODELS[m])
    : Object.keys(MODELS);
  const methods = methodsParam
    ? methodsParam.split(',').filter(m => INFERENCE_METHODS.includes(m))
    : INFERENCE_METHODS;
  const legacy = legacyParam
    ? legacyParam.split(',').filter(p => LEGACY_PROVIDERS[p])
    : [];

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  🏎️  EMBEDDING BENCHMARK - 1024-DIM MULTILINGUAL MODELS`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Models: ${models.join(', ')}`);
  console.log(`  Methods: ${methods.join(', ')}`);
  console.log(`  Legacy: ${legacy.length > 0 ? legacy.join(', ') : 'none'}`);
  console.log(`  Warmup: ${warmup ? 'enabled' : 'disabled'}`);
  console.log(`${'─'.repeat(80)}`);

  try {
    // Check embed server
    const serverAvailable = await checkEmbedServerHealth();
    if (!serverAvailable && (methods.includes('fastembed') || methods.includes('sentence-transformers'))) {
      console.log(`\n  ⚠️ Embed server not available at ${EMBED_SERVER_URL}`);
    }

    // Generate Cohere baseline for quality testing
    const cohereBaseline = await generateCohereBaseline();

    // Benchmark Cohere itself (for latency comparison)
    let cohereLatency = null;
    if (cohereBaseline.available) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`  ⏱️  BENCHMARKING COHERE LATENCY...`);
      const cohereBenchmark = await benchmarkLegacyProvider('cohere', iterations);
      if (cohereBenchmark.available) {
        cohereLatency = cohereBenchmark.stats;
        console.log(`  ✅ Cohere avg latency: ${cohereLatency.avg}ms`);
      }
    }

    // Warmup
    let warmupResults = null;
    if (warmup && serverAvailable) {
      warmupResults = await warmupModels(models);
    }

    // Benchmark new models
    const modelResults = {};
    const qualityResults = {};

    for (const modelId of models) {
      modelResults[modelId] = {};
      for (const method of methods) {
        const result = await benchmarkModelMethod(modelId, method, iterations);
        modelResults[modelId][method] = result;

        // Run quality test if benchmark succeeded and Cohere baseline available
        if (result.available && cohereBaseline.available) {
          const modelConfig = MODELS[modelId];
          const embedFn = method === 'tei'
            ? (text) => embedWithTEI(modelId, text, modelConfig)
            : (text) => embedWithServer(method, text, modelConfig);

          console.log(`  Running quality test for ${modelId}/${method}...`);
          const qualityResult = await runQualityTest(embedFn, cohereBaseline, modelId, method);
          qualityResults[`${modelId}/${method}`] = qualityResult;
          result.quality = qualityResult;

          if (!qualityResult.error) {
            console.log(`  ✅ Top-3 Recall: ${(qualityResult.avgTopKRecall * 100).toFixed(0)}% | Spearman: ${qualityResult.avgSpearman.toFixed(2)}`);
          }
        }
      }
    }

    // Benchmark legacy providers (excluding cohere which we already did)
    const legacyResults = {};
    const legacyToTest = legacy.filter(p => p !== 'cohere');
    if (legacyToTest.length > 0) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`  Testing legacy providers...`);

      for (const provider of legacyToTest) {
        legacyResults[provider] = await benchmarkLegacyProvider(provider, iterations);
      }
    }

    // Print detailed quality analysis
    if (cohereBaseline.available && Object.keys(qualityResults).length > 0) {
      printQualityAnalysis(qualityResults, cohereBaseline);
    }

    // Print comparison table with Cohere column and quality
    const allMethods = [...methods, 'cohere'];
    console.log(`\n${'═'.repeat(100)}`);
    console.log(`  📊 MODEL × INFERENCE METHOD COMPARISON (latency / quality)`);
    console.log(`${'═'.repeat(100)}`);
    console.log(`  ${'Model'.padEnd(20)} │${allMethods.map(m => m.substring(0, 12).padStart(14)).join(' │')}`);
    console.log(`${'─'.repeat(100)}`);

    for (const [modelId, methodResults] of Object.entries(modelResults)) {
      let row = `  ${modelId.padEnd(20)} │`;
      for (const method of methods) {
        const r = methodResults[method];
        let val;
        if (!r?.available) {
          val = '❌ N/A';
        } else if (r.quality && !r.quality.error) {
          const recallPct = (r.quality.avgTopKRecall * 100).toFixed(0);
          val = `${r.stats.avg}ms/${recallPct}%`;
        } else {
          val = `${r.stats.avg}ms`;
        }
        row += val.padStart(14) + ' │';
      }
      // Cohere column (baseline)
      if (cohereLatency) {
        row += `${cohereLatency.avg}ms ★`.padStart(14) + ' │';
      } else {
        row += '❌ N/A'.padStart(14) + ' │';
      }
      console.log(row);
    }
    console.log(`${'═'.repeat(100)}`);
    console.log(`  Quality = Top-3 Recall vs Cohere baseline (★ = reference)`);
    console.log(`${'═'.repeat(100)}\n`);

    // Build summary
    const summary = {
      models: {},
      legacy: {},
      cohere: cohereBaseline.available ? {
        avgLatency: cohereLatency ? `${cohereLatency.avg}ms` : null,
        dimension: 1024,
      } : { error: cohereBaseline.error },
    };

    for (const [modelId, methodResults] of Object.entries(modelResults)) {
      summary.models[modelId] = {};
      for (const [method, r] of Object.entries(methodResults)) {
        if (r.available) {
          const entry = {
            avgLatency: `${r.stats.avg}ms`,
            p95Latency: `${r.stats.p95}ms`,
            coldStart: `${r.coldStart}ms`,
            dimension: r.actualDimension,
          };
          // Add quality metrics if available
          if (r.quality && !r.quality.error) {
            entry.quality = {
              topKRecall: r.quality.avgTopKRecall,
              spearman: r.quality.avgSpearman,
            };
          }
          summary.models[modelId][method] = entry;
        } else {
          summary.models[modelId][method] = { error: r.error };
        }
      }
    }

    for (const [provider, r] of Object.entries(legacyResults)) {
      if (r.available) {
        summary.legacy[provider] = {
          avgLatency: `${r.stats.avg}ms`,
          p95Latency: `${r.stats.p95}ms`,
          coldStart: `${r.coldStart}ms`,
          dimension: r.actualDimension,
        };
      } else {
        summary.legacy[provider] = { error: r.error };
      }
    }

    // Build quality analysis for response
    const qualityAnalysis = TEST_QUERIES.map(query => {
      const cohereRanking = cohereBaseline.available
        ? cohereBaseline.queryRankings[query]?.slice(0, 3).map(r => r.name)
        : null;

      const comparisons = [];
      for (const [key, result] of Object.entries(qualityResults)) {
        if (result.error) continue;
        const qResult = result.perQuery.find(r => r.query === query);
        if (qResult && !qResult.error) {
          comparisons.push({
            modelMethod: key,
            ranking: qResult.modelTop3,
            topKRecall: qResult.topKRecall,
            spearman: qResult.spearman,
          });
        }
      }

      return {
        query,
        cohereRanking,
        comparisons,
      };
    });

    return Response.json({
      success: true,
      config: {
        iterations,
        models,
        methods,
        legacy,
        warmup,
        embedServerUrl: EMBED_SERVER_URL,
      },
      warmup: warmupResults,
      cohereBaseline: {
        available: cohereBaseline.available,
        latency: cohereLatency,
        error: cohereBaseline.error,
      },
      modelResults,
      legacyResults,
      qualityResults,
      qualityAnalysis,
      summary,
    });
  } catch (error) {
    console.error('❌ [Embedding Benchmark] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
