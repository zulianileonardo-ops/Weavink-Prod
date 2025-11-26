/**
 * Custom ESM loader for resolving @/ paths in tests
 *
 * Usage: node --import ./test-loader.mjs -r dotenv/config runEventTests.mjs
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./test-resolver.mjs', pathToFileURL('./'));
