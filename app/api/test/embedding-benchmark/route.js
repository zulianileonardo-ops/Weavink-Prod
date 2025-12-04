// app/api/test/embedding-benchmark/route.js
// API endpoint to benchmark embedding providers across multiple models and inference methods
//
// Usage:
//   GET /api/test/embedding-benchmark?iterations=10&models=bge-m3,e5-large&methods=fastembed,tei
//   GET /api/test/embedding-benchmark?warmup=true&warmupRounds=5
//   GET /api/test/embedding-benchmark?legacy=cohere,ollama
//   GET /api/test/embedding-benchmark?batchTest=true&lengthTest=true
//   GET /api/test/embedding-benchmark?quick=true  (fast mode: 3 iterations, no quality)
//   GET /api/test/embedding-benchmark?noQuality=true  (skip Cohere quality tests)
//
// Parameters:
//   - iterations: Number of benchmark iterations per text (default: 10)
//   - models: Comma-separated list of models (default: all)
//   - methods: Comma-separated list of inference methods (default: all)
//   - legacy: Comma-separated list of legacy providers (default: none)
//   - warmup: Whether to warm up models before benchmarking (default: true)
//   - warmupRounds: Number of warmup requests per provider (default: 3)
//   - batchTest: Run batch performance tests (1, 5, 10, 20 items) (default: false)
//   - lengthTest: Run text length impact tests (tiny→max) (default: false)
//   - noQuality: Skip Cohere baseline quality tests (default: false)
//   - quick: Quick mode - 3 iterations, skip quality (default: false)
//
// Response includes:
//   - modelResults: Latency stats with stability (stdDev, CV) and throughput
//   - batchResults: Batch performance data (if batchTest=true)
//   - lengthResults: Text length impact data (if lengthTest=true)
//   - qualityResults: Quality metrics vs Cohere baseline (unless noQuality/quick)

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

// Text length test samples (for lengthTest option)
const TEXT_LENGTH_SAMPLES = {
  tiny: 'AI expert',  // ~10 chars
  short: 'Senior React developer with TypeScript experience',  // ~50 chars
  medium: 'John Smith - Senior React Developer at Google with 10 years experience in JavaScript, TypeScript, and Node.js. Passionate about building scalable web applications and mentoring junior developers.',  // ~200 chars
  long: 'Marie Dupont is a seasoned Marketing Director with over 15 years of experience in B2B SaaS growth strategies. She has led successful campaigns for Fortune 500 companies including Microsoft, Salesforce, and Adobe. Her expertise spans digital marketing, brand positioning, content strategy, and demand generation. Marie holds an MBA from INSEAD and is a frequent speaker at industry conferences including SaaStr and Dreamforce. She is based in Paris, France and speaks fluent English, French, and Spanish. Currently focused on AI-driven marketing automation.',  // ~600 chars
  max: 'Marie Dupont is a seasoned Marketing Director with over 15 years of experience in B2B SaaS growth strategies. She has led successful campaigns for Fortune 500 companies including Microsoft, Salesforce, and Adobe. Her expertise spans digital marketing, brand positioning, content strategy, and demand generation. Marie holds an MBA from INSEAD and is a frequent speaker at industry conferences including SaaStr and Dreamforce. She is based in Paris, France and speaks fluent English, French, and Spanish. Currently focused on AI-driven marketing automation and growth hacking techniques. Previously worked at HubSpot where she built the EMEA marketing team from scratch. Expert in SEO, SEM, social media marketing, email campaigns, and content marketing. Has managed budgets exceeding $10M annually. Known for data-driven decision making and innovative campaign strategies. Regular contributor to Forbes and Harvard Business Review on marketing topics. Board advisor to several startups in the martech space.',  // ~1000 chars
};

// Batch sizes for batch performance testing
const BATCH_SIZES = [1, 5, 10, 20];

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

  // English - Role
  { query: 'React frontend developer', expectedTop3: [1, 3, 13], category: 'role' },
  { query: 'backend engineer Node.js', expectedTop3: [3, 4, 1], category: 'role' },
  { query: 'mobile app developer iOS', expectedTop3: [13, 1, 3], category: 'role' },
  { query: 'data scientist machine learning', expectedTop3: [2, 15, 12], category: 'role' },
  { query: 'DevOps infrastructure engineer', expectedTop3: [4, 8, 3], category: 'role' },
  { query: 'UX UI designer', expectedTop3: [11, 12, 5], category: 'role' },

  // French - Role
  { query: 'développeur frontend React', expectedTop3: [1, 3, 13], category: 'role' },
  { query: 'ingénieur backend', expectedTop3: [3, 4, 8], category: 'role' },
  { query: 'développeur mobile iOS', expectedTop3: [13, 1, 3], category: 'role' },
  { query: 'data scientist intelligence artificielle', expectedTop3: [2, 15, 12], category: 'role' },
  { query: 'ingénieur DevOps cloud', expectedTop3: [4, 8, 3], category: 'role' },
  { query: 'designer UX expérience utilisateur', expectedTop3: [11, 12, 5], category: 'role' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SKILL-BASED QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  // English - Skills
  { query: 'Python programming expert', expectedTop3: [2, 15, 3], category: 'skill' },
  { query: 'JavaScript TypeScript developer', expectedTop3: [1, 3, 13], category: 'skill' },
  { query: 'Kubernetes container orchestration', expectedTop3: [4, 8, 3], category: 'skill' },
  { query: 'machine learning deep learning', expectedTop3: [2, 15, 12], category: 'skill' },
  { query: 'SQL database PostgreSQL', expectedTop3: [3, 2, 4], category: 'skill' },
  { query: 'Figma design systems', expectedTop3: [11, 12, 5], category: 'skill' },

  // French - Skills
  { query: 'expert Python programmation', expectedTop3: [2, 15, 3], category: 'skill' },
  { query: 'développeur JavaScript TypeScript', expectedTop3: [1, 3, 13], category: 'skill' },
  { query: 'Kubernetes orchestration conteneurs', expectedTop3: [4, 8, 3], category: 'skill' },
  { query: 'apprentissage automatique deep learning', expectedTop3: [2, 15, 12], category: 'skill' },
  { query: 'base de données SQL PostgreSQL', expectedTop3: [3, 2, 4], category: 'skill' },
  { query: 'design système Figma', expectedTop3: [11, 12, 5], category: 'skill' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERTISE QUERIES (14 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  // English - Expertise
  { query: 'someone who can help with fundraising', expectedTop3: [16, 17, 10], category: 'expertise' },
  { query: 'expert in scaling startups', expectedTop3: [17, 9, 16], category: 'expertise' },
  { query: 'blockchain smart contracts specialist', expectedTop3: [14, 3, 15], category: 'expertise' },
  { query: 'product design user research expert', expectedTop3: [11, 12, 5], category: 'expertise' },
  { query: 'growth hacking marketing specialist', expectedTop3: [5, 6, 9], category: 'expertise' },
  { query: 'AI natural language processing researcher', expectedTop3: [15, 2, 12], category: 'expertise' },
  { query: 'talent acquisition recruiting expert', expectedTop3: [7, 6, 5], category: 'expertise' },

  // French - Expertise
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

  // English - Company
  { query: 'people from Google', expectedTop3: [1, 8, 17], category: 'company' },
  { query: 'worked at Meta Facebook', expectedTop3: [2, 1, 15], category: 'company' },
  { query: 'Amazon AWS experience', expectedTop3: [4, 3, 8], category: 'company' },
  { query: 'Stripe payment company', expectedTop3: [3, 10, 14], category: 'company' },
  { query: 'Y Combinator alumni', expectedTop3: [9, 17, 16], category: 'company' },

  // French - Company
  { query: 'personnes de chez Google', expectedTop3: [1, 8, 17], category: 'company' },
  { query: 'a travaillé chez Meta Facebook', expectedTop3: [2, 1, 15], category: 'company' },
  { query: 'expérience Amazon AWS', expectedTop3: [4, 3, 8], category: 'company' },
  { query: 'entreprise paiement Stripe', expectedTop3: [3, 10, 14], category: 'company' },
  { query: 'anciens de Y Combinator', expectedTop3: [9, 17, 16], category: 'company' },

  // ═══════════════════════════════════════════════════════════════════════════
  // INDUSTRY QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  // English - Industry
  { query: 'fintech financial technology', expectedTop3: [10, 3, 14], category: 'industry' },
  { query: 'automotive car industry', expectedTop3: [19, 8, 4], category: 'industry' },
  { query: 'e-commerce online retail', expectedTop3: [20, 5, 12], category: 'industry' },
  { query: 'healthcare medical technology', expectedTop3: [2, 15, 7], category: 'industry' },
  { query: 'SaaS software as a service', expectedTop3: [5, 16, 9], category: 'industry' },
  { query: 'media entertainment streaming', expectedTop3: [12, 11, 5], category: 'industry' },

  // French - Industry
  { query: 'fintech technologie financière', expectedTop3: [10, 3, 14], category: 'industry' },
  { query: 'industrie automobile voiture', expectedTop3: [19, 8, 4], category: 'industry' },
  { query: 'e-commerce commerce en ligne', expectedTop3: [20, 5, 12], category: 'industry' },
  { query: 'santé technologie médicale', expectedTop3: [2, 15, 7], category: 'industry' },
  { query: 'SaaS logiciel en tant que service', expectedTop3: [5, 16, 9], category: 'industry' },
  { query: 'média divertissement streaming', expectedTop3: [12, 11, 5], category: 'industry' },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEADERSHIP QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  // English - Leadership
  { query: 'CEO founder startup', expectedTop3: [9, 17, 8], category: 'leadership' },
  { query: 'CTO technical leader', expectedTop3: [8, 4, 3], category: 'leadership' },
  { query: 'CFO finance executive', expectedTop3: [10, 16, 6], category: 'leadership' },
  { query: 'VP sales director', expectedTop3: [6, 18, 5], category: 'leadership' },
  { query: 'investor venture capital partner', expectedTop3: [16, 17, 10], category: 'leadership' },
  { query: 'board member advisor', expectedTop3: [16, 17, 9], category: 'leadership' },

  // French - Leadership
  { query: 'PDG fondateur startup', expectedTop3: [9, 17, 8], category: 'leadership' },
  { query: 'directeur technique CTO', expectedTop3: [8, 4, 3], category: 'leadership' },
  { query: 'directeur financier CFO', expectedTop3: [10, 16, 6], category: 'leadership' },
  { query: 'directeur commercial ventes', expectedTop3: [6, 18, 5], category: 'leadership' },
  { query: 'investisseur capital risque', expectedTop3: [16, 17, 10], category: 'leadership' },
  { query: 'membre conseil administration', expectedTop3: [16, 17, 9], category: 'leadership' },

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE QUERIES (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  // English - Language
  { query: 'French speaking contacts', expectedTop3: [18, 5, 8], category: 'language' },
  { query: 'speaks German fluently', expectedTop3: [19, 7, 17], category: 'language' },
  { query: 'Chinese Mandarin speaker', expectedTop3: [20, 2, 15], category: 'language' },
  { query: 'bilingual English French', expectedTop3: [5, 18, 8], category: 'language' },
  { query: 'multilingual international', expectedTop3: [20, 18, 19], category: 'language' },

  // French - Language
  { query: 'contacts francophones', expectedTop3: [18, 5, 8], category: 'language' },
  { query: 'parle allemand couramment', expectedTop3: [19, 7, 17], category: 'language' },
  { query: 'locuteur chinois mandarin', expectedTop3: [20, 2, 15], category: 'language' },
  { query: 'bilingue anglais français', expectedTop3: [5, 18, 8], category: 'language' },
  { query: 'multilingue international', expectedTop3: [20, 18, 19], category: 'language' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICAL QUERIES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  // English - Technical
  { query: 'API development REST GraphQL', expectedTop3: [3, 4, 1], category: 'technical' },
  { query: 'cloud architecture AWS Azure', expectedTop3: [4, 8, 3], category: 'technical' },
  { query: 'microservices distributed systems', expectedTop3: [3, 4, 8], category: 'technical' },
  { query: 'CI/CD pipeline automation', expectedTop3: [4, 8, 3], category: 'technical' },
  { query: 'security cybersecurity expert', expectedTop3: [4, 3, 14], category: 'technical' },
  { query: 'performance optimization scalability', expectedTop3: [1, 3, 4], category: 'technical' },

  // French - Technical
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

/**
 * Batch embed via embed server
 */
async function embedBatchWithServer(method, texts, modelConfig) {
  const processedTexts = texts.map(text => preprocessText(text, modelConfig));

  const payload = {
    method,
    model: modelConfig.name,
    texts: processedTexts,
  };

  if (modelConfig.promptName) {
    payload.prompt_name = modelConfig.promptName;
  }
  if (modelConfig.trustRemoteCode) {
    payload.trust_remote_code = true;
  }

  const response = await fetch(`${EMBED_SERVER_URL}/embed-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings;
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
  if (times.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, stdDev: 0, cv: 0 };

  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  // Standard deviation
  const squaredDiffs = times.map(t => Math.pow(t - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / times.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (CV) - relative measure of variability
  const cv = avg > 0 ? (stdDev / avg) * 100 : 0;  // as percentage

  return {
    min: Math.min(...times).toFixed(2),
    max: Math.max(...times).toFixed(2),
    avg: avg.toFixed(2),
    p50: sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
    p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2),
    stdDev: stdDev.toFixed(2),
    cv: cv.toFixed(2),
  };
}

/**
 * Calculate throughput (embeddings per second)
 */
function calcThroughput(totalEmbeddings, totalTimeMs) {
  if (totalTimeMs <= 0) return 0;
  return (totalEmbeddings / totalTimeMs) * 1000;
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
  for (const queryObj of TEST_QUERIES) {
    const query = queryObj.query;
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
  for (const queryObj of TEST_QUERIES) {
    const query = queryObj.query;
    const top3 = baseline.queryRankings[query].slice(0, 3).map(r => r.name);
    console.log(`    "${query}" → [${top3.join(', ')}]`);
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
 */
function printQualityAnalysis(qualityResults, cohereBaseline) {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`  🔍 RETRIEVAL QUALITY ANALYSIS (Cohere = baseline)`);
  console.log(`${'═'.repeat(100)}`);

  for (const queryObj of TEST_QUERIES) {
    const query = queryObj.query;
    const cohereTop3 = cohereBaseline.queryRankings[query].slice(0, 3).map(r => r.name);
    console.log(`\n  Query: "${query}" [${queryObj.category}]`);
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

  // Get unique categories
  const categories = [...new Set(TEST_QUERIES.map(q => q.category))];

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
// Batch Performance Testing
// ============================================================================

/**
 * Benchmark batch embedding performance for different batch sizes
 */
async function benchmarkBatchPerformance(modelId, method, iterations = 5) {
  const modelConfig = MODELS[modelId];
  if (!modelConfig) return null;

  // TEI doesn't support batching through our interface
  if (method === 'tei') {
    return { error: 'TEI batch testing not supported' };
  }

  const status = await checkMethodAvailability(modelId, method);
  if (!status.available) {
    return { error: status.error };
  }

  const results = {};

  for (const batchSize of BATCH_SIZES) {
    const batch = [];
    for (let i = 0; i < batchSize; i++) {
      batch.push(TEST_TEXTS[i % TEST_TEXTS.length]);
    }

    const timings = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await embedBatchWithServer(method, batch, modelConfig);
        timings.push(performance.now() - start);
      } catch (err) {
        // If batch endpoint not available, try sequential fallback
        if (i === 0) {
          const seqStart = performance.now();
          for (const text of batch) {
            await embedWithServer(method, text, modelConfig);
          }
          timings.push(performance.now() - seqStart);
        }
      }
    }

    if (timings.length > 0) {
      const stats = calcStats(timings);
      const avgMs = parseFloat(stats.avg);
      results[`batch_${batchSize}`] = {
        batchSize,
        avgMs,
        p95Ms: parseFloat(stats.p95),
        perItemMs: avgMs / batchSize,
        throughput: calcThroughput(batchSize, avgMs),
      };
    }
  }

  return results;
}

// ============================================================================
// Text Length Impact Testing
// ============================================================================

/**
 * Benchmark how text length affects latency
 */
async function benchmarkTextLengthImpact(modelId, method, iterations = 5) {
  const modelConfig = MODELS[modelId];
  if (!modelConfig) return null;

  const status = await checkMethodAvailability(modelId, method);
  if (!status.available) {
    return { error: status.error };
  }

  const embedFn = method === 'tei'
    ? (text) => embedWithTEI(modelId, text, modelConfig)
    : (text) => embedWithServer(method, text, modelConfig);

  const results = {};

  for (const [lengthName, text] of Object.entries(TEXT_LENGTH_SAMPLES)) {
    const timings = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await embedFn(text);
        timings.push(performance.now() - start);
      } catch {
        // Skip failed
      }
    }

    if (timings.length > 0) {
      const stats = calcStats(timings);
      const avgMs = parseFloat(stats.avg);
      results[lengthName] = {
        charCount: text.length,
        avgMs,
        p95Ms: parseFloat(stats.p95),
        msPerChar: avgMs / text.length,
      };
    }
  }

  return results;
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
  const batchTest = searchParams.get('batchTest') === 'true';
  const lengthTest = searchParams.get('lengthTest') === 'true';
  const noQuality = searchParams.get('noQuality') === 'true';
  const quick = searchParams.get('quick') === 'true';

  // Quick mode reduces iterations and skips quality tests
  const effectiveIterations = quick ? 3 : iterations;
  const skipQuality = quick || noQuality;

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
  console.log(`  Iterations: ${effectiveIterations}${quick ? ' (quick mode)' : ''}`);
  console.log(`  Models: ${models.join(', ')}`);
  console.log(`  Methods: ${methods.join(', ')}`);
  console.log(`  Legacy: ${legacy.length > 0 ? legacy.join(', ') : 'none'}`);
  console.log(`  Warmup: ${warmup ? 'enabled' : 'disabled'}`);
  console.log(`  Batch Test: ${batchTest ? 'enabled' : 'disabled'}`);
  console.log(`  Length Test: ${lengthTest ? 'enabled' : 'disabled'}`);
  console.log(`  Quality Test: ${skipQuality ? 'disabled' : 'enabled'}`);
  console.log(`${'─'.repeat(80)}`);

  try {
    // Check embed server
    const serverAvailable = await checkEmbedServerHealth();
    if (!serverAvailable && (methods.includes('fastembed') || methods.includes('sentence-transformers'))) {
      console.log(`\n  ⚠️ Embed server not available at ${EMBED_SERVER_URL}`);
    }

    // Generate Cohere baseline for quality testing (skip if noQuality or quick)
    let cohereBaseline = { available: false };
    let cohereLatency = null;
    if (!skipQuality) {
      cohereBaseline = await generateCohereBaseline();

      // Benchmark Cohere itself (for latency comparison)
      if (cohereBaseline.available) {
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`  ⏱️  BENCHMARKING COHERE LATENCY...`);
        const cohereBenchmark = await benchmarkLegacyProvider('cohere', effectiveIterations);
        if (cohereBenchmark.available) {
          cohereLatency = cohereBenchmark.stats;
          console.log(`  ✅ Cohere avg latency: ${cohereLatency.avg}ms`);
        }
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
    const batchResults = {};
    const lengthResults = {};

    for (const modelId of models) {
      modelResults[modelId] = {};
      for (const method of methods) {
        const result = await benchmarkModelMethod(modelId, method, effectiveIterations);
        modelResults[modelId][method] = result;

        // Run quality test if benchmark succeeded and Cohere baseline available
        if (result.available && cohereBaseline.available && !skipQuality) {
          const modelConfig = MODELS[modelId];
          const embedFn = method === 'tei'
            ? (text) => embedWithTEI(modelId, text, modelConfig)
            : (text) => embedWithServer(method, text, modelConfig);

          console.log(`  Running quality test for ${modelId}/${method}...`);
          const qualityResult = await runQualityTest(embedFn, cohereBaseline);
          qualityResults[`${modelId}/${method}`] = qualityResult;
          result.quality = qualityResult;

          if (!qualityResult.error) {
            console.log(`  ✅ Recall: ${(qualityResult.avgTopKRecall * 100).toFixed(0)}% | MRR: ${qualityResult.avgMRR.toFixed(2)} | Spearman: ${qualityResult.avgSpearman.toFixed(2)}`);
          }
        }

        // Run batch performance test if enabled
        if (batchTest && result.available) {
          console.log(`  Running batch test for ${modelId}/${method}...`);
          const batchResult = await benchmarkBatchPerformance(modelId, method, 5);
          batchResults[`${modelId}/${method}`] = batchResult;
          result.batchPerformance = batchResult;
        }

        // Run text length impact test if enabled
        if (lengthTest && result.available) {
          console.log(`  Running length test for ${modelId}/${method}...`);
          const lengthResult = await benchmarkTextLengthImpact(modelId, method, 5);
          lengthResults[`${modelId}/${method}`] = lengthResult;
          result.lengthImpact = lengthResult;
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
        legacyResults[provider] = await benchmarkLegacyProvider(provider, effectiveIterations);
      }
    }

    // Print detailed quality analysis
    if (cohereBaseline.available && Object.keys(qualityResults).length > 0 && !skipQuality) {
      printQualityAnalysis(qualityResults, cohereBaseline);
    }

    // Print comparison table with Cohere column and quality
    const allMethods = [...methods, 'cohere'];
    console.log(`\n${'═'.repeat(120)}`);
    console.log(`  📊 MODEL × INFERENCE METHOD COMPARISON (latency/recall/mrr)`);
    console.log(`${'═'.repeat(120)}`);
    console.log(`  ${'Model'.padEnd(20)} │${allMethods.map(m => m.substring(0, 14).padStart(18)).join(' │')}`);
    console.log(`${'─'.repeat(120)}`);

    for (const [modelId, methodResults] of Object.entries(modelResults)) {
      let row = `  ${modelId.padEnd(20)} │`;
      for (const method of methods) {
        const r = methodResults[method];
        let val;
        if (!r?.available) {
          val = '❌ N/A';
        } else if (r.quality && !r.quality.error) {
          const recallPct = (r.quality.avgTopKRecall * 100).toFixed(0);
          const mrr = r.quality.avgMRR.toFixed(2);
          val = `${r.stats.avg}ms/${recallPct}%/${mrr}`;
        } else {
          val = `${r.stats.avg}ms`;
        }
        row += val.padStart(18) + ' │';
      }
      // Cohere column (baseline)
      if (cohereLatency) {
        row += `${cohereLatency.avg}ms ★`.padStart(18) + ' │';
      } else {
        row += '❌ N/A'.padStart(18) + ' │';
      }
      console.log(row);
    }
    console.log(`${'═'.repeat(120)}`);
    console.log(`  Format: latency/recall/MRR | Quality = Top-3 Recall vs Cohere baseline (★ = reference)`);
    console.log(`${'═'.repeat(120)}\n`);

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
          // Calculate throughput
          const totalTime = r.timings?.reduce((a, b) => a + b, 0) || 0;
          const throughput = totalTime > 0 ? calcThroughput(r.timings.length, totalTime) : 0;

          const entry = {
            avgLatency: `${r.stats.avg}ms`,
            p95Latency: `${r.stats.p95}ms`,
            coldStart: `${r.coldStart}ms`,
            dimension: r.actualDimension,
            // Stability metrics
            stability: {
              stdDev: `${r.stats.stdDev}ms`,
              cv: `${r.stats.cv}%`,
              status: parseFloat(r.stats.cv) < 15 ? 'stable' : parseFloat(r.stats.cv) < 30 ? 'moderate' : 'unstable',
            },
            // Throughput
            throughput: `${throughput.toFixed(1)} emb/s`,
            totalEmbeddings: r.timings?.length || 0,
          };
          // Add quality metrics if available
          if (r.quality && !r.quality.error) {
            entry.quality = {
              topKRecall: r.quality.avgTopKRecall,
              spearman: r.quality.avgSpearman,
              mrr: r.quality.avgMRR,
              precisionAtK: r.quality.avgPrecisionAtK,
              perCategory: r.quality.perCategory,
            };
          }
          // Add batch performance if available
          if (r.batchPerformance && !r.batchPerformance.error) {
            entry.batchPerformance = r.batchPerformance;
          }
          // Add length impact if available
          if (r.lengthImpact && !r.lengthImpact.error) {
            entry.lengthImpact = r.lengthImpact;
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
    const qualityAnalysis = TEST_QUERIES.map(queryObj => {
      const query = queryObj.query;
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
            mrr: qResult.mrr,
            precisionAtK: qResult.precisionAtK,
          });
        }
      }

      return {
        query,
        category: queryObj.category,
        expectedTop3: queryObj.expectedTop3,
        cohereRanking,
        comparisons,
      };
    });

    return Response.json({
      success: true,
      config: {
        iterations: effectiveIterations,
        models,
        methods,
        legacy,
        warmup,
        batchTest,
        lengthTest,
        noQuality,
        quick,
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
      qualityResults: skipQuality ? {} : qualityResults,
      qualityAnalysis: skipQuality ? [] : qualityAnalysis,
      batchResults: batchTest ? batchResults : {},
      lengthResults: lengthTest ? lengthResults : {},
      summary,
    });
  } catch (error) {
    console.error('❌ [Embedding Benchmark] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
