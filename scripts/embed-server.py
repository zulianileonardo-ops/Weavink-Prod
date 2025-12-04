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

# Fastembed supported models - use exact names from fastembed library
# Full list: https://qdrant.github.io/fastembed/examples/Supported_Models/
# Note: BGE-M3 is NOT supported by fastembed, only by sentence-transformers
FASTEMBED_SUPPORTED = {
    # 1024-dim models
    'intfloat/multilingual-e5-large',
    'BAAI/bge-base-en-v1.5',
    'BAAI/bge-small-en-v1.5',
    # 768-dim models
    'jinaai/jina-embeddings-v2-base-de',
    'jinaai/jina-embeddings-v2-base-code',
    'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
}


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
        'fastembed_supported': list(FASTEMBED_SUPPORTED),
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
        ]
    }
    """
    data = request.json
    models = data.get('models', [])
    results = {}

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

    return jsonify(results)


@app.route('/models', methods=['GET'])
def list_models():
    """List loaded models and supported models."""
    return jsonify({
        'loaded': {
            'fastembed': list(fastembed_models.keys()),
            'sentence_transformers': list(st_models.keys()),
        },
        'fastembed_supported': list(FASTEMBED_SUPPORTED),
    })


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Embedding server for Fastembed and Sentence Transformers')
    parser.add_argument('--port', type=int, default=5555, help='Port to run on (default: 5555)')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()

    print(f"""
{'='*60}
  Embedding Server
{'='*60}
  Host: {args.host}
  Port: {args.port}

  Endpoints:
    GET  /health     - Health check
    GET  /models     - List loaded models
    POST /embed      - Generate single embedding
    POST /embed/batch - Generate batch embeddings
    POST /warmup     - Pre-load models

  Fastembed supported models:
    - intfloat/multilingual-e5-large (1024-dim)
    - BAAI/bge-base-en-v1.5 (768-dim)
    - BAAI/bge-small-en-v1.5 (384-dim)
    - jinaai/jina-embeddings-v2-base-de (768-dim)
    - jinaai/jina-embeddings-v2-base-code (768-dim)
    - sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (768-dim)

  Sentence Transformers (all models supported):
    - BAAI/bge-m3 (use sentence-transformers, NOT fastembed)
    - intfloat/multilingual-e5-large
    - intfloat/multilingual-e5-large-instruct
    - jinaai/jina-embeddings-v3 (requires trust_remote_code=true, einops)
{'='*60}
""")

    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
