#!/usr/bin/env python3
"""
Reranking Service - BGE-reranker-base only
Separated from combined embed-server for better fault isolation and scaling.

Run with gunicorn:
  gunicorn --bind 0.0.0.0:5556 --workers 2 --threads 2 --worker-class gthread --preload rerank-service:app
"""
from flask import Flask, request, jsonify
import time
import logging
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Model cache - loaded once at startup (shared via --preload)
reranker_model = None
MODEL_NAME = 'BAAI/bge-reranker-base'


def get_model():
    """Get or load the BGE reranker model (cached)."""
    global reranker_model
    if reranker_model is None:
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        logger.info(f"Loading reranker model: {MODEL_NAME}")
        start = time.perf_counter()
        reranker_model = TextCrossEncoder(model_name=MODEL_NAME)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(f"Reranker loaded in {elapsed:.0f}ms")
    return reranker_model


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'rerank-service',
        'model': MODEL_NAME,
        'model_loaded': reranker_model is not None,
    })


@app.route('/ready', methods=['GET'])
def ready():
    """Readiness check - verifies model is loaded and working."""
    try:
        model = get_model()
        test_scores = list(model.rerank('test query', ['test document']))
        if len(test_scores) == 1:
            return jsonify({'status': 'ready'})
        else:
            return jsonify({'status': 'error', 'reason': 'unexpected_output'}), 503
    except Exception as e:
        return jsonify({'status': 'error', 'reason': str(e)}), 503


@app.route('/live', methods=['GET'])
def live():
    """Liveness check - confirms process is running."""
    return jsonify({'status': 'alive'}), 200


@app.route('/rerank', methods=['POST'])
def rerank():
    """
    Rerank documents given a query.

    Request body:
    {
        "query": "search query",
        "documents": ["doc1 text", "doc2 text", ...],
        "top_n": 10  // optional
    }

    Response:
    {
        "results": [
            {"index": 0, "score": 0.95, "document": "doc1 text"},
            ...
        ],
        "count": 10,
        "latency_ms": 145.2
    }
    """
    data = request.json
    query = data.get('query')
    documents = data.get('documents', [])
    top_n = data.get('top_n')

    if not query:
        return jsonify({'error': 'Missing required field: query'}), 400
    if not documents:
        return jsonify({'error': 'Missing required field: documents'}), 400

    start = time.perf_counter()

    try:
        model = get_model()

        # fastembed TextCrossEncoder.rerank() returns raw float scores
        # in the same order as input documents (NOT sorted)
        scores = list(model.rerank(query, documents))

        # Pair scores with original document indices and sort by score (descending)
        indexed_scores = [(i, float(score)) for i, score in enumerate(scores)]
        indexed_scores.sort(key=lambda x: x[1], reverse=True)

        # Apply top_n limit
        if top_n:
            indexed_scores = indexed_scores[:top_n]

        # Build results in sorted order
        results = [
            {
                'index': idx,
                'score': score,
                'document': documents[idx]
            }
            for idx, score in indexed_scores
        ]

        elapsed = (time.perf_counter() - start) * 1000

        return jsonify({
            'results': results,
            'count': len(results),
            'latency_ms': round(elapsed, 2),
        })

    except Exception as e:
        logger.error(f"Rerank error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/warmup', methods=['POST'])
def warmup():
    """
    Pre-load the model into memory.
    Called at container startup.
    """
    try:
        start = time.perf_counter()
        model = get_model()

        # Run a dummy inference to fully initialize
        _ = list(model.rerank('warmup query', ['warmup document']))

        elapsed = (time.perf_counter() - start) * 1000

        return jsonify({
            'success': True,
            'model': MODEL_NAME,
            'load_time_ms': round(elapsed, 2),
        })

    except Exception as e:
        logger.error(f"Warmup error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/models', methods=['GET'])
def list_models():
    """List loaded and supported models."""
    return jsonify({
        'loaded': MODEL_NAME if reranker_model else None,
        'supported': [MODEL_NAME],
    })


# Pre-load model when running with gunicorn --preload
def preload_model():
    """Called when gunicorn starts with --preload flag."""
    logger.info("Pre-loading reranker model for gunicorn workers...")
    get_model()
    logger.info("Reranker model pre-loaded successfully")


# Only pre-load if we're being imported by gunicorn with --preload
if os.environ.get('GUNICORN_PRELOAD') == '1' or __name__ != '__main__':
    try:
        preload_model()
    except Exception as e:
        logger.warning(f"Pre-load failed (will load on first request): {e}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Reranking Service (BGE-reranker)')
    parser.add_argument('--port', type=int, default=5556, help='Port (default: 5556)')
    parser.add_argument('--host', default='0.0.0.0', help='Host (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()

    print(f"""
{'='*60}
  Reranking Service (BGE-reranker-base)
{'='*60}
  Host: {args.host}
  Port: {args.port}
  Model: {MODEL_NAME}

  Endpoints:
    GET  /health   - Health check
    GET  /ready    - Readiness check
    GET  /live     - Liveness check
    GET  /models   - List models
    POST /rerank   - Rerank documents
    POST /warmup   - Pre-load model
{'='*60}
""")

    # Pre-load model before starting
    preload_model()

    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
