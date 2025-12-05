# Reranking Service Dockerfile
# BGE-reranker-base only - separated for fault isolation and independent scaling
#
# For Coolify: Set Base Directory to /docker/rerank-service
#
# Manual Build:
#   docker build -t rerank-service:latest docker/rerank-service
#
# Run:
#   docker run -d --name rerank-service -p 5556:5556 --memory=4g --cpus=4 rerank-service:latest

FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (reranking only)
# fastembed>=0.4.0 required for fastembed.rerank.cross_encoder module
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    fastembed==0.5.1

# Copy reranking service and download script (from same directory)
COPY rerank-service.py /app/rerank-service.py
COPY download-rerank-model.py /app/download-rerank-model.py

# Pre-download BGE-reranker-base model at build time (~1.5GB)
# This ensures fast container startup
RUN python /app/download-rerank-model.py

EXPOSE 5556

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:5556/health || exit 1

# Environment variables for performance
ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=2
ENV TOKENIZERS_PARALLELISM=false

# Gunicorn with 2 workers, 2 threads each, --preload for memory sharing
# Total concurrent capacity: 4 requests (reranking is heavier)
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5556", \
     "--workers", "2", \
     "--threads", "2", \
     "--worker-class", "gthread", \
     "--preload", \
     "--timeout", "120", \
     "--graceful-timeout", "60", \
     "--keep-alive", "5", \
     "--max-requests", "500", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "rerank-service:app"]
