# Embedding Service Dockerfile
# E5-large only - separated for fault isolation and independent scaling
#
# For Coolify: Set Base Directory to /docker/embed-service
#
# Manual Build:
#   docker build -t embed-service:latest docker/embed-service
#
# Run:
#   docker run -d --name embed-service -p 5555:5555 --memory=6g --cpus=6 embed-service:latest

FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (embedding only - smaller footprint)
# Using fastembed 0.5.1 for stability (matches rerank-service)
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    fastembed==0.5.1

# Copy embedding service and download script (from same directory)
COPY embed-service.py /app/embed-service.py
COPY download-embed-model.py /app/download-embed-model.py

# Pre-download E5-large model at build time (~2.5GB)
# This ensures fast container startup
RUN python /app/download-embed-model.py

EXPOSE 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:5555/health || exit 1

# Environment variables for performance
ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=4
ENV TOKENIZERS_PARALLELISM=false

# Gunicorn with 4 workers, 2 threads each, --preload for memory sharing
# Total concurrent capacity: 8 requests
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5555", \
     "--workers", "4", \
     "--threads", "2", \
     "--worker-class", "gthread", \
     "--preload", \
     "--timeout", "60", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "embed-service:app"]
