/**
 * Custom resolver for @/ paths
 * Maps @/lib/* to ./lib/*
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';
import { existsSync } from 'node:fs';

const baseDir = dirname(fileURLToPath(import.meta.url));

export async function resolve(specifier, context, nextResolve) {
  // Handle @/ paths
  if (specifier.startsWith('@/')) {
    const relativePath = specifier.slice(2); // Remove '@/'
    let absolutePath = pathResolve(baseDir, relativePath);

    // Try adding .js extension if not present and file doesn't exist
    if (!absolutePath.endsWith('.js') && !existsSync(absolutePath)) {
      const withJs = absolutePath + '.js';
      if (existsSync(withJs)) {
        absolutePath = withJs;
      }
    }

    return nextResolve(pathToFileURL(absolutePath).href, context);
  }

  return nextResolve(specifier, context);
}
