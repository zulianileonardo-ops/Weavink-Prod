#!/usr/bin/env node
// scripts/benchmark-embeddings.mjs
// Benchmark embedding latencies: Cohere API vs Ollama vs HuggingFace TEI
// Usage: node scripts/benchmark-embeddings.mjs [--iterations=10] [--providers=cohere,ollama,tei]

import { CohereClient } from 'cohere-ai';

// Test texts simulating real contact data
const TEST_TEXTS = [
  // Short query (typical search)
  "React developers",

  // Medium contact bio
  "John Smith - Senior React Developer at Google with 10 years experience in JavaScript, TypeScript, and Node.js. Passionate about building scalable web applications.",

  // Long detailed profile
  "Marie Dupont is a seasoned Marketing Director with over 15 years of experience in B2B SaaS growth strategies. She has led successful campaigns for Fortune 500 companies including Microsoft, Salesforce, and Adobe. Her expertise spans digital marketing, brand positioning, content strategy, and demand generation. Marie holds an MBA from INSEAD and is a frequent speaker at industry conferences including SaaStr and Dreamforce. She is based in Paris, France and speaks fluent English, French, and Spanish.",

  // Multilingual (French)
  "Pierre Martin - Directeur Technique chez Capgemini, spécialisé en architecture cloud et DevOps. Expert AWS et Kubernetes.",
];

// Provider configurations
const PROVIDERS = {
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
  tei: {
    name: 'HuggingFace TEI',
    dimension: 768,
    model: 'BAAI/bge-base-en-v1.5',
    url: process.env.TEI_URL || 'http://localhost:8080',
    enabled: true,
  },
};

// Cohere client (lazy init)
let cohereClient = null;
function getCohere() {
  if (!cohereClient && process.env.COHERE_API_KEY) {
    cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return cohereClient;
}

/**
 * Generate embedding using Cohere API
 */
async function embedWithCohere(text) {
  const cohere = getCohere();
  if (!cohere) throw new Error('COHERE_API_KEY not set');

  const response = await cohere.embed({
    model: PROVIDERS.cohere.model,
    texts: [text],
    inputType: 'search_query',
    embeddingTypes: ['float'],
  });

  return response.embeddings.float[0];
}

/**
 * Generate embedding using Ollama
 */
async function embedWithOllama(text) {
  const response = await fetch(`${PROVIDERS.ollama.url}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: PROVIDERS.ollama.model,
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

/**
 * Generate embedding using HuggingFace TEI
 */
async function embedWithTEI(text) {
  const response = await fetch(`${PROVIDERS.tei.url}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TEI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  // TEI returns [[...embedding...]] for single input
  return Array.isArray(data[0]) ? data[0] : data;
}

/**
 * Calculate statistics from timing array
 */
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

/**
 * Check if a provider is available
 */
async function checkProvider(provider) {
  try {
    if (provider === 'cohere') {
      if (!process.env.COHERE_API_KEY) return { available: false, error: 'COHERE_API_KEY not set' };
      await embedWithCohere('test');
      return { available: true };
    }

    if (provider === 'ollama') {
      const resp = await fetch(`${PROVIDERS.ollama.url}/api/tags`, { method: 'GET' });
      if (!resp.ok) return { available: false, error: `HTTP ${resp.status}` };
      const data = await resp.json();
      const hasModel = data.models?.some(m => m.name.includes('nomic-embed'));
      if (!hasModel) return { available: false, error: 'nomic-embed-text model not pulled' };
      return { available: true };
    }

    if (provider === 'tei') {
      const resp = await fetch(`${PROVIDERS.tei.url}/info`, { method: 'GET' });
      if (!resp.ok) return { available: false, error: `HTTP ${resp.status}` };
      return { available: true };
    }

    return { available: false, error: 'Unknown provider' };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

/**
 * Run benchmark for a single provider
 */
async function benchmarkProvider(provider, iterations = 10) {
  const config = PROVIDERS[provider];
  const embedFn = {
    cohere: embedWithCohere,
    ollama: embedWithOllama,
    tei: embedWithTEI,
  }[provider];

  console.log(`\n  Testing ${config.name}...`);

  // Check availability
  const status = await checkProvider(provider);
  if (!status.available) {
    console.log(`  ❌ Not available: ${status.error}`);
    return { provider, available: false, error: status.error };
  }

  const results = {
    provider,
    name: config.name,
    model: config.model,
    dimension: config.dimension,
    available: true,
    coldStart: null,
    timings: [],
    byTextLength: {},
  };

  // Cold start (first request)
  const coldStartTime = performance.now();
  try {
    await embedFn(TEST_TEXTS[0]);
    results.coldStart = performance.now() - coldStartTime;
    console.log(`  Cold start: ${results.coldStart.toFixed(2)}ms`);
  } catch (error) {
    console.log(`  ❌ Cold start failed: ${error.message}`);
    return { provider, available: false, error: error.message };
  }

  // Warm runs
  for (let i = 0; i < iterations; i++) {
    for (const text of TEST_TEXTS) {
      const start = performance.now();
      try {
        const embedding = await embedFn(text);
        const elapsed = performance.now() - start;

        results.timings.push(elapsed);

        // Group by text length
        const lengthBucket = text.length < 50 ? 'short' : text.length < 200 ? 'medium' : 'long';
        if (!results.byTextLength[lengthBucket]) {
          results.byTextLength[lengthBucket] = [];
        }
        results.byTextLength[lengthBucket].push(elapsed);

        // Validate dimension on first run
        if (i === 0 && embedding) {
          results.actualDimension = embedding.length;
        }
      } catch (error) {
        console.log(`  ⚠️ Error on iteration ${i}: ${error.message}`);
      }
    }
  }

  // Calculate stats
  results.stats = calcStats(results.timings);
  results.statsByLength = {};
  for (const [length, times] of Object.entries(results.byTextLength)) {
    results.statsByLength[length] = calcStats(times);
  }

  console.log(`  ✅ ${results.timings.length} embeddings | Avg: ${results.stats.avg.toFixed(2)}ms | P95: ${results.stats.p95.toFixed(2)}ms`);

  return results;
}

/**
 * Main benchmark function
 */
export async function runEmbeddingBenchmark(options = {}) {
  const {
    iterations = 10,
    providers = ['cohere', 'ollama', 'tei'],
  } = options;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  🏎️  EMBEDDING LATENCY BENCHMARK`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Iterations: ${iterations} per text`);
  console.log(`  Test texts: ${TEST_TEXTS.length}`);
  console.log(`  Total embeddings per provider: ${iterations * TEST_TEXTS.length}`);
  console.log(`${'─'.repeat(70)}`);

  const results = {};

  for (const provider of providers) {
    if (!PROVIDERS[provider]) {
      console.log(`\n  ⚠️ Unknown provider: ${provider}`);
      continue;
    }
    results[provider] = await benchmarkProvider(provider, iterations);
  }

  // Print comparison table
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  📊 RESULTS COMPARISON`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Provider         │ Cold Start │   Avg    │   P50    │   P95    │   P99`);
  console.log(`${'─'.repeat(70)}`);

  for (const [provider, result] of Object.entries(results)) {
    if (!result.available) {
      console.log(`  ${result.name?.padEnd(16) || provider.padEnd(16)} │ ❌ ${result.error}`);
      continue;
    }

    const name = (result.name || provider).substring(0, 16).padEnd(16);
    const cold = result.coldStart?.toFixed(0).padStart(6) + 'ms' || '    N/A';
    const avg = result.stats.avg.toFixed(0).padStart(6) + 'ms';
    const p50 = result.stats.p50.toFixed(0).padStart(6) + 'ms';
    const p95 = result.stats.p95.toFixed(0).padStart(6) + 'ms';
    const p99 = result.stats.p99.toFixed(0).padStart(6) + 'ms';

    console.log(`  ${name} │ ${cold} │ ${avg} │ ${p50} │ ${p95} │ ${p99}`);
  }

  console.log(`${'═'.repeat(70)}\n`);

  // Print by text length if we have data
  const availableResults = Object.values(results).filter(r => r.available);
  if (availableResults.length > 0 && availableResults[0].statsByLength) {
    console.log(`  📏 BY TEXT LENGTH (avg latency):`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  Provider         │   Short   │  Medium   │   Long`);
    console.log(`${'─'.repeat(70)}`);

    for (const result of availableResults) {
      const name = (result.name || result.provider).substring(0, 16).padEnd(16);
      const short = result.statsByLength.short?.avg.toFixed(0).padStart(7) + 'ms' || '      N/A';
      const medium = result.statsByLength.medium?.avg.toFixed(0).padStart(7) + 'ms' || '      N/A';
      const long = result.statsByLength.long?.avg.toFixed(0).padStart(7) + 'ms' || '      N/A';

      console.log(`  ${name} │ ${short} │ ${medium} │ ${long}`);
    }
    console.log(`${'═'.repeat(70)}\n`);
  }

  return results;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse CLI args
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--iterations=')) {
      options.iterations = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--providers=')) {
      options.providers = arg.split('=')[1].split(',');
    }
  }

  runEmbeddingBenchmark(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Benchmark failed:', err);
      process.exit(1);
    });
}
