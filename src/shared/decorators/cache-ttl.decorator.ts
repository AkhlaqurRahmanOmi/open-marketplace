import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for custom cache TTL
 */
export const CACHE_TTL_KEY = 'cacheTTL';

/**
 * Decorator to set a custom cache TTL (Time To Live) for an endpoint
 *
 * @param ttl - Cache duration in milliseconds
 *
 * @example
 * ```typescript
 * @Get('products')
 * @CacheTTL(60000) // Cache for 60 seconds
 * getProducts() {
 *   // This response will be cached for 60 seconds
 * }
 * ```
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);
