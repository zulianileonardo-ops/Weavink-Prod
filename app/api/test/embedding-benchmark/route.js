// app/api/test/embedding-benchmark/route.js
// API endpoint to benchmark embedding providers
//
// Usage:
//   GET /api/test/embedding-benchmark?iterations=10&providers=cohere,ollama,tei
//   GET /api/test/embedding-benchmark?iterations=100&warmup=true&warmupRounds=5
//   GET /api/test/embedding-benchmark?warmup=false  (skip warmup to measure cold start)
//
// Parameters:
//   - iterations: Number of benchmark iterations per text (default: 10)
//   - providers: Comma-separated list of providers (default: cohere,ollama,tei)
//   - warmup: Whether to warm up models before benchmarking (default: true)
//   - warmupRounds: Number of warmup requests per provider (default: 3)

export const dynamic = 'force-dynamic';

import { CohereClient } from 'cohere-ai';

// Test texts simulating real contact data
const TEST_TEXTS = [
  "React developers",
  "John Smith - Senior React Developer at Google with 10 years experience in JavaScript, TypeScript, and Node.js.",
  "Marie Dupont is a seasoned Marketing Director with over 15 years of experience in B2B SaaS growth strategies. She has led successful campaigns for Fortune 500 companies.",
  "Pierre Martin - Directeur Technique chez Capgemini, spécialisé en architecture cloud et DevOps.",
];

// Provider configurations
const PROVIDERS = {
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
  tei: {
    name: 'HuggingFace TEI',
    dimension: 768,
    model: 'BAAI/bge-base-en-v1.5',
    url: process.env.TEI_URL || 'http://tei:8080',
  },
};

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
    model: PROVIDERS.cohere.model,
    texts: [text],
    inputType: 'search_query',
    embeddingTypes: ['float'],
  });

  return response.embeddings.float[0];
}

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
    throw new Error(`Ollama: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embedding;
}

async function embedWithTEI(text) {
  const response = await fetch(`${PROVIDERS.tei.url}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TEI: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data[0]) ? data[0] : data;
}

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

// Warmup function - loads models into memory before benchmarking
async function warmupProviders(providers, warmupRounds = 3) {
  console.log(`\n  🔥 WARMING UP PROVIDERS (${warmupRounds} rounds each)...`);
  const warmupResults = {};

  for (const provider of providers) {
    const embedFn = { cohere: embedWithCohere, ollama: embedWithOllama, tei: embedWithTEI }[provider];
    const config = PROVIDERS[provider];

    try {
      // Check if available first
      const status = await checkProvider(provider);
      if (!status.available) {
        console.log(`  ⚠️ ${provider}: Not available - ${status.error}`);
        warmupResults[provider] = { success: false, error: status.error };
        continue;
      }

      // Warmup rounds - this loads the model into memory
      const warmupStart = performance.now();
      for (let i = 0; i < warmupRounds; i++) {
        await embedFn('warmup text to load model into memory');
      }
      const warmupTime = (performance.now() - warmupStart).toFixed(2);

      console.log(`  ✅ ${provider}: Warmed up in ${warmupTime}ms (${warmupRounds} rounds)`);
      warmupResults[provider] = { success: true, warmupTime: `${warmupTime}ms` };
    } catch (error) {
      console.log(`  ❌ ${provider}: Warmup failed - ${error.message}`);
      warmupResults[provider] = { success: false, error: error.message };
    }
  }

  console.log(`${'─'.repeat(70)}`);
  return warmupResults;
}

async function benchmarkProvider(provider, iterations) {
  const config = PROVIDERS[provider];
  const embedFn = { cohere: embedWithCohere, ollama: embedWithOllama, tei: embedWithTEI }[provider];

  const status = await checkProvider(provider);
  if (!status.available) {
    return { provider, name: config.name, available: false, error: status.error };
  }

  const result = {
    provider,
    name: config.name,
    model: config.model,
    dimension: config.dimension,
    available: true,
    timings: [],
  };

  // Cold start
  const coldStart = performance.now();
  try {
    await embedFn(TEST_TEXTS[0]);
    result.coldStart = (performance.now() - coldStart).toFixed(2);
  } catch (error) {
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
        // Skip failed embeddings
      }
    }
  }

  result.stats = calcStats(result.timings);
  result.totalEmbeddings = result.timings.length;

  return result;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const iterations = parseInt(searchParams.get('iterations') || '10');
  const providersParam = searchParams.get('providers') || 'cohere,ollama,tei';
  const providers = providersParam.split(',').filter(p => PROVIDERS[p]);
  const warmup = searchParams.get('warmup') !== 'false'; // Default: true
  const warmupRounds = parseInt(searchParams.get('warmupRounds') || '3');

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  🏎️  EMBEDDING LATENCY BENCHMARK`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Providers: ${providers.join(', ')}`);
  console.log(`  Warmup: ${warmup ? `enabled (${warmupRounds} rounds)` : 'disabled'}`);
  console.log(`${'─'.repeat(70)}`);

  try {
    // Warmup phase - loads models into memory before benchmarking
    let warmupResults = null;
    if (warmup) {
      warmupResults = await warmupProviders(providers, warmupRounds);
    }

    const results = {};

    for (const provider of providers) {
      console.log(`  Testing ${provider}...`);
      results[provider] = await benchmarkProvider(provider, iterations);

      if (results[provider].available) {
        console.log(`  ✅ ${provider}: Avg ${results[provider].stats.avg}ms`);
      } else {
        console.log(`  ❌ ${provider}: ${results[provider].error}`);
      }
    }

    // Print comparison
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  📊 RESULTS`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  Provider         │ Cold Start │   Avg    │   P50    │   P95`);
    console.log(`${'─'.repeat(70)}`);

    for (const result of Object.values(results)) {
      if (result.available) {
        const name = result.name.substring(0, 16).padEnd(16);
        console.log(`  ${name} │ ${String(result.coldStart).padStart(8)}ms │ ${String(result.stats.avg).padStart(6)}ms │ ${String(result.stats.p50).padStart(6)}ms │ ${String(result.stats.p95).padStart(6)}ms`);
      }
    }
    console.log(`${'═'.repeat(70)}\n`);

    return Response.json({
      success: true,
      iterations,
      providers: providers,
      warmup: warmup ? { enabled: true, rounds: warmupRounds, results: warmupResults } : { enabled: false },
      results,
      summary: Object.fromEntries(
        Object.entries(results)
          .filter(([, r]) => r.available)
          .map(([k, r]) => [k, {
            avgLatency: `${r.stats.avg}ms`,
            p95Latency: `${r.stats.p95}ms`,
            coldStart: `${r.coldStart}ms`,
          }])
      ),
    });
  } catch (error) {
    console.error('❌ [Embedding Benchmark] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
