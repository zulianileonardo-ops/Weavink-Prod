// loader.mjs - Custom ESM loader to resolve @/ path aliases and add .js extensions
// Usage: node --experimental-loader ./loader.mjs -r dotenv/config runEventTests.mjs

import { fileURLToPath, pathToFileURL } from 'url';
import { resolve as pathResolve, dirname, extname } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path mappings from jsconfig.json
const pathMappings = {
  '@/': './',
  '@/components/': './app/components/',
  '@/lib/': './lib/',
  '@/hooks/': './hooks/',
  '@/contexts/': './contexts/',
  '@/utils/': './utils/',
};

function tryResolveWithExtension(basePath) {
  // Already has extension
  if (extname(basePath)) {
    return existsSync(basePath) ? basePath : null;
  }

  // Try .js
  if (existsSync(basePath + '.js')) {
    return basePath + '.js';
  }

  // Try .mjs
  if (existsSync(basePath + '.mjs')) {
    return basePath + '.mjs';
  }

  // Try index.js
  if (existsSync(basePath + '/index.js')) {
    return basePath + '/index.js';
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Handle @/ aliases
  if (specifier.startsWith('@/')) {
    for (const [alias, target] of Object.entries(pathMappings)) {
      if (specifier.startsWith(alias)) {
        const resolved = specifier.replace(alias, target);
        const absolutePath = pathResolve(__dirname, resolved);
        const finalPath = tryResolveWithExtension(absolutePath);

        if (finalPath) {
          return nextResolve(pathToFileURL(finalPath).href, context);
        }
      }
    }
  }

  // Handle relative imports without extensions
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    // Get the parent directory from context
    if (context.parentURL) {
      const parentPath = fileURLToPath(context.parentURL);
      const parentDir = dirname(parentPath);
      const absolutePath = pathResolve(parentDir, specifier);
      const finalPath = tryResolveWithExtension(absolutePath);

      if (finalPath) {
        return nextResolve(pathToFileURL(finalPath).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}
