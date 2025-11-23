// lib/services/serviceContact/server/data/commonContactTags.js
// Common contact tags and query expansions for instant cache hits
// Used by both QueryEnhancementService and AutoTaggingService
// Separated from service logic for easier maintenance and expansion

/**
 * Static cache for common business terms and contact patterns
 * Provides instant responses for frequently searched terms and tag generation
 *
 * Format:
 * {
 *   'searchTerm': {
 *     // For Query Enhancement
 *     enhancedQuery: 'expanded terms with synonyms',
 *     language: 'language code (eng, fra, spa, etc.)',
 *
 *     // For Auto-Tagging
 *     tags: ['tag1', 'tag2', 'tag3'],
 *
 *     cached: true
 *   }
 * }
 */
export const COMMON_CONTACT_TAGS = {
  // ============================================================================
  // EXECUTIVE ROLES - ENGLISH
  // ============================================================================
  'CEO': {
    enhancedQuery: 'CEO, Chief Executive Officer, President, Managing Director, Executive Director, Company Leader',
    language: 'eng',
    tags: ['executive', 'c-level', 'leadership', 'ceo', 'president', 'senior-management'],
    cached: true
  },
  'CTO': {
    enhancedQuery: 'CTO, Chief Technology Officer, VP Engineering, Head of Technology, Tech Lead, Technology Director',
    language: 'eng',
    tags: ['executive', 'c-level', 'technology', 'cto', 'engineering', 'tech-leadership'],
    cached: true
  },
  'CFO': {
    enhancedQuery: 'CFO, Chief Financial Officer, Finance Director, VP Finance, Financial Controller',
    language: 'eng',
    tags: ['executive', 'c-level', 'finance', 'cfo', 'financial-management', 'accounting'],
    cached: true
  },
  'COO': {
    enhancedQuery: 'COO, Chief Operating Officer, VP Operations, Operations Director',
    language: 'eng',
    tags: ['executive', 'c-level', 'operations', 'coo', 'ops-management', 'business-operations'],
    cached: true
  },
  'CMO': {
    enhancedQuery: 'CMO, Chief Marketing Officer, VP Marketing, Marketing Director, Head of Marketing',
    language: 'eng',
    tags: ['executive', 'c-level', 'marketing', 'cmo', 'brand', 'growth'],
    cached: true
  },
  'CISO': {
    enhancedQuery: 'CISO, Chief Information Security Officer, Security Director, Head of Security, VP Security',
    language: 'eng',
    tags: ['executive', 'c-level', 'security', 'ciso', 'cybersecurity', 'infosec'],
    cached: true
  },
  'CIO': {
    enhancedQuery: 'CIO, Chief Information Officer, IT Director, Head of IT, VP Information Technology',
    language: 'eng',
    tags: ['executive', 'c-level', 'it', 'cio', 'technology', 'information-systems'],
    cached: true
  },
  'CPO': {
    enhancedQuery: 'CPO, Chief Product Officer, VP Product, Product Director, Head of Product',
    language: 'eng',
    tags: ['executive', 'c-level', 'product', 'cpo', 'product-management', 'innovation'],
    cached: true
  },
  'CHRO': {
    enhancedQuery: 'CHRO, Chief Human Resources Officer, HR Director, VP Human Resources, People Director',
    language: 'eng',
    tags: ['executive', 'c-level', 'hr', 'chro', 'people-management', 'talent'],
    cached: true
  },
  'CDO': {
    enhancedQuery: 'CDO, Chief Data Officer, Data Director, Head of Data, VP Data',
    language: 'eng',
    tags: ['executive', 'c-level', 'data', 'cdo', 'analytics', 'data-science'],
    cached: true
  },

  // ============================================================================
  // EXECUTIVE ROLES - FRENCH
  // ============================================================================
  'PDG': {
    enhancedQuery: 'PDG, Président Directeur Général, CEO, Directeur Général, Dirigeant, Chef d\'entreprise',
    language: 'fra',
    tags: ['executive', 'c-level', 'leadership', 'pdg', 'directeur-general', 'dirigeant'],
    cached: true
  },
  'DG': {
    enhancedQuery: 'DG, Directeur Général, General Manager, Managing Director, Directeur',
    language: 'fra',
    tags: ['executive', 'management', 'directeur-general', 'leadership', 'general-manager'],
    cached: true
  },
  'DAF': {
    enhancedQuery: 'DAF, Directeur Administratif et Financier, CFO, Directeur Financier',
    language: 'fra',
    tags: ['executive', 'finance', 'daf', 'directeur-financier', 'comptabilite'],
    cached: true
  },
  'DRH': {
    enhancedQuery: 'DRH, Directeur des Ressources Humaines, CHRO, Responsable RH, HR Director',
    language: 'fra',
    tags: ['executive', 'hr', 'drh', 'ressources-humaines', 'recrutement'],
    cached: true
  },
  'DSI': {
    enhancedQuery: 'DSI, Directeur des Systèmes d\'Information, CIO, IT Director, Responsable Informatique',
    language: 'fra',
    tags: ['executive', 'it', 'dsi', 'systemes-information', 'informatique'],
    cached: true
  },

  // ============================================================================
  // COMMON ROLES - ENGLISH
  // ============================================================================
  'founder': {
    enhancedQuery: 'Founder, Co-Founder, Startup Founder, Entrepreneur, Business Owner, Company Founder',
    language: 'eng',
    tags: ['founder', 'entrepreneur', 'startup', 'co-founder', 'business-owner', 'leadership'],
    cached: true
  },
  'engineer': {
    enhancedQuery: 'Engineer, Software Engineer, Developer, Programmer, Software Developer, Tech Engineer',
    language: 'eng',
    tags: ['engineer', 'software-engineer', 'developer', 'technical', 'programming', 'coding'],
    cached: true
  },
  'manager': {
    enhancedQuery: 'Manager, Project Manager, Team Lead, Department Manager, Program Manager',
    language: 'eng',
    tags: ['manager', 'management', 'team-lead', 'project-manager', 'leadership'],
    cached: true
  },
  'developer': {
    enhancedQuery: 'Developer, Software Developer, Engineer, Programmer, Coder, Software Engineer',
    language: 'eng',
    tags: ['developer', 'software-developer', 'engineer', 'programming', 'coding', 'technical'],
    cached: true
  },
  'designer': {
    enhancedQuery: 'Designer, UX Designer, UI Designer, Product Designer, Graphic Designer, Creative Designer',
    language: 'eng',
    tags: ['designer', 'ux-designer', 'ui-designer', 'creative', 'design', 'product-design'],
    cached: true
  },
  'analyst': {
    enhancedQuery: 'Analyst, Business Analyst, Data Analyst, Financial Analyst, Systems Analyst',
    language: 'eng',
    tags: ['analyst', 'business-analyst', 'data-analyst', 'analysis', 'research'],
    cached: true
  },
  'consultant': {
    enhancedQuery: 'Consultant, Business Consultant, Strategy Consultant, Management Consultant, Advisor',
    language: 'eng',
    tags: ['consultant', 'advisor', 'strategy', 'consulting', 'business-consultant'],
    cached: true
  },
  'director': {
    enhancedQuery: 'Director, Senior Director, Managing Director, Executive Director, Department Director',
    language: 'eng',
    tags: ['director', 'senior-management', 'leadership', 'executive', 'management'],
    cached: true
  },
  'VP': {
    enhancedQuery: 'VP, Vice President, Senior Vice President, Executive Vice President, SVP, EVP',
    language: 'eng',
    tags: ['vp', 'vice-president', 'executive', 'senior-management', 'leadership'],
    cached: true
  },
  'lead': {
    enhancedQuery: 'Lead, Team Lead, Tech Lead, Project Lead, Development Lead, Engineering Lead',
    language: 'eng',
    tags: ['lead', 'team-lead', 'tech-lead', 'leadership', 'management', 'senior'],
    cached: true
  },

  // ============================================================================
  // COMMON ROLES - FRENCH
  // ============================================================================
  'fondateur': {
    enhancedQuery: 'Fondateur, Co-Fondateur, Entrepreneur, Créateur, Chef d\'entreprise, Founder',
    language: 'fra',
    tags: ['fondateur', 'entrepreneur', 'startup', 'co-fondateur', 'createur'],
    cached: true
  },
  'ingénieur': {
    enhancedQuery: 'Ingénieur, Engineer, Développeur, Developer, Technicien, Ingénieur logiciel',
    language: 'fra',
    tags: ['ingenieur', 'engineer', 'developpeur', 'technique', 'programmation'],
    cached: true
  },
  'développeur': {
    enhancedQuery: 'Développeur, Developer, Programmeur, Ingénieur logiciel, Codeur, Software Engineer',
    language: 'fra',
    tags: ['developpeur', 'developer', 'programmeur', 'technique', 'coding'],
    cached: true
  },
  'responsable': {
    enhancedQuery: 'Responsable, Manager, Chef de projet, Directeur, Team Lead, Superviseur',
    language: 'fra',
    tags: ['responsable', 'manager', 'chef-de-projet', 'management', 'leadership'],
    cached: true
  },
  'directeur': {
    enhancedQuery: 'Directeur, Director, Manager, Responsable, Chef de service, Dirigeant',
    language: 'fra',
    tags: ['directeur', 'director', 'management', 'leadership', 'dirigeant'],
    cached: true
  },

  // ============================================================================
  // TECHNOLOGIES & DOMAINS
  // ============================================================================
  'AI': {
    enhancedQuery: 'AI, Artificial Intelligence, Machine Learning, ML, Deep Learning, Neural Networks',
    language: 'eng',
    tags: ['ai', 'artificial-intelligence', 'machine-learning', 'ml', 'deep-learning', 'technology'],
    cached: true
  },
  'blockchain': {
    enhancedQuery: 'Blockchain, Crypto, Web3, Cryptocurrency, DeFi, Distributed Ledger',
    language: 'eng',
    tags: ['blockchain', 'crypto', 'web3', 'cryptocurrency', 'defi', 'technology'],
    cached: true
  },
  'cloud': {
    enhancedQuery: 'Cloud, Cloud Computing, AWS, Azure, GCP, Cloud Infrastructure, SaaS',
    language: 'eng',
    tags: ['cloud', 'cloud-computing', 'aws', 'azure', 'gcp', 'saas', 'infrastructure'],
    cached: true
  },
  'data science': {
    enhancedQuery: 'Data Science, Data Analytics, Machine Learning, Big Data, Data Engineering, AI',
    language: 'eng',
    tags: ['data-science', 'data-analytics', 'machine-learning', 'big-data', 'analytics'],
    cached: true
  },
  'cybersecurity': {
    enhancedQuery: 'Cybersecurity, Security, InfoSec, Information Security, Network Security, Cyber Defense',
    language: 'eng',
    tags: ['cybersecurity', 'security', 'infosec', 'network-security', 'cyber-defense'],
    cached: true
  },
  'fintech': {
    enhancedQuery: 'Fintech, Financial Technology, Digital Banking, Payments, Finance Innovation, Banking Tech',
    language: 'eng',
    tags: ['fintech', 'financial-technology', 'digital-banking', 'payments', 'finance'],
    cached: true
  },
  'marketing': {
    enhancedQuery: 'Marketing, Digital Marketing, Growth Marketing, Marketing Strategy, Brand Marketing, Content Marketing',
    language: 'eng',
    tags: ['marketing', 'digital-marketing', 'growth-marketing', 'brand', 'content-marketing'],
    cached: true
  },
  'sales': {
    enhancedQuery: 'Sales, Business Development, Account Manager, Sales Manager, Commercial, Revenue',
    language: 'eng',
    tags: ['sales', 'business-development', 'account-manager', 'commercial', 'revenue'],
    cached: true
  },
  'product': {
    enhancedQuery: 'Product, Product Manager, Product Management, Product Development, Product Strategy',
    language: 'eng',
    tags: ['product', 'product-manager', 'product-management', 'product-development', 'strategy'],
    cached: true
  },
  'startup': {
    enhancedQuery: 'Startup, Tech Startup, Entrepreneur, Early Stage, Venture, Innovation',
    language: 'eng',
    tags: ['startup', 'tech-startup', 'entrepreneur', 'early-stage', 'venture', 'innovation'],
    cached: true
  },

  // ============================================================================
  // PROGRAMMING LANGUAGES & FRAMEWORKS
  // ============================================================================
  'javascript': {
    enhancedQuery: 'JavaScript, JS, Node.js, React, Vue, Angular, TypeScript, Frontend, Backend',
    language: 'eng',
    tags: ['javascript', 'js', 'nodejs', 'react', 'frontend', 'backend', 'programming'],
    cached: true
  },
  'python': {
    enhancedQuery: 'Python, Django, Flask, Data Science, Machine Learning, Backend, Automation',
    language: 'eng',
    tags: ['python', 'django', 'flask', 'data-science', 'machine-learning', 'programming'],
    cached: true
  },
  'java': {
    enhancedQuery: 'Java, Spring, Spring Boot, Enterprise, Backend, J2EE, Android',
    language: 'eng',
    tags: ['java', 'spring', 'enterprise', 'backend', 'android', 'programming'],
    cached: true
  },
  'react': {
    enhancedQuery: 'React, React.js, ReactJS, Frontend, JavaScript, Web Development, UI Development',
    language: 'eng',
    tags: ['react', 'reactjs', 'frontend', 'javascript', 'web-development', 'ui'],
    cached: true
  },
  'nodejs': {
    enhancedQuery: 'Node.js, NodeJS, JavaScript, Backend, Express, API Development, Server-side',
    language: 'eng',
    tags: ['nodejs', 'javascript', 'backend', 'express', 'api', 'server-side'],
    cached: true
  },

  // ============================================================================
  // INDUSTRIES
  // ============================================================================
  'healthcare': {
    enhancedQuery: 'Healthcare, Health Tech, Medical, Pharma, Biotech, Digital Health, MedTech',
    language: 'eng',
    tags: ['healthcare', 'health-tech', 'medical', 'pharma', 'biotech', 'medtech'],
    cached: true
  },
  'ecommerce': {
    enhancedQuery: 'E-commerce, Online Retail, Digital Commerce, Retail Tech, Shopping, Marketplace',
    language: 'eng',
    tags: ['ecommerce', 'online-retail', 'digital-commerce', 'retail-tech', 'marketplace'],
    cached: true
  },
  'education': {
    enhancedQuery: 'Education, EdTech, E-Learning, Online Learning, Training, Academic, Teaching',
    language: 'eng',
    tags: ['education', 'edtech', 'e-learning', 'online-learning', 'training', 'academic'],
    cached: true
  },
  'real estate': {
    enhancedQuery: 'Real Estate, Property, PropTech, Housing, Construction, Commercial Real Estate',
    language: 'eng',
    tags: ['real-estate', 'property', 'proptech', 'housing', 'construction', 'commercial'],
    cached: true
  },
  'logistics': {
    enhancedQuery: 'Logistics, Supply Chain, Transportation, Delivery, Warehouse, Distribution',
    language: 'eng',
    tags: ['logistics', 'supply-chain', 'transportation', 'delivery', 'warehouse', 'distribution'],
    cached: true
  }
};
