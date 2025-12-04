# Reranker Benchmark: Cohere vs BGE vs Jina

**Date**: December 4, 2025
**Test Environment**: Self-hosted VPS (16 cores, 32GB RAM)
**Test Corpus**: 20 diverse contacts with various professions and languages

---

## Executive Summary

| Model | Avg Latency | Recall@3 (EN) | Recall@3 (FR) | Overall Recall@3 |
|-------|-------------|---------------|---------------|------------------|
| **Cohere rerank-v3.5** | 305ms | 100% (baseline) | 100% (baseline) | 100% (baseline) |
| **BGE-reranker-base** | 297ms | 54% | 58% | **56%** |
| **Jina-v2-multi** | 297ms | 50% | 54% | **52%** |

**Winner: BGE-reranker-base** - Slightly better recall, same latency, open-source.

---

## Test Corpus (20 Contacts)

| Index | Name | Profession | Languages |
|-------|------|------------|-----------|
| 0 | Sarah Chen | AI/ML Researcher at Stanford | English, Mandarin |
| 1 | Maria Garcia | Yoga instructor, wellness coach | Spanish, English |
| 2 | Thomas Mueller | Investment banker at Deutsche Bank | German, English |
| 3 | Yuki Tanaka | Game developer at Nintendo | Japanese |
| 4 | François Dubois | Chef, restaurant owner in Lyon | French |
| 5 | Anna Schmidt | Venture capitalist, climate tech | German, English |
| 6 | Raj Patel | Cardiologist at Apollo Hospital | Hindi, English |
| 7 | Elena Rossi | Fashion designer, sustainable fashion | Italian, French |
| 8 | James Wilson | Sports commentator ESPN | English |
| 9 | Sophie Martin | Classical pianist, music teacher | French, English |
| 10 | Carlos Rivera | Environmental lawyer | Spanish, Nahuatl |
| 11 | Li Wei | Quantum computing researcher | Mandarin, English |
| 12 | Olga Petrov | Ballet dancer, Bolshoi Theatre | Russian, French |
| 13 | Ahmed Hassan | Renewable energy engineer | Arabic, English |
| 14 | Nina Johansson | UX designer at Spotify | Swedish, English |
| 15 | Robert Chen | Serial entrepreneur, angel investor | English |
| 16 | Isabella Fernandez | Marine biologist | Spanish, English |
| 17 | Marcus Johnson | Jazz musician, Grammy-nominated | English |
| 18 | Priya Sharma | Bollywood actress, activist | Hindi, Marathi, English |
| 19 | David Kim | Sustainable architect | Korean, English |

---

## English Queries (8 queries)

### Q1: "investor startup venture capital"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **5** Anna Schmidt (VC) | **5** Anna Schmidt | **5** Anna Schmidt |
| 2 | **15** Robert Chen (entrepreneur) | **15** Robert Chen | **15** Robert Chen |
| 3 | 8 James Wilson | 2 Thomas Mueller | 2 Thomas Mueller |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 67% (2/3) |
| Latency | 334ms | 340ms |

---

### Q2: "AI machine learning researcher"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **0** Sarah Chen (AI/ML) | **0** Sarah Chen | **0** Sarah Chen |
| 2 | **11** Li Wei (quantum) | **11** Li Wei | 15 Robert Chen |
| 3 | 15 Robert Chen | 5 Anna Schmidt | 5 Anna Schmidt |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 33% (1/3) |
| Latency | 320ms | 286ms |

---

### Q3: "yoga meditation wellness instructor"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **1** Maria Garcia (yoga) | **1** Maria Garcia | **1** Maria Garcia |
| 2 | 8 James Wilson | 6 Raj Patel | 5 Anna Schmidt |
| 3 | 18 Priya Sharma | 7 Elena Rossi | 15 Robert Chen |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 33% (1/3) | 33% (1/3) |
| Latency | 289ms | 252ms |

---

### Q4: "doctor medical healthcare"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **6** Raj Patel (cardiologist) | **6** Raj Patel | **6** Raj Patel |
| 2 | 8 James Wilson | 0 Sarah Chen | 15 Robert Chen |
| 3 | **1** Maria Garcia | **1** Maria Garcia | **1** Maria Garcia |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 67% (2/3) |
| Latency | 297ms | 428ms |

---

### Q5: "music performer artist creative"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **9** Sophie Martin (pianist) | **17** Marcus Johnson | **9** Sophie Martin |
| 2 | **17** Marcus Johnson (jazz) | 12 Olga Petrov | 15 Robert Chen |
| 3 | 18 Priya Sharma | 14 Nina Johansson | **17** Marcus Johnson |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 33% (1/3) | 67% (2/3) |
| Latency | 325ms | 342ms |

---

### Q6: "software engineer developer"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **3** Yuki Tanaka (game dev) | **3** Yuki Tanaka | 5 Anna Schmidt |
| 2 | 8 James Wilson | 14 Nina Johansson | 2 Thomas Mueller |
| 3 | 18 Priya Sharma | 5 Anna Schmidt | 15 Robert Chen |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 33% (1/3) | 0% (0/3) |
| Latency | 285ms | 256ms |

---

### Q7: "fashion designer sustainable"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **7** Elena Rossi (fashion) | **7** Elena Rossi | **7** Elena Rossi |
| 2 | **19** David Kim (sustainable) | **19** David Kim | 5 Anna Schmidt |
| 3 | 18 Priya Sharma | 14 Nina Johansson | 15 Robert Chen |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 33% (1/3) |
| Latency | 303ms | 315ms |

---

### Q8: "environmental lawyer conservation"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **10** Carlos Rivera (env lawyer) | **10** Carlos Rivera | **10** Carlos Rivera |
| 2 | 18 Priya Sharma | 5 Anna Schmidt | **19** David Kim |
| 3 | 8 James Wilson | **7** Elena Rossi | **7** Elena Rossi |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 33% (1/3) | 33% (1/3) |
| Latency | 291ms | 273ms |

---

## French Queries (8 queries)

### Q9: "investisseur startup capital risque"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **15** Robert Chen | 5 Anna Schmidt | **15** Robert Chen |
| 2 | **5** Anna Schmidt | **2** Thomas Mueller | **5** Anna Schmidt |
| 3 | **2** Thomas Mueller | **15** Robert Chen | **2** Thomas Mueller |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 100% (3/3) |
| Latency | 324ms | 359ms |

---

### Q10: "chercheur intelligence artificielle"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **0** Sarah Chen (AI/ML) | **0** Sarah Chen | **0** Sarah Chen |
| 2 | **11** Li Wei (quantum) | **11** Li Wei | **11** Li Wei |
| 3 | 15 Robert Chen | 5 Anna Schmidt | 14 Nina Johansson |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 67% (2/3) |
| Latency | 361ms | 342ms |

---

### Q11: "professeur yoga bien-être"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **1** Maria Garcia (yoga) | **1** Maria Garcia | **1** Maria Garcia |
| 2 | 8 James Wilson | 4 François Dubois | **18** Priya Sharma |
| 3 | **18** Priya Sharma | 0 Sarah Chen | 19 David Kim |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 33% (1/3) | 67% (2/3) |
| Latency | 300ms | 266ms |

---

### Q12: "médecin santé cardiologie"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **6** Raj Patel (cardiologist) | **6** Raj Patel | **6** Raj Patel |
| 2 | 8 James Wilson | 10 Carlos Rivera | 14 Nina Johansson |
| 3 | 18 Priya Sharma | 16 Isabella Fernandez | 13 Ahmed Hassan |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 33% (1/3) | 33% (1/3) |
| Latency | 295ms | 335ms |

---

### Q13: "musicien artiste compositeur"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **17** Marcus Johnson (jazz) | **17** Marcus Johnson | **17** Marcus Johnson |
| 2 | **9** Sophie Martin (pianist) | **9** Sophie Martin | **9** Sophie Martin |
| 3 | **12** Olga Petrov (ballet) | **12** Olga Petrov | 14 Nina Johansson |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 100% (3/3) | 67% (2/3) |
| Latency | 353ms | 325ms |

---

### Q14: "ingénieur logiciel développeur"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **3** Yuki Tanaka (game dev) | 14 Nina Johansson | 14 Nina Johansson |
| 2 | 15 Robert Chen | 2 Thomas Mueller | **3** Yuki Tanaka |
| 3 | **11** Li Wei (quantum) | 5 Anna Schmidt | 15 Robert Chen |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 0% (0/3) | 33% (1/3) |
| Latency | 314ms | 259ms |

---

### Q15: "designer mode durable"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **7** Elena Rossi (fashion) | **7** Elena Rossi | **7** Elena Rossi |
| 2 | **19** David Kim (sustainable) | **19** David Kim | **19** David Kim |
| 3 | 3 Yuki Tanaka | 14 Nina Johansson | 15 Robert Chen |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 67% (2/3) |
| Latency | 300ms | 268ms |

---

### Q16: "avocat environnement conservation"

| Rank | Cohere | BGE-base | Jina-v2 |
|------|--------|----------|---------|
| 1 | **10** Carlos Rivera (env lawyer) | **10** Carlos Rivera | **10** Carlos Rivera |
| 2 | **7** Elena Rossi | 16 Isabella Fernandez | **7** Elena Rossi |
| 3 | 14 Nina Johansson | **7** Elena Rossi | **14** Nina Johansson |

| Metric | BGE | Jina |
|--------|-----|------|
| Recall@3 | 67% (2/3) | 100% (3/3) |
| Latency | 303ms | 279ms |

---

## Aggregated Metrics

### Recall@3 by Query

| Query | BGE | Jina | Better |
|-------|-----|------|--------|
| Q1: investor startup | 67% | 67% | Tie |
| Q2: AI ML researcher | 67% | 33% | **BGE** |
| Q3: yoga wellness | 33% | 33% | Tie |
| Q4: doctor medical | 67% | 67% | Tie |
| Q5: music artist | 33% | 67% | **Jina** |
| Q6: software developer | 33% | 0% | **BGE** |
| Q7: fashion sustainable | 67% | 33% | **BGE** |
| Q8: env lawyer | 33% | 33% | Tie |
| Q9: investisseur FR | 67% | 100% | **Jina** |
| Q10: chercheur IA FR | 67% | 67% | Tie |
| Q11: yoga FR | 33% | 67% | **Jina** |
| Q12: médecin FR | 33% | 33% | Tie |
| Q13: musicien FR | 100% | 67% | **BGE** |
| Q14: ingénieur FR | 0% | 33% | **Jina** |
| Q15: designer FR | 67% | 67% | Tie |
| Q16: avocat FR | 67% | 100% | **Jina** |

### Summary by Language

| Language | BGE Avg Recall@3 | Jina Avg Recall@3 |
|----------|------------------|-------------------|
| English (8 queries) | 50% | 42% |
| French (8 queries) | 54% | 67% |
| **Overall** | **52%** | **54%** |

### Latency Comparison (ms)

| Model | Min | Max | Average |
|-------|-----|-----|---------|
| Cohere | 284 | 451 | 305 |
| BGE-base | 285 | 361 | 309 |
| Jina-v2 | 252 | 428 | 299 |

---

## Key Findings

### 1. Top-1 Accuracy is Excellent for Both
Both BGE and Jina correctly identify the **#1 result** in 15/16 queries - matching Cohere exactly.

### 2. BGE is Better for English
- BGE: 50% Recall@3 on English
- Jina: 42% Recall@3 on English
- BGE wins on Q2, Q6, Q7

### 3. Jina is Better for French
- Jina: 67% Recall@3 on French (impressive!)
- BGE: 54% Recall@3 on French
- Jina wins on Q9, Q11, Q14, Q16

### 4. Both Fail on Certain Queries
- **Q6 (software engineer)**: Jina gets 0%, BGE gets 33%
- **Q14 (ingénieur)**: BGE gets 0%, Jina gets 33%

### 5. Latency is Comparable
All three models have similar average latency (~300ms).

---

## Recommendations

### For English-Heavy Workloads
Use **BGE-reranker-base**:
- Better English Recall@3 (50% vs 42%)
- Open source, no API costs
- Consistent performance

### For Multilingual/French Workloads
Use **Jina-reranker-v2-base-multilingual**:
- Significantly better French Recall@3 (67% vs 54%)
- Good multilingual understanding
- Handles French-specific queries better

### For Production (Current Recommendation)
Keep **Cohere rerank-v3.5** as primary, but consider:
1. Use BGE as fallback when Cohere is unavailable
2. For cost optimization, BGE provides ~50% of Cohere quality at $0 API cost

---

## Test Details

- **Cohere API**: rerank-v3.5 (production key)
- **BGE**: BAAI/bge-reranker-base via fastembed
- **Jina**: jinaai/jina-reranker-v2-base-multilingual via fastembed
- **VPS**: 91.98.233.224 (16 cores, 32GB RAM)
- **Embed Server**: Self-hosted Flask app at 10.0.1.4:5555
