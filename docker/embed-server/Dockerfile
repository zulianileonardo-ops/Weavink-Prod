# Embed Server Dockerfile
# Provides Fastembed (ONNX) and Sentence Transformers (PyTorch) embeddings + reranking
# Self-hosted alternative to Cohere API

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ONNX
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    fastembed==0.3.6 \
    sentence-transformers==2.2.2 \
    einops==0.7.0

# Copy server script
COPY scripts/embed-server.py /app/embed-server.py

# Pre-download models at build time (faster startup)
# E5-large embedding model (~2GB)
RUN python -c "\
from fastembed import TextEmbedding; \
print('Downloading E5-large...'); \
model = TextEmbedding('intfloat/multilingual-e5-large'); \
print('E5-large ready'); \
"

# BGE reranker model (~1GB)
RUN python -c "\
from fastembed.rerank.cross_encoder import TextCrossEncoder; \
print('Downloading BGE-reranker-base...'); \
model = TextCrossEncoder('BAAI/bge-reranker-base'); \
print('BGE-reranker ready'); \
"

# Copy warmup script
COPY docker/embed-server/warmup.py /app/warmup.py

EXPOSE 5555

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:5555/health || exit 1

# Use gunicorn for production with warmup
CMD ["sh", "-c", "python warmup.py && gunicorn --bind 0.0.0.0:5555 --workers 1 --threads 4 --timeout 120 embed-server:app"]
