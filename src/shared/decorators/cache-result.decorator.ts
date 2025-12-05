import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Redis data structure types for caching
 * - string: Traditional JSON serialization (default, backward compatible)
 * - json: Native RedisJSON operations (best performance, requires Redis Stack)
 * - hash: Redis Hash for flat objects (good for simple key-value pairs)
 */
export type RedisDataStructure = 'string' | 'json' | 'hash';

export interface CacheResultOptions {
  ttl: number;
  keyPrefix: string;
  includeOrgId?: boolean;
  keyGenerator?: (...args: any[]) => string;
  dataStructure?: RedisDataStructure; // Default: 'string'
}

export function CacheResult(options: CacheResultOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const configuredDataStructure = options.dataStructure || 'string'; // Default to 'string' for backward compatibility

    descriptor.value = async function (this: any, ...args: any[]) {
      // Use global Redis store set by RedisCacheModule
      const store: any = (global as any).__REDIS_STORE__;
      const redisClient: any = (global as any).__REDIS_CLIENT__;

      if (!store) {
        console.warn(`[@CacheResult] Redis store not found! Make sure RedisCacheModule is imported.`);
        return originalMethod.apply(this, args);
      }

      // Determine actual data structure to use (may fall back to string)
      let dataStructure = configuredDataStructure;
      if (!redisClient && (dataStructure === 'json' || dataStructure === 'hash')) {
        console.warn(`[@CacheResult] Redis client not found! Falling back to string storage.`);
        dataStructure = 'string';
      }

      let cacheKey: string;
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator(...args);
      } else {
        const keyParts = [options.keyPrefix];
        if (options.includeOrgId && args.length > 0) {
          keyParts.push(`org:${args[0]}`);
        }
        const argsToSerialize = options.includeOrgId ? args.slice(1) : args;
        if (argsToSerialize.length > 0) {
          keyParts.push(JSON.stringify(argsToSerialize));
        }
        cacheKey = keyParts.join(':');
      }

      try {
        // Try to get from Redis based on data structure
        let cached: any;

        if (dataStructure === 'json') {
          // Use RedisJSON operations with sendCommand
          const jsonData = await redisClient.sendCommand(['JSON.GET', cacheKey, '$']);
          if (jsonData) {
            cached = JSON.parse(jsonData)[0]; // RedisJSON returns array with JSONPath $
            console.log(`[@CacheResult:JSON] ✅ REDIS HIT: "${cacheKey}"`);
            return cached;
          }
        } else if (dataStructure === 'hash') {
          // Use Redis Hash operations
          const hashData = await redisClient.hGetAll(cacheKey);
          if (hashData && Object.keys(hashData).length > 0) {
            cached = hashData;
            console.log(`[@CacheResult:HASH] ✅ REDIS HIT: "${cacheKey}"`);
            return cached;
          }
        } else {
          // Default: String (original behavior)
          cached = await store.get(cacheKey);
          if (cached !== undefined && cached !== null) {
            console.log(`[@CacheResult:STRING] ✅ REDIS HIT: "${cacheKey}"`);
            return cached;
          }
        }
      } catch (error: any) {
        console.error(`[@CacheResult:${dataStructure.toUpperCase()}] Redis GET error:`, error.message);
      }

      // Cache miss - execute original method
      const result = await originalMethod.apply(this, args);

      try {
        // Set in Redis based on data structure
        const ttlSeconds = Math.ceil(options.ttl / 1000);

        if (dataStructure === 'json') {
          // Use RedisJSON operations with sendCommand
          await redisClient.sendCommand(['JSON.SET', cacheKey, '$', JSON.stringify(result)]);
          await redisClient.expire(cacheKey, ttlSeconds);
          console.log(`[@CacheResult:JSON] ✅ REDIS SET: "${cacheKey}" (TTL: ${options.ttl}ms)`);
        } else if (dataStructure === 'hash') {
          // Use Redis Hash operations (flatten object)
          if (typeof result === 'object' && result !== null) {
            const flatObject = flattenObject(result);
            await redisClient.hSet(cacheKey, flatObject);
            await redisClient.expire(cacheKey, ttlSeconds);
            console.log(`[@CacheResult:HASH] ✅ REDIS SET: "${cacheKey}" (TTL: ${options.ttl}ms)`);
          } else {
            console.warn(`[@CacheResult:HASH] Cannot store non-object as hash, falling back to string`);
            await store.set(cacheKey, result, options.ttl);
          }
        } else {
          // Default: String (original behavior)
          await store.set(cacheKey, result, options.ttl);
          console.log(`[@CacheResult:STRING] ✅ REDIS SET: "${cacheKey}" (TTL: ${options.ttl}ms)`);
        }
      } catch (error: any) {
        console.error(`[@CacheResult:${dataStructure.toUpperCase()}] Redis SET error:`, error.message);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Helper function to flatten nested objects for Redis Hash storage
 * Converts { user: { name: 'John', age: 30 } } to { 'user.name': 'John', 'user.age': '30' }
 */
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        // Store arrays as JSON strings
        flattened[newKey] = JSON.stringify(value);
      } else {
        // Convert primitives to strings
        flattened[newKey] = String(value);
      }
    }
  }

  return flattened;
}

export function InvalidateCache(options: {
  keyPrefix: string;
  includeOrgId?: boolean;
  keyGenerator?: (...args: any[]) => string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const store: any = (global as any).__REDIS_STORE__;

      if (!store) {
        console.warn(`[@InvalidateCache] Redis store not found!`);
        return result;
      }

      try {
        let cacheKey: string;
        if (options.keyGenerator) {
          cacheKey = options.keyGenerator(...args);
        } else {
          const keyParts = [options.keyPrefix];
          if (options.includeOrgId && args.length > 0) {
            keyParts.push(`org:${args[0]}`);
          }
          cacheKey = keyParts.join(':');
        }

        await store.del(cacheKey);
        console.log(`[@InvalidateCache] ✅ REDIS DELETE: "${cacheKey}"`);
      } catch (error: any) {
        console.error('[@InvalidateCache] Redis error:', error.message);
      }

      return result;
    };

    return descriptor;
  };
}
