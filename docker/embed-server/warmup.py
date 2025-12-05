#!/usr/bin/env python3
"""
Warmup script - Pre-loads models into memory before starting server.
This ensures the first request is fast, not slow.

Run BEFORE starting gunicorn.
"""
import time
import sys

def warmup():
    print("=" * 60)
    print("  EMBED-SERVER WARMUP")
    print("=" * 60)

    total_start = time.time()

    # 1. Load E5-large embedding model
    print("\n[1/4] Loading E5-large embedding model...")
    start = time.time()
    from fastembed import TextEmbedding
    embedding_model = TextEmbedding('intfloat/multilingual-e5-large')
    print(f"      Loaded in {time.time() - start:.1f}s")

    # 2. Run dummy embedding to fully initialize
    print("\n[2/4] Warming up embedding model (dummy inference)...")
    start = time.time()
    dummy_texts = [
        "This is a warmup text for the embedding model.",
        "Another warmup text to ensure model is fully loaded.",
        "Third warmup text for good measure."
    ]
    list(embedding_model.embed(dummy_texts))
    print(f"      Warmed up in {time.time() - start:.1f}s")

    # 3. Load BGE reranker model
    print("\n[3/4] Loading BGE-reranker-base model...")
    start = time.time()
    from fastembed.rerank.cross_encoder import TextCrossEncoder
    reranker_model = TextCrossEncoder('BAAI/bge-reranker-base')
    print(f"      Loaded in {time.time() - start:.1f}s")

    # 4. Run dummy rerank to fully initialize
    print("\n[4/4] Warming up reranker model (dummy inference)...")
    start = time.time()
    dummy_query = "warmup query"
    dummy_docs = [
        "First document for warmup",
        "Second document for warmup",
        "Third document for warmup"
    ]
    list(reranker_model.rerank(dummy_query, dummy_docs))
    print(f"      Warmed up in {time.time() - start:.1f}s")

    total_time = time.time() - total_start
    print("\n" + "=" * 60)
    print(f"  WARMUP COMPLETE - Total time: {total_time:.1f}s")
    print("  Models are now in memory and ready for requests!")
    print("=" * 60 + "\n")

if __name__ == '__main__':
    try:
        warmup()
        sys.exit(0)
    except Exception as e:
        print(f"WARMUP FAILED: {e}")
        sys.exit(1)
