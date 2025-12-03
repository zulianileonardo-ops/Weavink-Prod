# Embed Server Dockerfile
# Provides Fastembed (ONNX) and Sentence Transformers (PyTorch) embeddings

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    flask \
    fastembed \
    sentence-transformers

# Copy the server script
COPY scripts/embed-server.py /app/embed-server.py

# Expose port
EXPOSE 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5555/health || exit 1

# Run the server
CMD ["python", "/app/embed-server.py", "--port", "5555", "--host", "0.0.0.0"]
