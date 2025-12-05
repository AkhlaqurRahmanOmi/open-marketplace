import { registerAs } from '@nestjs/config';

/**
 * Redis configuration
 * Used by both Redis Cache Module and BullMQ Queue Module
 */
export default registerAs('redis', () => ({
  /** Redis host */
  host: process.env.REDIS_HOST || 'localhost',

  /** Redis port */
  port: parseInt(process.env.REDIS_PORT || '6379', 10),

  /** Redis password (optional) */
  password: process.env.REDIS_PASSWORD || undefined,

  /** Redis database index (0-15) */
  db: (() => {
    const dbValue = process.env.REDIS_DB || '0';
    // Map string names to database numbers
    const dbMap: Record<string, number> = {
      'multi-vendor': 1,
      'cache': 2,
      'sessions': 3,
      'queue': 4,
    };
    // If it's a named database, use the mapping; otherwise parse as number
    return dbMap[dbValue] !== undefined ? dbMap[dbValue] : parseInt(dbValue, 10) || 0;
  })(),

  /** Default TTL for cache in seconds */
  ttl: parseInt(process.env.REDIS_TTL || '300', 10), // 5 minutes

  /** Connection timeout in milliseconds */
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),

  /** Maximum retry attempts */
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
}));

