#!/usr/bin/env python3
"""
Persistent embedding server - loads models once at startup.
Supports Fastembed (ONNX) and Sentence Transformers (PyTorch).

Run: python scripts/embed-server.py --port 5555

Dependencies:
  pip install flask fastembed sentence-transformers einops
"""
from flask import Flask, request, jsonify
import argparse
import time
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model caches - loaded on first request or warmup
fastembed_models = {}
st_models = {}
reranker_models = {}

# Fastembed supported models - use exact names from fastembed library
# Full list: https://qdrant.github.io/fastembed/examples/Supported_Models/
# Note: BGE-M3 is NOT supported by fastembed, only by sentence-transformers
# Note: jina-de removed due to ONNX runtime bug: https://github.com/qdrant/fastembed/issues/385
FASTEMBED_SUPPORTED = {
    # 1024-dim models
    'intfloat/multilingual-e5-large',
    'BAAI/bge-base-en-v1.5',
    'BAAI/bge-small-en-v1.5',
    # 768-dim models
    'jinaai/jina-embeddings-v2-base-code',
    'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
}

# Reranker supported models
# fastembed uses TextCrossEncoder, sentence-transformers uses CrossEncoder
RERANKER_SUPPORTED = {
    'fastembed': {
        'BAAI/bge-reranker-base',
        'BAAI/bge-reranker-large',
        'jinaai/jina-reranker-v2-base-multilingual',
        'Xenova/ms-marco-MiniLM-L-6-v2',
        'Xenova/ms-marco-MiniLM-L-12-v2',
    },
    'sentence-transformers': {
        'BAAI/bge-reranker-v2-m3',
        'cross-encoder/ms-marco-MiniLM-L-6-v2',
    }
}


def get_reranker_model(method, model_name, trust_remote_code=False):
    """Get or load a reranker model (cached)."""
    cache_key = f"{method}:{model_name}"

    if cache_key not in reranker_models:
        if method == 'fastembed':
            if model_name not in RERANKER_SUPPORTED['fastembed']:
                raise ValueError(f"Fastembed reranker does not support {model_name}. Supported: {RERANKER_SUPPORTED['fastembed']}")
            from fastembed.rerank.cross_encoder import TextCrossEncoder
            logger.info(f"Loading Fastembed reranker: {model_name}")
            reranker_models[cache_key] = TextCrossEncoder(model_name=model_name)

        elif method == 'sentence-transformers':
            from sentence_transformers import CrossEncoder
            logger.info(f"Loading Sentence Transformers reranker: {model_name} (trust_remote_code={trust_remote_code})")
            reranker_models[cache_key] = CrossEncoder(
                model_name,
                trust_remote_code=trust_remote_code
            )
        else:
            raise ValueError(f"Unknown reranker method: {method}")

    return reranker_models[cache_key]


def get_fastembed_model(model_name):
    """Get or load a Fastembed model (cached)."""
    if model_name not in fastembed_models:
        if model_name not in FASTEMBED_SUPPORTED:
            raise ValueError(f"Fastembed does not support {model_name}. Supported: {FASTEMBED_SUPPORTED}")
        from fastembed import TextEmbedding
        logger.info(f"Loading Fastembed model: {model_name}")
        fastembed_models[model_name] = TextEmbedding(model_name=model_name)
    return fastembed_models[model_name]


def get_st_model(model_name, trust_remote_code=False):
    """Get or load a Sentence Transformers model (cached)."""
    if model_name not in st_models:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading Sentence Transformers model: {model_name} (trust_remote_code={trust_remote_code})")
        st_models[model_name] = SentenceTransformer(
            model_name,
            trust_remote_code=trust_remote_code
        )
    return st_models[model_name]


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'fastembed_loaded': list(fastembed_models.keys()),
        'st_loaded': list(st_models.keys()),
        'reranker_loaded': list(reranker_models.keys()),
        'fastembed_supported': list(FASTEMBED_SUPPORTED),
        'reranker_supported': {k: list(v) for k, v in RERANKER_SUPPORTED.items()},
    })


@app.route('/embed', methods=['POST'])
def embed():
    """
    Generate embedding for a single text.

    Request body:
    {
        "method": "fastembed" | "sentence-transformers",
        "model": "BAAI/bge-m3",
        "text": "text to embed",
        "trust_remote_code": false,  // optional, for Jina v3
        "prompt_name": "retrieval.query"  // optional, for Jina v3
    }
    """
    data = request.json
    method = data.get('method')
    model_name = data.get('model')
    text = data.get('text')

    if not all([method, model_name, text]):
        return jsonify({'error': 'Missing required fields: method, model, text'}), 400

    # Optional params
    trust_remote_code = data.get('trust_remote_code', False)
    prompt_name = data.get('prompt_name')  # For Jina v3

    start = time.perf_counter()

    try:
        if method == 'fastembed':
            model = get_fastembed_model(model_name)
            embeddings = list(model.embed([text]))
            embedding = [float(x) for x in embeddings[0]]

        elif method == 'sentence-transformers':
            model = get_st_model(model_name, trust_remote_code)

            # Jina v3 uses prompt_name parameter for task-specific embeddings
            if prompt_name:
                embedding = model.encode(text, prompt_name=prompt_name).tolist()
            else:
                embedding = model.encode(text).tolist()

        else:
            return jsonify({'error': f'Unknown method: {method}. Use "fastembed" or "sentence-transformers"'}), 400

        elapsed = (time.perf_counter() - start) * 1000

        return jsonify({
            'embedding': embedding,
            'dimension': len(embedding),
            'latency_ms': round(elapsed, 2),
        })

    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/embed/batch', methods=['POST'])
def embed_batch():
    """
    Generate embeddings for multiple texts.

    Request body:
    {
        "method": "fastembed" | "sentence-transformers",
        "model": "BAAI/bge-m3",
        "texts": ["text1", "text2", ...],
        "trust_remote_code": false,
        "prompt_name": "retrieval.query"
    }
    """
    data = request.json
    method = data.get('method')
    model_name = data.get('model')
    texts = data.get('texts', [])

    if not all([method, model_name]) or not texts:
        return jsonify({'error': 'Missing required fields: method, model, texts'}), 400

    trust_remote_code = data.get('trust_remote_code', False)
    prompt_name = data.get('prompt_name')

    start = time.perf_counter()

    try:
        if method == 'fastembed':
            model = get_fastembed_model(model_name)
            embeddings = [[float(x) for x in emb] for emb in model.embed(texts)]

        elif method == 'sentence-transformers':
            model = get_st_model(model_name, trust_remote_code)
            if prompt_name:
                embeddings = model.encode(texts, prompt_name=prompt_name).tolist()
            else:
                embeddings = model.encode(texts).tolist()

        else:
            return jsonify({'error': f'Unknown method: {method}'}), 400

        elapsed = (time.perf_counter() - start) * 1000

        return jsonify({
            'embeddings': embeddings,
            'count': len(embeddings),
            'dimension': len(embeddings[0]) if embeddings else 0,
            'latency_ms': round(elapsed, 2),
        })

    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/warmup', methods=['POST'])
def warmup():
    """
    Pre-load specified models into memory.

    Request body:
    {
        "models": [
            {"method": "fastembed", "model": "BAAI/bge-m3"},
            {"method": "sentence-transformers", "model": "jinaai/jina-embeddings-v3", "trust_remote_code": true}
        ],
        "rerankers": [
            {"method": "fastembed", "model": "BAAI/bge-reranker-base"},
            {"method": "sentence-transformers", "model": "jinaai/jina-reranker-v2-base-multilingual", "trust_remote_code": true}
        ]
    }
    """
    data = request.json
    models = data.get('models', [])
    rerankers = data.get('rerankers', [])
    results = {}

    # Warmup embedding models
    for m in models:
        model_name = m.get('model')
        method = m.get('method')
        trust = m.get('trust_remote_code', False)

        if not model_name or not method:
            continue

        key = f"{method}:{model_name}"

        try:
            start = time.perf_counter()
            if method == 'fastembed':
                get_fastembed_model(model_name)
            elif method == 'sentence-transformers':
                get_st_model(model_name, trust)
            else:
                results[key] = {'success': False, 'error': f'Unknown method: {method}'}
                continue

            elapsed = (time.perf_counter() - start) * 1000
            results[key] = {'success': True, 'load_time_ms': round(elapsed, 2)}
            logger.info(f"Warmed up {key} in {elapsed:.0f}ms")

        except Exception as e:
            results[key] = {'success': False, 'error': str(e)}
            logger.error(f"Failed to warmup {key}: {e}")

    # Warmup reranker models
    for m in rerankers:
        model_name = m.get('model')
        method = m.get('method')
        trust = m.get('trust_remote_code', False)

        if not model_name or not method:
            continue

        key = f"reranker:{method}:{model_name}"

        try:
            start = time.perf_counter()
            get_reranker_model(method, model_name, trust)
            elapsed = (time.perf_counter() - start) * 1000
            results[key] = {'success': True, 'load_time_ms': round(elapsed, 2)}
            logger.info(f"Warmed up reranker {key} in {elapsed:.0f}ms")

        except Exception as e:
            results[key] = {'success': False, 'error': str(e)}
            logger.error(f"Failed to warmup reranker {key}: {e}")

    return jsonify(results)


@app.route('/rerank', methods=['POST'])
def rerank():
    """
    Rerank documents given a query using cross-encoder models.

    Request body:
    {
        "method": "fastembed" | "sentence-transformers",
        "model": "BAAI/bge-reranker-base",
        "query": "search query",
        "documents": ["doc1 text", "doc2 text", ...],
        "top_n": 10,  // optional, return top N results
        "trust_remote_code": false  // optional, for Jina models
    }

    Response:
    {
        "results": [
            {"index": 0, "score": 0.95, "document": "doc1 text"},
            ...
        ],
        "latency_ms": 45.2
    }
    """
    data = request.json
    method = data.get('method')
    model_name = data.get('model')
    query = data.get('query')
    documents = data.get('documents', [])
    top_n = data.get('top_n')
    trust_remote_code = data.get('trust_remote_code', False)

    if not all([method, model_name, query]) or not documents:
        return jsonify({'error': 'Missing required fields: method, model, query, documents'}), 400

    start = time.perf_counter()

    try:
        model = get_reranker_model(method, model_name, trust_remote_code)

        if method == 'fastembed':
            # fastembed TextCrossEncoder.rerank() returns raw float scores
            # in the same order as input documents (NOT sorted)
            scores = list(model.rerank(query, documents))

            # Pair scores with original document indices and sort by score (descending)
            indexed_scores = [(i, float(score)) for i, score in enumerate(scores)]
            indexed_scores.sort(key=lambda x: x[1], reverse=True)

            # Apply top_n limit
            if top_n:
                indexed_scores = indexed_scores[:top_n]

            # Build scored_results in sorted order
            scored_results = [
                {
                    'index': idx,
                    'score': score,
                    'document': documents[idx]
                }
                for idx, score in indexed_scores
            ]

        elif method == 'sentence-transformers':
            # CrossEncoder.rank() returns list of dicts with 'corpus_id' and 'score'
            pairs = [[query, doc] for doc in documents]
            scores = model.predict(pairs)

            # Create sorted results
            indexed_scores = [(i, float(score)) for i, score in enumerate(scores)]
            indexed_scores.sort(key=lambda x: x[1], reverse=True)

            if top_n:
                indexed_scores = indexed_scores[:top_n]

            scored_results = [
                {
                    'index': idx,
                    'score': score,
                    'document': documents[idx]
                }
                for idx, score in indexed_scores
            ]

        else:
            return jsonify({'error': f'Unknown method: {method}'}), 400

        elapsed = (time.perf_counter() - start) * 1000

        return jsonify({
            'results': scored_results,
            'count': len(scored_results),
            'latency_ms': round(elapsed, 2),
        })

    except Exception as e:
        logger.error(f"Rerank error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/models', methods=['GET'])
def list_models():
    """List loaded models and supported models."""
    return jsonify({
        'loaded': {
            'fastembed': list(fastembed_models.keys()),
            'sentence_transformers': list(st_models.keys()),
            'rerankers': list(reranker_models.keys()),
        },
        'fastembed_supported': list(FASTEMBED_SUPPORTED),
        'reranker_supported': {k: list(v) for k, v in RERANKER_SUPPORTED.items()},
    })


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Embedding server for Fastembed and Sentence Transformers')
    parser.add_argument('--port', type=int, default=5555, help='Port to run on (default: 5555)')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()

    print(f"""
{'='*60}
  Embedding & Reranking Server
{'='*60}
  Host: {args.host}
  Port: {args.port}

  Endpoints:
    GET  /health      - Health check
    GET  /models      - List loaded models
    POST /embed       - Generate single embedding
    POST /embed/batch - Generate batch embeddings
    POST /rerank      - Rerank documents with cross-encoder
    POST /warmup      - Pre-load models

  Fastembed embeddings:
    - intfloat/multilingual-e5-large (1024-dim)
    - BAAI/bge-base-en-v1.5 (768-dim)
    - jinaai/jina-embeddings-v2-base-code (768-dim)
    - sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (768-dim)

  Fastembed rerankers:
    - BAAI/bge-reranker-base
    - BAAI/bge-reranker-large
    - Xenova/ms-marco-MiniLM-L-6-v2

  Sentence Transformers rerankers:
    - jinaai/jina-reranker-v2-base-multilingual (trust_remote_code=true)
    - BAAI/bge-reranker-v2-m3
    - cross-encoder/ms-marco-MiniLM-L-6-v2
{'='*60}
""")

    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
