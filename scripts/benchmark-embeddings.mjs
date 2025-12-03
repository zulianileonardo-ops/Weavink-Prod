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

// Note: Use getEmbedServerUrl() to allow command-line override
const DEFAULT_EMBED_SERVER_URL = 'http://localhost:5555';
function getEmbedServerUrl() {
  return process.env.EMBED_SERVER_URL || DEFAULT_EMBED_SERVER_URL;
}

// New 1024-dimension multilingual models
const MODELS = {
  'bge-m3': {
    name: 'BAAI/bge-m3',
    dimension: 1024,
    maxTokens: 8192,
    languages: '100+',
    fastembed: false, // BGE-M3 not supported by fastembed, use sentence-transformers
  },
  'e5-large': {
    name: 'intfloat/multilingual-e5-large',
    dimension: 1024,
    maxTokens: 512,
    languages: '100',
    prefixQuery: 'query: ',
    prefixPassage: 'passage: ',
    fastembed: true, // Supported by fastembed
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

// Test texts simulating real contact data (for latency benchmarks)
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

// Test corpus for retrieval quality testing (20 realistic contacts)
const TEST_CORPUS = [
  // Tech/Engineering
  { id: 1, name: 'John Smith', text: 'John Smith - Senior React Developer at Google, 10 years JavaScript experience. Met at ReactConf 2024. Interested in performance optimization.' },
  { id: 2, name: 'Sarah Chen', text: 'Sarah Chen - Data Scientist at Meta, ML/AI specialist, Python expert. PhD in Machine Learning from Stanford. Working on recommendation systems.' },
  { id: 3, name: 'Carlos Rodriguez', text: 'Carlos Rodriguez - Backend Engineer, Node.js and PostgreSQL. Previously at Stripe. Expertise in payment systems and API design.' },
  { id: 4, name: 'Priya Patel', text: 'Priya Patel - DevOps Engineer at Amazon AWS, Kubernetes and Terraform expert. Cloud architecture specialist.' },

  // Marketing/Sales
  { id: 5, name: 'Marie Dupont', text: 'Marie Dupont - Marketing Director, B2B SaaS, Fortune 500 campaigns. French native, fluent English. Growth hacking expertise.' },
  { id: 6, name: 'Michael Brown', text: 'Michael Brown - VP Sales at Salesforce, enterprise sales, 15 years experience. Built sales teams from 5 to 200 people.' },
  { id: 7, name: 'Lisa Wagner', text: 'Lisa Wagner - HR Director, talent acquisition, employee engagement. Built recruiting pipeline at 3 unicorn startups.' },

  // Executive/Leadership
  { id: 8, name: 'Pierre Martin', text: 'Pierre Martin - CTO at Capgemini, cloud architecture and DevOps. Former Google engineer. Speaks at KubeCon.' },
  { id: 9, name: 'Jennifer Lee', text: 'Jennifer Lee - CEO at TechStartup Inc, former McKinsey consultant. Y Combinator W22 batch. Focus on AI products.' },
  { id: 10, name: 'David Kim', text: 'David Kim - CFO at Fintech Corp, 20 years finance experience. Goldman Sachs alum. IPO specialist.' },

  // Design/Product
  { id: 11, name: 'Emma Johnson', text: 'Emma Johnson - UX Designer, Figma expert, user research specialist. Led design system at Airbnb. Published in UX Collective.' },
  { id: 12, name: 'Alex Turner', text: 'Alex Turner - Product Manager at Spotify, data-driven PM. Previously at Netflix. Expertise in A/B testing.' },

  // Specialized/Niche
  { id: 13, name: 'Ahmed Hassan', text: 'Ahmed Hassan - iOS Developer, Swift and Objective-C, 8 years mobile. Built apps with 10M+ downloads. Apple WWDC speaker.' },
  { id: 14, name: 'Yuki Tanaka', text: 'Yuki Tanaka - Blockchain Developer, Solidity and Rust. Built DeFi protocols. Core contributor to Ethereum.' },
  { id: 15, name: 'Sofia Garcia', text: 'Sofia Garcia - AI Research Scientist at OpenAI, NLP specialist. Co-authored GPT papers. MIT PhD.' },

  // Investors/Advisors
  { id: 16, name: 'Robert Chen', text: 'Robert Chen - Partner at Sequoia Capital, Series A/B investments. Focus on B2B SaaS and AI. Board member at 12 companies.' },
  { id: 17, name: 'Anna Schmidt', text: 'Anna Schmidt - Angel Investor, 50+ startup investments. Former founder (exit to Google). Advisor to Y Combinator.' },

  // Multilingual contacts
  { id: 18, name: 'François Dubois', text: 'François Dubois - Directeur Commercial chez L\'Oréal, 15 ans d\'expérience en ventes B2B. Basé à Paris. Parle anglais couramment.' },
  { id: 19, name: 'Hans Mueller', text: 'Hans Mueller - Geschäftsführer bei BMW Digital, Automotive Tech. 20 Jahre Erfahrung in der Automobilindustrie.' },
  { id: 20, name: 'Mei Lin', text: 'Mei Lin - 阿里巴巴产品总监, 10年电商经验. 专注于跨境电商和支付系统. Also fluent in English.' },
];

// Test queries for retrieval quality testing (110 scenarios - EN/FR with edge cases)
const TEST_QUERIES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE-BASED QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'React frontend developer', expectedTop3: [1, 3, 13], category: 'role' },
  { query: 'backend engineer Node.js', expectedTop3: [3, 4, 1], category: 'role' },
  { query: 'mobile app developer iOS', expectedTop3: [13, 1, 3], category: 'role' },
  { query: 'data scientist machine learning', expectedTop3: [2, 15, 12], category: 'role' },
  { query: 'DevOps infrastructure engineer', expectedTop3: [4, 8, 3], category: 'role' },
  { query: 'UX UI designer', expectedTop3: [11, 12, 5], category: 'role' },
  { query: 'développeur frontend React', expectedTop3: [1, 3, 13], category: 'role' },
  { query: 'ingénieur backend', expectedTop3: [3, 4, 8], category: 'role' },
  { query: 'développeur mobile iOS', expectedTop3: [13, 1, 3], category: 'role' },
  { query: 'data scientist intelligence artificielle', expectedTop3: [2, 15, 12], category: 'role' },
  { query: 'ingénieur DevOps cloud', expectedTop3: [4, 8, 3], category: 'role' },
  { query: 'designer UX expérience utilisateur', expectedTop3: [11, 12, 5], category: 'role' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SKILL-BASED QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'Python programming expert', expectedTop3: [2, 15, 3], category: 'skill' },
  { query: 'JavaScript TypeScript developer', expectedTop3: [1, 3, 13], category: 'skill' },
  { query: 'Kubernetes container orchestration', expectedTop3: [4, 8, 3], category: 'skill' },
  { query: 'machine learning deep learning', expectedTop3: [2, 15, 12], category: 'skill' },
  { query: 'SQL database PostgreSQL', expectedTop3: [3, 2, 4], category: 'skill' },
  { query: 'Figma design systems', expectedTop3: [11, 12, 5], category: 'skill' },
  { query: 'expert Python programmation', expectedTop3: [2, 15, 3], category: 'skill' },
  { query: 'développeur JavaScript TypeScript', expectedTop3: [1, 3, 13], category: 'skill' },
  { query: 'Kubernetes orchestration conteneurs', expectedTop3: [4, 8, 3], category: 'skill' },
  { query: 'apprentissage automatique deep learning', expectedTop3: [2, 15, 12], category: 'skill' },
  { query: 'base de données SQL PostgreSQL', expectedTop3: [3, 2, 4], category: 'skill' },
  { query: 'design système Figma', expectedTop3: [11, 12, 5], category: 'skill' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERTISE QUERIES (14 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'someone who can help with fundraising', expectedTop3: [16, 17, 10], category: 'expertise' },
  { query: 'expert in scaling startups', expectedTop3: [17, 9, 16], category: 'expertise' },
  { query: 'blockchain smart contracts specialist', expectedTop3: [14, 3, 15], category: 'expertise' },
  { query: 'product design user research expert', expectedTop3: [11, 12, 5], category: 'expertise' },
  { query: 'growth hacking marketing specialist', expectedTop3: [5, 6, 9], category: 'expertise' },
  { query: 'AI natural language processing researcher', expectedTop3: [15, 2, 12], category: 'expertise' },
  { query: 'talent acquisition recruiting expert', expectedTop3: [7, 6, 5], category: 'expertise' },
  { query: 'quelqu\'un pour aider à lever des fonds', expectedTop3: [16, 17, 10], category: 'expertise' },
  { query: 'expert en scaling de startups', expectedTop3: [17, 9, 16], category: 'expertise' },
  { query: 'spécialiste blockchain contrats intelligents', expectedTop3: [14, 3, 15], category: 'expertise' },
  { query: 'expert design produit recherche utilisateur', expectedTop3: [11, 12, 5], category: 'expertise' },
  { query: 'spécialiste growth hacking marketing', expectedTop3: [5, 6, 9], category: 'expertise' },
  { query: 'chercheur IA traitement langage naturel', expectedTop3: [15, 2, 12], category: 'expertise' },
  { query: 'expert recrutement acquisition talents', expectedTop3: [7, 6, 5], category: 'expertise' },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY QUERIES (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'people from Google', expectedTop3: [1, 8, 17], category: 'company' },
  { query: 'worked at Meta Facebook', expectedTop3: [2, 1, 15], category: 'company' },
  { query: 'Amazon AWS experience', expectedTop3: [4, 3, 8], category: 'company' },
  { query: 'Stripe payment company', expectedTop3: [3, 10, 14], category: 'company' },
  { query: 'Y Combinator alumni', expectedTop3: [9, 17, 16], category: 'company' },
  { query: 'personnes de chez Google', expectedTop3: [1, 8, 17], category: 'company' },
  { query: 'a travaillé chez Meta Facebook', expectedTop3: [2, 1, 15], category: 'company' },
  { query: 'expérience Amazon AWS', expectedTop3: [4, 3, 8], category: 'company' },
  { query: 'entreprise paiement Stripe', expectedTop3: [3, 10, 14], category: 'company' },
  { query: 'anciens de Y Combinator', expectedTop3: [9, 17, 16], category: 'company' },

  // ═══════════════════════════════════════════════════════════════════════════
  // INDUSTRY QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'fintech financial technology', expectedTop3: [10, 3, 14], category: 'industry' },
  { query: 'automotive car industry', expectedTop3: [19, 8, 4], category: 'industry' },
  { query: 'e-commerce online retail', expectedTop3: [20, 5, 12], category: 'industry' },
  { query: 'healthcare medical technology', expectedTop3: [2, 15, 7], category: 'industry' },
  { query: 'SaaS software as a service', expectedTop3: [5, 16, 9], category: 'industry' },
  { query: 'media entertainment streaming', expectedTop3: [12, 11, 5], category: 'industry' },
  { query: 'fintech technologie financière', expectedTop3: [10, 3, 14], category: 'industry' },
  { query: 'industrie automobile voiture', expectedTop3: [19, 8, 4], category: 'industry' },
  { query: 'e-commerce commerce en ligne', expectedTop3: [20, 5, 12], category: 'industry' },
  { query: 'santé technologie médicale', expectedTop3: [2, 15, 7], category: 'industry' },
  { query: 'SaaS logiciel en tant que service', expectedTop3: [5, 16, 9], category: 'industry' },
  { query: 'média divertissement streaming', expectedTop3: [12, 11, 5], category: 'industry' },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEADERSHIP QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'CEO founder startup', expectedTop3: [9, 17, 8], category: 'leadership' },
  { query: 'CTO technical leader', expectedTop3: [8, 4, 3], category: 'leadership' },
  { query: 'CFO finance executive', expectedTop3: [10, 16, 6], category: 'leadership' },
  { query: 'VP sales director', expectedTop3: [6, 18, 5], category: 'leadership' },
  { query: 'investor venture capital partner', expectedTop3: [16, 17, 10], category: 'leadership' },
  { query: 'board member advisor', expectedTop3: [16, 17, 9], category: 'leadership' },
  { query: 'PDG fondateur startup', expectedTop3: [9, 17, 8], category: 'leadership' },
  { query: 'directeur technique CTO', expectedTop3: [8, 4, 3], category: 'leadership' },
  { query: 'directeur financier CFO', expectedTop3: [10, 16, 6], category: 'leadership' },
  { query: 'directeur commercial ventes', expectedTop3: [6, 18, 5], category: 'leadership' },
  { query: 'investisseur capital risque', expectedTop3: [16, 17, 10], category: 'leadership' },
  { query: 'membre conseil administration', expectedTop3: [16, 17, 9], category: 'leadership' },

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE QUERIES (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'French speaking contacts', expectedTop3: [18, 5, 8], category: 'language' },
  { query: 'speaks German fluently', expectedTop3: [19, 7, 17], category: 'language' },
  { query: 'Chinese Mandarin speaker', expectedTop3: [20, 2, 15], category: 'language' },
  { query: 'bilingual English French', expectedTop3: [5, 18, 8], category: 'language' },
  { query: 'multilingual international', expectedTop3: [20, 18, 19], category: 'language' },
  { query: 'contacts francophones', expectedTop3: [18, 5, 8], category: 'language' },
  { query: 'parle allemand couramment', expectedTop3: [19, 7, 17], category: 'language' },
  { query: 'locuteur chinois mandarin', expectedTop3: [20, 2, 15], category: 'language' },
  { query: 'bilingue anglais français', expectedTop3: [5, 18, 8], category: 'language' },
  { query: 'multilingue international', expectedTop3: [20, 18, 19], category: 'language' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICAL QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'API development REST GraphQL', expectedTop3: [3, 4, 1], category: 'technical' },
  { query: 'cloud architecture AWS Azure', expectedTop3: [4, 8, 3], category: 'technical' },
  { query: 'microservices distributed systems', expectedTop3: [3, 4, 8], category: 'technical' },
  { query: 'CI/CD pipeline automation', expectedTop3: [4, 8, 3], category: 'technical' },
  { query: 'security cybersecurity expert', expectedTop3: [4, 3, 14], category: 'technical' },
  { query: 'performance optimization scalability', expectedTop3: [1, 3, 4], category: 'technical' },
  { query: 'développement API REST GraphQL', expectedTop3: [3, 4, 1], category: 'technical' },
  { query: 'architecture cloud AWS Azure', expectedTop3: [4, 8, 3], category: 'technical' },
  { query: 'microservices systèmes distribués', expectedTop3: [3, 4, 8], category: 'technical' },
  { query: 'pipeline CI/CD automatisation', expectedTop3: [4, 8, 3], category: 'technical' },
  { query: 'sécurité cybersécurité expert', expectedTop3: [4, 3, 14], category: 'technical' },
  { query: 'optimisation performance scalabilité', expectedTop3: [1, 3, 4], category: 'technical' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES - Typos & Misspellings (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'developper react', expectedTop3: [1, 3, 13], category: 'edge_typo' },
  { query: 'devops engeneer', expectedTop3: [4, 8, 3], category: 'edge_typo' },
  { query: 'machien learning', expectedTop3: [2, 15, 12], category: 'edge_typo' },
  { query: 'blockhain developer', expectedTop3: [14, 3, 15], category: 'edge_typo' },
  { query: 'developpeur fronted', expectedTop3: [1, 3, 13], category: 'edge_typo' },
  { query: 'ingenieur devops', expectedTop3: [4, 8, 3], category: 'edge_typo' },
  { query: 'inteligence artificielle', expectedTop3: [2, 15, 12], category: 'edge_typo' },
  { query: 'investiseur startup', expectedTop3: [16, 17, 10], category: 'edge_typo' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES - Partial/Vague Queries (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'tech', expectedTop3: [1, 3, 4], category: 'edge_vague' },
  { query: 'marketing', expectedTop3: [5, 6, 7], category: 'edge_vague' },
  { query: 'finance', expectedTop3: [10, 16, 17], category: 'edge_vague' },
  { query: 'design', expectedTop3: [11, 12, 5], category: 'edge_vague' },
  { query: 'AI', expectedTop3: [2, 15, 9], category: 'edge_vague' },
  { query: 'startup', expectedTop3: [9, 17, 16], category: 'edge_vague' },
  { query: 'Paris', expectedTop3: [18, 5, 8], category: 'edge_vague' },
  { query: 'Silicon Valley', expectedTop3: [1, 2, 9], category: 'edge_vague' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES - Natural Language Queries (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'who can build me a mobile app', expectedTop3: [13, 1, 3], category: 'edge_natural' },
  { query: 'I need someone to redesign our website', expectedTop3: [11, 1, 12], category: 'edge_natural' },
  { query: 'looking for a technical cofounder', expectedTop3: [8, 4, 3], category: 'edge_natural' },
  { query: 'need help with our pitch deck', expectedTop3: [17, 16, 9], category: 'edge_natural' },
  { query: 'someone who understands payments', expectedTop3: [3, 10, 20], category: 'edge_natural' },
  { query: 'qui peut créer une application mobile', expectedTop3: [13, 1, 3], category: 'edge_natural' },
  { query: 'je cherche quelqu\'un pour refaire notre site', expectedTop3: [11, 1, 12], category: 'edge_natural' },
  { query: 'je cherche un cofondateur technique', expectedTop3: [8, 4, 3], category: 'edge_natural' },
  { query: 'besoin d\'aide pour notre pitch', expectedTop3: [17, 16, 9], category: 'edge_natural' },
  { query: 'quelqu\'un qui comprend les paiements', expectedTop3: [3, 10, 20], category: 'edge_natural' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES - Negation & Complex Queries (6 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'engineer but not frontend', expectedTop3: [3, 4, 8], category: 'edge_complex' },
  { query: 'investor not angel', expectedTop3: [16, 10, 17], category: 'edge_complex' },
  { query: 'technical and business background', expectedTop3: [9, 8, 17], category: 'edge_complex' },
  { query: 'ingénieur mais pas frontend', expectedTop3: [3, 4, 8], category: 'edge_complex' },
  { query: 'investisseur pas business angel', expectedTop3: [16, 10, 17], category: 'edge_complex' },
  { query: 'profil technique et business', expectedTop3: [9, 8, 17], category: 'edge_complex' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES - Event/Context Based (6 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  { query: 'met at conference', expectedTop3: [1, 8, 13], category: 'edge_context' },
  { query: 'speaker at tech events', expectedTop3: [8, 13, 15], category: 'edge_context' },
  { query: 'published author researcher', expectedTop3: [15, 11, 2], category: 'edge_context' },
  { query: 'rencontré à une conférence', expectedTop3: [1, 8, 13], category: 'edge_context' },
  { query: 'orateur événements tech', expectedTop3: [8, 13, 15], category: 'edge_context' },
  { query: 'auteur publié chercheur', expectedTop3: [15, 11, 2], category: 'edge_context' },
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

// Rate limiting for Cohere Trial key (100 calls/minute)
const COHERE_RATE_LIMIT = 90; // Stay under 100 to be safe
const COHERE_RATE_WINDOW = 60000; // 1 minute in ms
let cohereCallTimestamps = [];

async function waitForCohereRateLimit() {
  const now = Date.now();
  // Remove timestamps older than 1 minute
  cohereCallTimestamps = cohereCallTimestamps.filter(t => now - t < COHERE_RATE_WINDOW);

  if (cohereCallTimestamps.length >= COHERE_RATE_LIMIT) {
    // Calculate wait time until oldest call expires
    const oldestCall = Math.min(...cohereCallTimestamps);
    const waitTime = COHERE_RATE_WINDOW - (now - oldestCall) + 1000; // +1s buffer
    if (waitTime > 0) {
      console.log(`  ⏳ Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Clear old timestamps after waiting
      cohereCallTimestamps = cohereCallTimestamps.filter(t => Date.now() - t < COHERE_RATE_WINDOW);
    }
  }
  cohereCallTimestamps.push(Date.now());
}

async function embedWithCohere(text) {
  const cohere = getCohere();
  if (!cohere) throw new Error('COHERE_API_KEY not set');

  // Apply rate limiting
  await waitForCohereRateLimit();

  const response = await cohere.embed({
    model: LEGACY_PROVIDERS.cohere.model,
    texts: [text],
    inputType: 'search_query',
    embeddingTypes: ['float'],
  });

  return response.embeddings.float[0];
}

/**
 * Batch embed multiple texts with Cohere (rate-limited)
 * More efficient than single calls
 */
async function embedBatchWithCohere(texts, inputType = 'search_document') {
  const cohere = getCohere();
  if (!cohere) throw new Error('COHERE_API_KEY not set');

  const results = [];
  const batchSize = 90; // Cohere allows up to 96 texts per call, stay under rate limit

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Wait for rate limit (counts as 1 API call per batch)
    await waitForCohereRateLimit();

    const response = await cohere.embed({
      model: LEGACY_PROVIDERS.cohere.model,
      texts: batch,
      inputType,
      embeddingTypes: ['float'],
    });

    results.push(...response.embeddings.float);

    if (i + batchSize < texts.length) {
      console.log(`  📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} complete...`);
    }
  }

  return results;
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

  const response = await fetch(`${getEmbedServerUrl()}/embed`, {
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
    const resp = await fetch(`${getEmbedServerUrl()}/health`);
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
    const response = await fetch(`${getEmbedServerUrl()}/warmup`, {
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

/**
 * Mean Reciprocal Rank (MRR)
 * Measures position of first relevant result from expected set
 */
function meanReciprocalRank(expectedIds, modelRanking) {
  const expectedSet = new Set(expectedIds);
  for (let i = 0; i < modelRanking.length; i++) {
    if (expectedSet.has(modelRanking[i].id)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Precision@K - % of top-K results that are in expected set
 */
function precisionAtK(expectedIds, modelRanking, k = 3) {
  const expectedSet = new Set(expectedIds);
  const topK = modelRanking.slice(0, k);
  const hits = topK.filter(r => expectedSet.has(r.id)).length;
  return hits / k;
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
// Cohere Baseline & Quality Testing
// ============================================================================

/**
 * Generate Cohere baseline embeddings for quality comparison
 * Uses batch embedding for efficiency with rate limiting
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

  // Batch embed corpus (uses 1 API call for all 20 texts)
  console.log(`  Embedding ${TEST_CORPUS.length} corpus texts (batched)...`);
  const corpusStart = performance.now();
  try {
    const corpusTexts = TEST_CORPUS.map(item => item.text);
    baseline.corpusEmbeddings = await embedBatchWithCohere(corpusTexts, 'search_document');
  } catch (err) {
    console.log(`  ❌ Failed to embed corpus: ${err.message}`);
    return { available: false, error: err.message };
  }
  baseline.latency.corpus = performance.now() - corpusStart;
  console.log(`  ✅ Corpus embedded in ${baseline.latency.corpus.toFixed(0)}ms`);

  // Batch embed queries (uses ~2 API calls for 110 texts)
  console.log(`  Embedding ${TEST_QUERIES.length} queries (batched)...`);
  const queriesStart = performance.now();
  try {
    const queryTexts = TEST_QUERIES.map(q => q.query);
    const queryEmbeddings = await embedBatchWithCohere(queryTexts, 'search_query');

    // Map embeddings back to queries and compute rankings
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const query = TEST_QUERIES[i].query;
      baseline.queryEmbeddings[query] = queryEmbeddings[i];
      baseline.queryRankings[query] = rankBySimilarity(queryEmbeddings[i], baseline.corpusEmbeddings);
    }
  } catch (err) {
    console.log(`  ❌ Failed to embed queries: ${err.message}`);
    return { available: false, error: err.message };
  }
  baseline.latency.queries = performance.now() - queriesStart;
  console.log(`  ✅ Queries processed in ${baseline.latency.queries.toFixed(0)}ms`);

  // Log sample of Cohere rankings (first 10 to avoid spam)
  console.log(`\n  Cohere baseline rankings (sample):`);
  const samplesToShow = Math.min(10, TEST_QUERIES.length);
  for (let i = 0; i < samplesToShow; i++) {
    const query = TEST_QUERIES[i].query;
    const top3 = baseline.queryRankings[query].slice(0, 3).map(r => r.name);
    console.log(`    "${query}" → [${top3.join(', ')}]`);
  }
  if (TEST_QUERIES.length > samplesToShow) {
    console.log(`    ... and ${TEST_QUERIES.length - samplesToShow} more queries`);
  }

  return baseline;
}

/**
 * Run quality test for a model/method against Cohere baseline
 */
async function runQualityTest(embedFn, cohereBaseline) {
  const result = {
    perQuery: [],
    perCategory: {},
    avgTopKRecall: 0,
    avgSpearman: 0,
    avgMRR: 0,
    avgPrecisionAtK: 0,
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
  for (const queryObj of TEST_QUERIES) {
    const { query, expectedTop3, category } = queryObj;
    try {
      const queryEmb = await embedFn(query);
      const modelRanking = rankBySimilarity(queryEmb, corpusEmbeddings);
      const cohereRanking = cohereBaseline.queryRankings[query];

      const recall = topKRecall(cohereRanking, modelRanking, 3);
      const spearman = spearmanCorrelation(cohereRanking, modelRanking);
      const mrr = meanReciprocalRank(expectedTop3, modelRanking);
      const pak = precisionAtK(expectedTop3, modelRanking, 3);

      const queryResult = {
        query,
        category,
        expectedTop3,
        modelTop3: modelRanking.slice(0, 3).map(r => r.name),
        modelTop3Ids: modelRanking.slice(0, 3).map(r => r.id),
        cohereTop3: cohereRanking.slice(0, 3).map(r => r.name),
        topKRecall: recall,
        spearman,
        mrr,
        precisionAtK: pak,
      };
      result.perQuery.push(queryResult);

      // Track per-category results
      if (!result.perCategory[category]) {
        result.perCategory[category] = { queries: [], recall: 0, mrr: 0, pak: 0, spearman: 0 };
      }
      result.perCategory[category].queries.push(queryResult);
    } catch {
      result.perQuery.push({ query, category, error: 'Failed to embed query' });
    }
  }

  // Calculate averages
  const validResults = result.perQuery.filter(r => !r.error);
  if (validResults.length > 0) {
    result.avgTopKRecall = validResults.reduce((sum, r) => sum + r.topKRecall, 0) / validResults.length;
    result.avgSpearman = validResults.reduce((sum, r) => sum + r.spearman, 0) / validResults.length;
    result.avgMRR = validResults.reduce((sum, r) => sum + r.mrr, 0) / validResults.length;
    result.avgPrecisionAtK = validResults.reduce((sum, r) => sum + r.precisionAtK, 0) / validResults.length;
  }

  // Calculate per-category averages
  for (const [cat, data] of Object.entries(result.perCategory)) {
    const catResults = data.queries.filter(r => !r.error);
    if (catResults.length > 0) {
      data.recall = catResults.reduce((sum, r) => sum + r.topKRecall, 0) / catResults.length;
      data.mrr = catResults.reduce((sum, r) => sum + r.mrr, 0) / catResults.length;
      data.pak = catResults.reduce((sum, r) => sum + r.precisionAtK, 0) / catResults.length;
      data.spearman = catResults.reduce((sum, r) => sum + r.spearman, 0) / catResults.length;
    }
  }

  return result;
}

/**
 * Print detailed quality analysis
 * Shows sample queries per category to avoid console spam with many queries
 */
function printQualityAnalysis(qualityResults, cohereBaseline) {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  🔍 RETRIEVAL QUALITY ANALYSIS (Cohere = baseline)`);
  console.log(`${'═'.repeat(100)}`);

  // Group queries by category and show 1-2 examples per category
  const categories = [...new Set(TEST_QUERIES.map(q => q.category))];
  const maxPerCategory = 2;

  for (const category of categories) {
    const categoryQueries = TEST_QUERIES.filter(q => q.category === category);
    const samplesToShow = categoryQueries.slice(0, maxPerCategory);

    console.log(`\n  ── ${category.toUpperCase()} (${categoryQueries.length} queries, showing ${samplesToShow.length}) ──`);

    for (const queryObj of samplesToShow) {
      const query = queryObj.query;
      const cohereTop3 = cohereBaseline.queryRankings[query].slice(0, 3).map(r => r.name);
      console.log(`\n  Query: "${query}"`);
      console.log(`  Expected: [${queryObj.expectedTop3.map(id => TEST_CORPUS.find(c => c.id === id)?.name).join(', ')}]`);
      console.log(`  Cohere top-3: [${cohereTop3.join(', ')}]`);

      for (const [key, result] of Object.entries(qualityResults)) {
        if (result.error) continue;
        const qResult = result.perQuery.find(r => r.query === query);
        if (!qResult || qResult.error) continue;

        const recallPct = (qResult.topKRecall * 100).toFixed(0);
        const recallIcon = qResult.topKRecall === 1 ? '✓' : qResult.topKRecall >= 0.67 ? '~' : '✗';
        const mrrStr = qResult.mrr.toFixed(2);
        const pakPct = (qResult.precisionAtK * 100).toFixed(0);
        console.log(`    ${key}:`);
        console.log(`      Top-3: [${qResult.modelTop3.join(', ')}]`);
        console.log(`      Recall: ${recallPct}% ${recallIcon} | MRR: ${mrrStr} | P@3: ${pakPct}%`);
      }
    }
  }

  // Summary table with all metrics
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  📈 QUALITY SUMMARY (averaged across all ${TEST_QUERIES.length} queries)`);
  console.log(`${'═'.repeat(100)}`);
  console.log(`  ${'Model/Method'.padEnd(30)} │ Recall │   MRR │  P@3  │ Spearman ρ`);
  console.log(`${'─'.repeat(100)}`);

  for (const [key, result] of Object.entries(qualityResults)) {
    if (result.error) {
      console.log(`  ${key.padEnd(30)} │ ❌ ${result.error}`);
    } else {
      const recallPct = (result.avgTopKRecall * 100).toFixed(0) + '%';
      const mrr = result.avgMRR.toFixed(2);
      const pak = (result.avgPrecisionAtK * 100).toFixed(0) + '%';
      const spearman = result.avgSpearman.toFixed(2);
      console.log(`  ${key.padEnd(30)} │ ${recallPct.padStart(6)} │ ${mrr.padStart(5)} │ ${pak.padStart(5)} │ ${spearman.padStart(10)}`);
    }
  }

  // Per-category breakdown
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  📊 QUALITY BY CATEGORY (best model per category)`);
  console.log(`${'═'.repeat(100)}`);
  console.log(`  ${'Category'.padEnd(14)} │ ${'Best Model'.padEnd(30)} │ Recall │   MRR │ Queries`);
  console.log(`${'─'.repeat(100)}`);

  // Reuse categories from above
  for (const category of categories) {
    // Find best model for this category
    let bestModel = null;
    let bestRecall = -1;
    let bestMRR = 0;

    for (const [key, result] of Object.entries(qualityResults)) {
      if (result.error || !result.perCategory[category]) continue;
      const catData = result.perCategory[category];
      if (catData.recall > bestRecall || (catData.recall === bestRecall && catData.mrr > bestMRR)) {
        bestRecall = catData.recall;
        bestMRR = catData.mrr;
        bestModel = key;
      }
    }

    if (bestModel) {
      const catData = qualityResults[bestModel].perCategory[category];
      const queryCount = catData.queries.length;
      console.log(`  ${category.padEnd(14)} │ ${bestModel.padEnd(30)} │ ${(catData.recall * 100).toFixed(0).padStart(5)}% │ ${catData.mrr.toFixed(2).padStart(5)} │ ${queryCount}`);
    } else {
      console.log(`  ${category.padEnd(14)} │ ${'N/A'.padEnd(30)} │    N/A │   N/A │ 0`);
    }
  }
  console.log(`${'═'.repeat(100)}`);
}

// ============================================================================
// Output Formatting
// ============================================================================

function printComparisonTable(modelResults, cohereLatency) {
  const allMethods = [...INFERENCE_METHODS, 'cohere'];
  console.log(`\n${'═'.repeat(120)}`);
  console.log(`  📊 MODEL × INFERENCE METHOD COMPARISON (latency/recall/mrr)`);
  console.log(`${'═'.repeat(120)}`);

  console.log(`  ${'Model'.padEnd(20)} │${allMethods.map(m => m.substring(0, 14).padStart(18)).join(' │')}`);
  console.log(`${'─'.repeat(120)}`);

  for (const [modelId, methodResults] of Object.entries(modelResults)) {
    let row = `  ${modelId.padEnd(20)} │`;
    for (const method of INFERENCE_METHODS) {
      const r = methodResults[method];
      let val;
      if (!r) {
        val = '—';
      } else if (!r.available) {
        val = '❌ N/A';
      } else if (r.quality && !r.quality.error) {
        const recallPct = (r.quality.avgTopKRecall * 100).toFixed(0);
        const mrr = r.quality.avgMRR.toFixed(2);
        val = `${r.stats.avg.toFixed(0)}ms/${recallPct}%/${mrr}`;
      } else {
        val = `${r.stats.avg.toFixed(0)}ms`;
      }
      row += val.padStart(18) + ' │';
    }
    // Cohere column (baseline)
    if (cohereLatency) {
      row += `${cohereLatency.avg.toFixed(0)}ms ★`.padStart(18) + ' │';
    } else {
      row += '❌ N/A'.padStart(18) + ' │';
    }
    console.log(row);
  }

  console.log(`${'═'.repeat(120)}`);
  console.log(`  Format: latency/recall/MRR | Quality = Top-3 Recall vs Cohere baseline (★ = reference)`);
  console.log(`${'═'.repeat(120)}`);

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

/**
 * Print latency percentile analysis
 */
function printLatencyPercentiles(modelResults) {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  ⏱️  LATENCY PERCENTILE ANALYSIS`);
  console.log(`${'═'.repeat(100)}`);
  console.log(`  ${'Model/Method'.padEnd(35)} │   P50   │   P95   │   P99   │   Avg`);
  console.log(`${'─'.repeat(100)}`);

  for (const [modelId, methodResults] of Object.entries(modelResults)) {
    for (const [method, r] of Object.entries(methodResults)) {
      if (!r || !r.available || !r.stats) continue;
      const key = `${modelId}/${method}`.padEnd(35);
      const p50 = r.stats.p50.toFixed(0).padStart(5) + 'ms';
      const p95 = r.stats.p95.toFixed(0).padStart(5) + 'ms';
      const p99 = r.stats.p99.toFixed(0).padStart(5) + 'ms';
      const avg = r.stats.avg.toFixed(0).padStart(5) + 'ms';
      console.log(`  ${key} │ ${p50} │ ${p95} │ ${p99} │ ${avg}`);
    }
  }
  console.log(`${'═'.repeat(100)}`);
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
  console.log(`  Embed server: ${getEmbedServerUrl()}`);
  console.log(`${'─'.repeat(80)}`);

  // Check embed server
  const serverAvailable = await checkEmbedServerHealth();
  if (!serverAvailable && (methods.includes('fastembed') || methods.includes('sentence-transformers'))) {
    console.log(`\n  ⚠️ Embed server not available at ${getEmbedServerUrl()}`);
    console.log(`     Run: python scripts/embed-server.py --port 5555`);
    console.log(`${'─'.repeat(80)}`);
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
      console.log(`  ✅ Cohere avg latency: ${cohereLatency.avg.toFixed(2)}ms`);
    }
  }

  // Warmup if requested
  if (warmup && serverAvailable) {
    await warmupModels(models);
  }

  // Benchmark new models
  const modelResults = {};
  const qualityResults = {};

  for (const modelId of models) {
    if (!MODELS[modelId]) {
      console.log(`\n  ⚠️ Unknown model: ${modelId}`);
      continue;
    }

    modelResults[modelId] = {};

    for (const method of methods) {
      const result = await benchmarkModelMethod(modelId, method, iterations);
      modelResults[modelId][method] = result;

      // Run quality test if benchmark succeeded and Cohere baseline available
      if (result.available && cohereBaseline.available) {
        const modelConfig = MODELS[modelId];
        const embedFn = method === 'tei'
          ? (text) => embedWithTEI(modelId, text, modelConfig)
          : (text) => embedWithServer(method, modelId, text, modelConfig);

        console.log(`  Running quality test for ${modelId}/${method}...`);
        const qualityResult = await runQualityTest(embedFn, cohereBaseline);
        qualityResults[`${modelId}/${method}`] = qualityResult;
        result.quality = qualityResult;

        if (!qualityResult.error) {
          console.log(`  ✅ Top-3 Recall: ${(qualityResult.avgTopKRecall * 100).toFixed(0)}% | Spearman: ${qualityResult.avgSpearman.toFixed(2)}`);
        }
      }
    }
  }

  // Print detailed quality analysis
  if (cohereBaseline.available && Object.keys(qualityResults).length > 0) {
    printQualityAnalysis(qualityResults, cohereBaseline);
  }

  // Print comparison table with Cohere column
  printComparisonTable(modelResults, cohereLatency);

  // Print latency percentiles
  printLatencyPercentiles(modelResults);

  // Benchmark legacy providers (excluding cohere which we already did)
  const legacyResults = {};
  const legacyToTest = legacy.filter(p => p !== 'cohere');

  if (legacyToTest.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  Testing legacy providers...`);

    for (const provider of legacyToTest) {
      if (!LEGACY_PROVIDERS[provider]) {
        console.log(`  ⚠️ Unknown legacy provider: ${provider}`);
        continue;
      }
      legacyResults[provider] = await benchmarkLegacyProvider(provider, iterations);
    }

    printLegacyResults(legacyResults);
  }

  console.log('');

  return { modelResults, legacyResults, qualityResults, cohereBaseline };
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
  --embed-server=URL       Embed server URL (default: ${getEmbedServerUrl()})

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
