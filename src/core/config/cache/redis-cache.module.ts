import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

/**
 * RedisCacheModule
 *
 * Global module that provides Redis-based caching throughout the application.
 * Replaces the default in-memory cache with Redis for:
 * - Distributed caching across multiple instances
 * - Persistent cache that survives restarts
 * - Shared cache between services
 *
 * Usage:
 * 1. Import this module in AppModule (already global)
 * 2. Inject CACHE_MANAGER in your service:
 *
 * @example
 * ```typescript
 * import { CACHE_MANAGER } from '@nestjs/cache-manager';
 * import { Cache } from 'cache-manager';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
 *
 *   async getData(key: string) {
 *     // Try cache first
 *     const cached = await this.cacheManager.get(key);
 *     if (cached) return cached;
 *
 *     // Fetch and cache
 *     const data = await this.fetchData();
 *     await this.cacheManager.set(key, data, 300000); // 5 min TTL in ms
 *     return data;
 *   }
 * }
 * ```
 *
 * Or use the @UseInterceptors(CacheInterceptor) decorator on controllers.
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisCacheModule');
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const password = configService.get<string>('redis.password');
        const db = configService.get<number>('redis.db');
        const ttl = configService.get<number>('redis.ttl') || 300;

        logger.log(`Connecting to Redis at ${host}:${port}, DB: ${db}`);

        try {
          const storeConfig: any = {
            socket: {
              host,
              port,
              connectTimeout: configService.get<number>('redis.connectTimeout') || 10000,
            },
            database: db,
          };

          // Only add password if it's actually set (not empty string)
          if (password && password.trim() !== '') {
            storeConfig.password = password;
          }

          const store = await redisStore(storeConfig);

          logger.log('Redis cache connection established successfully');

          return {
            store,
            ttl: ttl * 1000, // Convert seconds to milliseconds
          };
        } catch (error) {
          logger.error(`Failed to connect to Redis: ${error.message}`);
          throw error;
        }
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}

