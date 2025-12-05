#!/usr/bin/env python3
"""Download and warm up BGE-reranker model at Docker build time."""

from fastembed.rerank.cross_encoder import TextCrossEncoder
import time

print('Downloading BAAI/bge-reranker-base...')
start = time.time()
model = TextCrossEncoder('BAAI/bge-reranker-base')
print(f'Model downloaded in {time.time() - start:.1f}s')

print('Running warmup inference...')
_ = list(model.rerank('warmup query', ['warmup document']))
print('Done!')
