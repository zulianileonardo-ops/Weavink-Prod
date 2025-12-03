#!/usr/bin/env node
// scripts/benchmark-embeddings.mjs
// Benchmark embedding latencies across multiple models and inference methods
//
// Usage:
//   node scripts/benchmark-embeddings.mjs [options]
//
// Options:
//   --iterations=10              Number of iterations per text (default: 10)
//   --models=bge-m3,e5-large     Models to benchmark (default: all)
//   --methods=fastembed,tei      Inference methods (default: all)
//   --legacy=cohere,ollama       Include legacy providers (default: none)
//   --warmup                     Pre-load models before benchmarking
//   --embed-server=URL           Embed server URL (default: http://localhost:5555)
//
// Environment variables:
//   EMBED_SERVER_URL             Python embed server (default: http://localhost:5555)
//   TEI_BGE_M3_URL               TEI server for BGE-M3 (default: http://localhost:8080)
//   TEI_E5_URL                   TEI server for E5 models (default: http://localhost:8081)
//   TEI_E5_INSTRUCT_URL          TEI server for E5-instruct (default: http://localhost:8081)
//   TEI_JINA_URL                 TEI server for Jina v3 (default: http://localhost:8082)
//   COHERE_API_KEY               Cohere API key (for legacy provider)
//   OLLAMA_URL                   Ollama server URL (default: http://localhost:11434)

import { CohereClient } from 'cohere-ai';

// ============================================================================
// Configuration
// ============================================================================

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://localhost:5555';

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
    fastembed: false, // Not supported by fastembed
  },
  'jina-v3': {
    name: 'jinaai/jina-embeddings-v3',
    dimension: 1024,
    maxTokens: 8192,
    languages: '89',
    promptName: 'retrieval.query', // For sentence-transformers
    trustRemoteCode: true,
    fastembed: false, // Not supported by fastembed
  },
};

const INFERENCE_METHODS = ['fastembed', 'sentence-transformers', 'tei'];

// TEI server URLs per model
const TEI_URLS = {
  'bge-m3': process.env.TEI_BGE_M3_URL || 'http://localhost:8080',
  'e5-large': process.env.TEI_E5_URL || 'http://localhost:8081',
  'e5-large-instruct': process.env.TEI_E5_INSTRUCT_URL || 'http://localhost:8081',
  'jina-v3': process.env.TEI_JINA_URL || 'http://localhost:8082',
};

// Legacy providers for comparison
const LEGACY_PROVIDERS = {
  cohere: {
    name: 'Cohere API',
    dimension: 1024,
    model: 'embed-multilingual-v3.0',
    enabled: !!process.env.COHERE_API_KEY,
  },
  ollama: {
    name: 'Ollama (nomic-embed-text)',
    dimension: 768,
    model: 'nomic-embed-text',
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    enabled: true,
  },
};

// Test texts simulating real contact data
const TEST_TEXTS = [
  // Short query (typical search)
  'React developers',

  // Medium contact bio
  'John Smith - Senior React Developer at Google with 10 years experience in JavaScript, TypeScript, and Node.js. Passionate about building scalable web applications.',

  // Long detailed profile
  'Marie Dupont is a seasoned Marketing Director with over 15 years of experience in B2B SaaS growth strategies. She has led successful campaigns for Fortune 500 companies including Microsoft, Salesforce, and Adobe. Her expertise spans digital marketing, brand positioning, content strategy, and demand generation. Marie holds an MBA from INSEAD and is a frequent speaker at industry conferences including SaaStr and Dreamforce. She is based in Paris, France and speaks fluent English, French, and Spanish.',

  // Multilingual (French)
  'Pierre Martin - Directeur Technique chez Capgemini, spécialisé en architecture cloud et DevOps. Expert AWS et Kubernetes.',
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
    throw new Error(`Ollama error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embedding;
}

// ============================================================================
// New Model Embedding Functions
// ============================================================================

/**
 * Preprocess text based on model configuration
 */
function preprocessText(text, modelConfig) {
  if (modelConfig.prefixQuery) {
    return `${modelConfig.prefixQuery}${text}`;
  }
  if (modelConfig.instructFormat) {
    return modelConfig.instructTemplate.replace('{text}', text);
  }
  return text;
}

/**
 * Embed via Python embed server (Fastembed or Sentence Transformers)
 */
async function embedWithServer(method, _modelId, text, modelConfig) {
  const processedText = preprocessText(text, modelConfig);

  const payload = {
    method,
    model: modelConfig.name,
    text: processedText,
  };

  // Jina v3 specific options
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

/**
 * Embed via HuggingFace TEI server
 */
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
    throw new Error(`TEI error: ${response.status} - ${error}`);
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
      // Test embed
      await embedWithServer('fastembed', modelId, 'test', config);
      return { available: true };
    }

    if (method === 'sentence-transformers') {
      await embedWithServer('sentence-transformers', modelId, 'test', config);
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
      const data = await resp.json();
      const hasModel = data.models?.some(m => m.name.includes('nomic-embed'));
      if (!hasModel) return { available: false, error: 'nomic-embed-text model not pulled' };
      return { available: true };
    }

    return { available: false, error: 'Unknown provider' };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

// ============================================================================
// Warmup
// ============================================================================

async function warmupModels(modelIds) {
  console.log('\n  🔥 WARMING UP MODELS...');

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
  } catch (err) {
    console.log(`  ❌ Warmup failed: ${err.message}`);
    console.log(`     Make sure embed server is running: python scripts/embed-server.py`);
  }

  console.log(`${'─'.repeat(70)}`);
}

// ============================================================================
// Statistics
// ============================================================================

function calcStats(times) {
  if (times.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };

  const sorted = [...times].sort((a, b) => a - b);
  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

// ============================================================================
// Benchmarking
// ============================================================================

async function benchmarkModelMethod(modelId, method, iterations) {
  const modelConfig = MODELS[modelId];

  // Get embed function based on method
  const embedFn = method === 'tei'
    ? (text) => embedWithTEI(modelId, text, modelConfig)
    : (text) => embedWithServer(method, modelId, text, modelConfig);

  console.log(`  Testing ${modelId} / ${method}...`);

  // Check availability
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
    result.coldStart = performance.now() - coldStartTime;
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
      } catch (error) {
        // Skip failed embeddings
      }
    }
  }

  result.stats = calcStats(result.timings);
  console.log(`  ✅ ${result.timings.length} embeddings | Avg: ${result.stats.avg.toFixed(2)}ms | P95: ${result.stats.p95.toFixed(2)}ms`);

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
    result.coldStart = performance.now() - coldStartTime;
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
      } catch (error) {
        // Skip failed
      }
    }
  }

  result.stats = calcStats(result.timings);
  console.log(`  ✅ ${result.timings.length} embeddings | Avg: ${result.stats.avg.toFixed(2)}ms | P95: ${result.stats.p95.toFixed(2)}ms`);

  return result;
}

// ============================================================================
// Output Formatting
// ============================================================================

function printComparisonTable(modelResults) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  📊 MODEL × INFERENCE METHOD COMPARISON (avg latency ms)`);
  console.log(`${'═'.repeat(80)}`);

  const methods = INFERENCE_METHODS;
  console.log(`  ${'Model'.padEnd(22)} │${methods.map(m => m.padStart(18)).join(' │')}`);
  console.log(`${'─'.repeat(80)}`);

  for (const [modelId, methodResults] of Object.entries(modelResults)) {
    let row = `  ${modelId.padEnd(22)} │`;
    for (const method of methods) {
      const r = methodResults[method];
      let val;
      if (!r) {
        val = '—';
      } else if (!r.available) {
        val = '❌ N/A';
      } else {
        val = `${r.stats.avg.toFixed(0)}ms`;
      }
      row += val.padStart(18) + ' │';
    }
    console.log(row);
  }

  console.log(`${'═'.repeat(80)}`);

  // Dimension validation
  const dims = new Set();
  for (const methodResults of Object.values(modelResults)) {
    for (const r of Object.values(methodResults)) {
      if (r?.actualDimension) dims.add(r.actualDimension);
    }
  }

  if (dims.size === 1 && dims.has(1024)) {
    console.log(`  ✅ Dimension validation: All models returned 1024-dim vectors`);
  } else if (dims.size > 0) {
    console.log(`  ⚠️ Dimensions found: ${[...dims].join(', ')}`);
  }
}

function printLegacyResults(legacyResults) {
  if (Object.keys(legacyResults).length === 0) return;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  📊 LEGACY PROVIDERS (for comparison)`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Provider         │ Cold Start │   Avg    │   P50    │   P95`);
  console.log(`${'─'.repeat(70)}`);

  for (const result of Object.values(legacyResults)) {
    if (!result.available) {
      console.log(`  ${(result.name || result.provider).padEnd(16)} │ ❌ ${result.error}`);
      continue;
    }

    const name = (result.name || result.provider).substring(0, 16).padEnd(16);
    const cold = result.coldStart?.toFixed(0).padStart(6) + 'ms' || '    N/A';
    const avg = result.stats.avg.toFixed(0).padStart(6) + 'ms';
    const p50 = result.stats.p50.toFixed(0).padStart(6) + 'ms';
    const p95 = result.stats.p95.toFixed(0).padStart(6) + 'ms';

    console.log(`  ${name} │ ${cold} │ ${avg} │ ${p50} │ ${p95}`);
  }

  console.log(`${'═'.repeat(70)}`);
}

// ============================================================================
// Main
// ============================================================================

export async function runEmbeddingBenchmark(options = {}) {
  const {
    iterations = 10,
    models = Object.keys(MODELS),
    methods = INFERENCE_METHODS,
    legacy = [],
    warmup = false,
  } = options;

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  🏎️  EMBEDDING BENCHMARK - 1024-DIM MULTILINGUAL MODELS`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`  Iterations: ${iterations} per text`);
  console.log(`  Test texts: ${TEST_TEXTS.length}`);
  console.log(`  Models: ${models.join(', ')}`);
  console.log(`  Methods: ${methods.join(', ')}`);
  console.log(`  Legacy: ${legacy.length > 0 ? legacy.join(', ') : 'none'}`);
  console.log(`  Embed server: ${EMBED_SERVER_URL}`);
  console.log(`${'─'.repeat(80)}`);

  // Check embed server
  const serverAvailable = await checkEmbedServerHealth();
  if (!serverAvailable && (methods.includes('fastembed') || methods.includes('sentence-transformers'))) {
    console.log(`\n  ⚠️ Embed server not available at ${EMBED_SERVER_URL}`);
    console.log(`     Run: python scripts/embed-server.py --port 5555`);
    console.log(`${'─'.repeat(80)}`);
  }

  // Warmup if requested
  if (warmup && serverAvailable) {
    await warmupModels(models);
  }

  // Benchmark new models
  const modelResults = {};

  for (const modelId of models) {
    if (!MODELS[modelId]) {
      console.log(`\n  ⚠️ Unknown model: ${modelId}`);
      continue;
    }

    modelResults[modelId] = {};

    for (const method of methods) {
      modelResults[modelId][method] = await benchmarkModelMethod(modelId, method, iterations);
    }
  }

  // Print comparison table
  printComparisonTable(modelResults);

  // Benchmark legacy providers
  const legacyResults = {};

  if (legacy.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  Testing legacy providers...`);

    for (const provider of legacy) {
      if (!LEGACY_PROVIDERS[provider]) {
        console.log(`  ⚠️ Unknown legacy provider: ${provider}`);
        continue;
      }
      legacyResults[provider] = await benchmarkLegacyProvider(provider, iterations);
    }

    printLegacyResults(legacyResults);
  }

  console.log('');

  return { modelResults, legacyResults };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--iterations=')) {
      options.iterations = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--models=')) {
      options.models = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--methods=')) {
      options.methods = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--legacy=')) {
      options.legacy = arg.split('=')[1].split(',');
    } else if (arg === '--warmup') {
      options.warmup = true;
    } else if (arg.startsWith('--embed-server=')) {
      process.env.EMBED_SERVER_URL = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/benchmark-embeddings.mjs [options]

Options:
  --iterations=N           Number of iterations per text (default: 10)
  --models=m1,m2           Models to benchmark (default: all)
                           Available: ${Object.keys(MODELS).join(', ')}
  --methods=m1,m2          Inference methods (default: all)
                           Available: ${INFERENCE_METHODS.join(', ')}
  --legacy=p1,p2           Legacy providers to include
                           Available: ${Object.keys(LEGACY_PROVIDERS).join(', ')}
  --warmup                 Pre-load models before benchmarking
  --embed-server=URL       Embed server URL (default: ${EMBED_SERVER_URL})

Examples:
  # Quick test with BGE-M3 only
  node scripts/benchmark-embeddings.mjs --models=bge-m3 --iterations=5

  # Full benchmark with warmup
  node scripts/benchmark-embeddings.mjs --warmup --iterations=10

  # Compare with Cohere
  node scripts/benchmark-embeddings.mjs --legacy=cohere --iterations=10
`);
      process.exit(0);
    }
  }

  runEmbeddingBenchmark(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Benchmark failed:', err);
      process.exit(1);
    });
}
