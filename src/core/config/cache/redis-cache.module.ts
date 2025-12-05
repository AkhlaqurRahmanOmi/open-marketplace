import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
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

        const storeConfig: any = {
          socket: { host, port },
          database: db,
        };

        if (password && password.trim() !== '') {
          storeConfig.password = password;
        }

        const store = await redisStore(storeConfig);
        logger.log('Redis store created successfully');

        // Store globally for decorator access
        (global as any).__REDIS_STORE__ = store;

        // Also store the Redis client directly for JSON operations
        (global as any).__REDIS_CLIENT__ = store.client;
        logger.log('Redis client stored globally for decorators');

        return {
          store: store,
          ttl: ttl * 1000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
