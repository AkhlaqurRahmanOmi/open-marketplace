import { registerAs } from '@nestjs/config';

/**
 * Cache configuration
 * Contains in-memory cache settings
 */
export default registerAs('cache', () => ({
  /** Default cache TTL in milliseconds */
  ttl: parseInt(process.env.CACHE_TTL || '60000', 10) || 60000, // 60 seconds

  /** Maximum number of items in cache */
  max: parseInt(process.env.CACHE_MAX_ITEMS || '100', 10) || 100,

  /** Enable cache globally */
  isGlobal: true,
}));
