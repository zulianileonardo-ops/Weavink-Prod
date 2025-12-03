// lib/services/serviceContact/server/redisClient.js
// Redis client for query enhancement caching
// Provides connection management and helper methods

import { createClient } from 'redis';

/**
 * RedisClient - Singleton Redis connection manager
 * 
 * Features:
 * - Automatic reconnection
 * - Connection pooling
 * - Error handling
 * - Helper methods for cache operations
 */
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Initialize and connect to Redis
   */
  async connect() {
    if (this.isConnected) {
      console.log('✅ [Redis] Already connected');
      return this.client;
    }

    if (this.isConnecting) {
      console.log('⏳ [Redis] Connection in progress, waiting...');
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.client;
    }

    try {
      this.isConnecting = true;
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || '6379';
      console.log(`🔌 [Redis] Connecting to ${redisHost}:${redisPort}...`);

      // Build config - only add auth if password is provided
      const redisConfig = {
        socket: {
          host: redisHost,
          port: parseInt(redisPort),
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ [Redis] Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`🔄 [Redis] Reconnecting in ${delay}ms (attempt ${retries})...`);
            return delay;
          }
        }
      };

      // Only add authentication if password is provided (for self-hosted without auth)
      if (process.env.REDIS_PASSWORD) {
        redisConfig.username = 'default';
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.client = createClient(redisConfig);

      // Set up event listeners
      this.client.on('error', (err) => {
        console.error('❌ [Redis] Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔌 [Redis] Connected to server');
      });

      this.client.on('ready', () => {
        console.log('✅ [Redis] Client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 [Redis] Reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 [Redis] Connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
      this.isConnected = true;
      this.isConnecting = false;
      
      console.log('✅ [Redis] Successfully connected and ready');
      return this.client;

    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      console.error('❌ [Redis] Connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get Redis client (connect if not connected)
   */
  async getClient() {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.client;
  }

  /**
   * Set a value with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttlSeconds - TTL in seconds (default: 86400 = 24 hours)
   */
  async set(key, value, ttlSeconds = 86400) {
    const opStart = performance.now();
    try {
      const clientStart = performance.now();
      const client = await this.getClient();
      const clientTime = performance.now() - clientStart;

      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const valueSize = stringValue.length;

      const redisStart = performance.now();
      if (ttlSeconds > 0) {
        await client.setEx(key, ttlSeconds, stringValue);
      } else {
        await client.set(key, stringValue);
      }
      const redisTime = performance.now() - redisStart;
      const totalTime = performance.now() - opStart;

      console.log(`⏱️ [Redis SET] ${totalTime.toFixed(2)}ms total | redis: ${redisTime.toFixed(2)}ms | client: ${clientTime.toFixed(2)}ms | size: ${valueSize} bytes | key: ${key.substring(0, 50)}...`);

      return true;
    } catch (error) {
      console.error('❌ [Redis] Set error:', error.message);
      return false;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @param {boolean} parseJson - Whether to parse as JSON (default: true)
   */
  async get(key, parseJson = true) {
    const opStart = performance.now();
    try {
      const clientStart = performance.now();
      const client = await this.getClient();
      const clientTime = performance.now() - clientStart;

      const redisStart = performance.now();
      const value = await client.get(key);
      const redisTime = performance.now() - redisStart;

      if (value === null) {
        const totalTime = performance.now() - opStart;
        console.log(`⏱️ [Redis GET] ${totalTime.toFixed(2)}ms total | redis: ${redisTime.toFixed(2)}ms | client: ${clientTime.toFixed(2)}ms | MISS | key: ${key.substring(0, 50)}...`);
        return null;
      }

      const parseStart = performance.now();
      let result = value;
      if (parseJson) {
        try {
          result = JSON.parse(value);
        } catch (parseError) {
          console.warn('⚠️ [Redis] JSON parse failed, returning raw value');
        }
      }
      const parseTime = performance.now() - parseStart;
      const totalTime = performance.now() - opStart;

      console.log(`⏱️ [Redis GET] ${totalTime.toFixed(2)}ms total | redis: ${redisTime.toFixed(2)}ms | client: ${clientTime.toFixed(2)}ms | parse: ${parseTime.toFixed(2)}ms | HIT (${value.length} bytes) | key: ${key.substring(0, 50)}...`);

      return result;
    } catch (error) {
      console.error('❌ [Redis] Get error:', error.message);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key) {
    try {
      const client = await this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('❌ [Redis] Delete error:', error.message);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key) {
    try {
      const client = await this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ [Redis] Exists error:', error.message);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key) {
    const opStart = performance.now();
    try {
      const client = await this.getClient();
      const redisStart = performance.now();
      const result = await client.ttl(key);
      const redisTime = performance.now() - redisStart;
      const totalTime = performance.now() - opStart;

      console.log(`⏱️ [Redis TTL] ${totalTime.toFixed(2)}ms total | redis: ${redisTime.toFixed(2)}ms | ttl: ${result}s | key: ${key.substring(0, 50)}...`);

      return result;
    } catch (error) {
      console.error('❌ [Redis] TTL error:', error.message);
      return -1;
    }
  }

  /**
   * Clear all keys matching a pattern
   */
  async clearPattern(pattern) {
    try {
      const client = await this.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(keys);
        console.log(`🗑️ [Redis] Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
      
      return keys.length;
    } catch (error) {
      console.error('❌ [Redis] Clear pattern error:', error.message);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const client = await this.getClient();
      const info = await client.info('stats');
      const memory = await client.info('memory');
      
      return {
        connected: this.isConnected,
        info,
        memory
      };
    } catch (error) {
      console.error('❌ [Redis] Stats error:', error.message);
      return null;
    }
  }

  /**
   * Close the connection
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        console.log('👋 [Redis] Disconnected gracefully');
      }
      this.isConnected = false;
    } catch (error) {
      console.error('❌ [Redis] Disconnect error:', error.message);
    }
  }

  /**
   * Run latency benchmark - useful for comparing Redis Cloud vs Self-Hosted
   * @param {number} iterations - Number of ping operations (default: 10)
   */
  async benchmark(iterations = 10) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    const isCloud = redisHost.includes('redis-cloud') || redisHost.includes('redns');

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🏎️  REDIS LATENCY BENCHMARK`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`  Host: ${redisHost}:${redisPort}`);
    console.log(`  Type: ${isCloud ? '☁️ Redis Cloud' : '🏠 Self-Hosted'}`);
    console.log(`  Iterations: ${iterations}`);
    console.log(`${'─'.repeat(70)}`);

    try {
      const client = await this.getClient();
      const pingTimes = [];
      const setTimes = [];
      const getTimes = [];

      // Warm-up
      await client.ping();

      // PING benchmark
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.ping();
        pingTimes.push(performance.now() - start);
      }

      // SET benchmark (small value)
      const testKey = `benchmark:latency:${Date.now()}`;
      const testValue = JSON.stringify({ test: 'data', timestamp: Date.now() });
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.setEx(testKey, 60, testValue);
        setTimes.push(performance.now() - start);
      }

      // GET benchmark
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await client.get(testKey);
        getTimes.push(performance.now() - start);
      }

      // Cleanup
      await client.del(testKey);

      // Calculate stats
      const calcStats = (times) => ({
        min: Math.min(...times).toFixed(2),
        max: Math.max(...times).toFixed(2),
        avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
        p50: times.sort((a, b) => a - b)[Math.floor(times.length / 2)].toFixed(2),
        p99: times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)].toFixed(2)
      });

      const pingStats = calcStats(pingTimes);
      const setStats = calcStats(setTimes);
      const getStats = calcStats(getTimes);

      console.log(`\n  📊 RESULTS (${iterations} iterations each):`);
      console.log(`${'─'.repeat(70)}`);
      console.log(`  Operation │   Min    │   Avg    │   P50    │   P99    │   Max`);
      console.log(`${'─'.repeat(70)}`);
      console.log(`  PING      │ ${pingStats.min.padStart(6)}ms │ ${pingStats.avg.padStart(6)}ms │ ${pingStats.p50.padStart(6)}ms │ ${pingStats.p99.padStart(6)}ms │ ${pingStats.max.padStart(6)}ms`);
      console.log(`  SET       │ ${setStats.min.padStart(6)}ms │ ${setStats.avg.padStart(6)}ms │ ${setStats.p50.padStart(6)}ms │ ${setStats.p99.padStart(6)}ms │ ${setStats.max.padStart(6)}ms`);
      console.log(`  GET       │ ${getStats.min.padStart(6)}ms │ ${getStats.avg.padStart(6)}ms │ ${getStats.p50.padStart(6)}ms │ ${getStats.p99.padStart(6)}ms │ ${getStats.max.padStart(6)}ms`);
      console.log(`${'═'.repeat(70)}\n`);

      return {
        host: redisHost,
        port: redisPort,
        type: isCloud ? 'cloud' : 'self-hosted',
        iterations,
        ping: pingStats,
        set: setStats,
        get: getStats
      };

    } catch (error) {
      console.error('❌ [Redis] Benchmark error:', error.message);
      return null;
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

// Helper function to generate cache keys
export function generateCacheKey(prefix, ...parts) {
  return `${prefix}:${parts.join(':')}`;
}
