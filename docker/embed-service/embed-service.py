#!/usr/bin/env python3
"""
Embedding Service - E5-large only
Separated from combined embed-server for better fault isolation and scaling.

Run with gunicorn:
  gunicorn --bind 0.0.0.0:5555 --workers 4 --threads 2 --worker-class gthread --preload embed-service:app
"""
from flask import Flask, request, jsonify
import time
import logging
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Model cache - loaded once at startup (shared via --preload)
fastembed_model = None
MODEL_NAME = 'intfloat/multilingual-e5-large'
MODEL_DIMENSION = 1024


def get_model():
    """Get or load the E5-large model (cached)."""
    global fastembed_model
    if fastembed_model is None:
        from fastembed import TextEmbedding
        logger.info(f"Loading model: {MODEL_NAME}")
        start = time.perf_counter()
        fastembed_model = TextEmbedding(model_name=MODEL_NAME)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(f"Model loaded in {elapsed:.0f}ms")
    return fastembed_model


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'embed-service',
        'model': MODEL_NAME,
        'model_loaded': fastembed_model is not None,
        'dimension': MODEL_DIMENSION,
    })


@app.route('/ready', methods=['GET'])
def ready():
    """Readiness check - verifies model is loaded and working."""
    try:
        model = get_model()
        test_result = list(model.embed(['readiness check']))
        if len(test_result) == 1 and len(test_result[0]) == MODEL_DIMENSION:
            return jsonify({'status': 'ready', 'dimension': MODEL_DIMENSION})
        else:
            return jsonify({'status': 'error', 'reason': 'unexpected_output'}), 503
    except Exception as e:
        return jsonify({'status': 'error', 'reason': str(e)}), 503


@app.route('/live', methods=['GET'])
def live():
    """Liveness check - confirms process is running."""
    return jsonify({'status': 'alive'}), 200


@app.route('/embed', methods=['POST'])
def embed():
    """
    Generate embedding for a single text.

    Request body:
    {
        "text": "text to embed"
    }

    Response:
    {
        "embedding": [...],
        "dimension": 1024,
        "latency_ms": 45.2
    }
    """
    data = request.json
    text = data.get('text')

    if not text:
        return jsonify({'error': 'Missing required field: text'}), 400

    start = time.perf_counter()

    try:
        model = get_model()
        embeddings = list(model.embed([text]))
        embedding = [float(x) for x in embeddings[0]]
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
        "texts": ["text1", "text2", ...]
    }

    Response:
    {
        "embeddings": [[...], [...]],
        "count": 2,
        "dimension": 1024,
        "latency_ms": 123.4
    }
    """
    data = request.json
    texts = data.get('texts', [])

    if not texts:
        return jsonify({'error': 'Missing required field: texts'}), 400

    start = time.perf_counter()

    try:
        model = get_model()
        embeddings = [[float(x) for x in emb] for emb in model.embed(texts)]
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
    Pre-load the model into memory.
    Called at container startup.
    """
    try:
        start = time.perf_counter()
        model = get_model()

        # Run a dummy inference to fully initialize
        _ = list(model.embed(['warmup text']))

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
        'loaded': MODEL_NAME if fastembed_model else None,
        'supported': [MODEL_NAME],
        'dimension': MODEL_DIMENSION,
    })


# Pre-load model when running with gunicorn --preload
def preload_model():
    """Called when gunicorn starts with --preload flag."""
    logger.info("Pre-loading model for gunicorn workers...")
    get_model()
    logger.info("Model pre-loaded successfully")


# Only pre-load if we're being imported by gunicorn with --preload
if os.environ.get('GUNICORN_PRELOAD') == '1' or __name__ != '__main__':
    try:
        preload_model()
    except Exception as e:
        logger.warning(f"Pre-load failed (will load on first request): {e}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Embedding Service (E5-large)')
    parser.add_argument('--port', type=int, default=5555, help='Port (default: 5555)')
    parser.add_argument('--host', default='0.0.0.0', help='Host (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()

    print(f"""
{'='*60}
  Embedding Service (E5-large)
{'='*60}
  Host: {args.host}
  Port: {args.port}
  Model: {MODEL_NAME}
  Dimension: {MODEL_DIMENSION}

  Endpoints:
    GET  /health      - Health check
    GET  /ready       - Readiness check
    GET  /live        - Liveness check
    GET  /models      - List models
    POST /embed       - Single embedding
    POST /embed/batch - Batch embeddings
    POST /warmup      - Pre-load model
{'='*60}
""")

    # Pre-load model before starting
    preload_model()

    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
