#!/usr/bin/env python3
"""Download and warm up E5-large embedding model at Docker build time."""

from fastembed import TextEmbedding
import time

print('Downloading intfloat/multilingual-e5-large...')
start = time.time()
model = TextEmbedding('intfloat/multilingual-e5-large')
print(f'Model downloaded in {time.time() - start:.1f}s')

print('Running warmup inference...')
_ = list(model.embed(['warmup text']))
print('Done!')
