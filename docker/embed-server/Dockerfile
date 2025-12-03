# Embed Server Dockerfile
# Provides Fastembed (ONNX) and Sentence Transformers (PyTorch) embeddings

FROM python:3.11-slim

WORKDIR /app

# Install curl for healthcheck and dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir flask fastembed sentence-transformers

# Embed the server script directly
COPY <<'EOF' /app/embed-server.py
#!/usr/bin/env python3
"""
Persistent embedding server - loads models once at startup.
Supports Fastembed (ONNX) and Sentence Transformers (PyTorch).
"""
from flask import Flask, request, jsonify
import argparse
import time
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

fastembed_models = {}
st_models = {}

FASTEMBED_SUPPORTED = {
    'BAAI/bge-m3',
    'intfloat/multilingual-e5-large',
}

def get_fastembed_model(model_name):
    if model_name not in fastembed_models:
        if model_name not in FASTEMBED_SUPPORTED:
            raise ValueError(f"Fastembed does not support {model_name}")
        from fastembed import TextEmbedding
        logger.info(f"Loading Fastembed model: {model_name}")
        fastembed_models[model_name] = TextEmbedding(model_name=model_name)
    return fastembed_models[model_name]

def get_st_model(model_name, trust_remote_code=False):
    if model_name not in st_models:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading Sentence Transformers model: {model_name}")
        st_models[model_name] = SentenceTransformer(model_name, trust_remote_code=trust_remote_code)
    return st_models[model_name]

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'fastembed_loaded': list(fastembed_models.keys()),
        'st_loaded': list(st_models.keys()),
        'fastembed_supported': list(FASTEMBED_SUPPORTED),
    })

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    method = data.get('method')
    model_name = data.get('model')
    text = data.get('text')

    if not all([method, model_name, text]):
        return jsonify({'error': 'Missing required fields: method, model, text'}), 400

    trust_remote_code = data.get('trust_remote_code', False)
    prompt_name = data.get('prompt_name')

    start = time.perf_counter()

    try:
        if method == 'fastembed':
            model = get_fastembed_model(model_name)
            embeddings = list(model.embed([text]))
            embedding = [float(x) for x in embeddings[0]]
        elif method == 'sentence-transformers':
            model = get_st_model(model_name, trust_remote_code)
            if prompt_name:
                embedding = model.encode(text, prompt_name=prompt_name).tolist()
            else:
                embedding = model.encode(text).tolist()
        else:
            return jsonify({'error': f'Unknown method: {method}'}), 400

        elapsed = (time.perf_counter() - start) * 1000
        return jsonify({
            'embedding': embedding,
            'dimension': len(embedding),
            'latency_ms': round(elapsed, 2),
        })
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/warmup', methods=['POST'])
def warmup():
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
            elapsed = (time.perf_counter() - start) * 1000
            results[key] = {'success': True, 'load_time_ms': round(elapsed, 2)}
            logger.info(f"Warmed up {key} in {elapsed:.0f}ms")
        except Exception as e:
            results[key] = {'success': False, 'error': str(e)}
            logger.error(f"Failed to warmup {key}: {e}")

    return jsonify(results)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5555)
    parser.add_argument('--host', default='0.0.0.0')
    args = parser.parse_args()
    print(f"Embed server starting on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, threaded=True)
EOF

EXPOSE 5555

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5555/health || exit 1

CMD ["python", "/app/embed-server.py", "--port", "5555", "--host", "0.0.0.0"]
