import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for excluding global response formatting
 */
export const EXCLUDE_GLOBAL_RESPONSE_KEY = 'excludeGlobalResponse';

/**
 * Decorator to exclude an endpoint from global response formatting
 * Use this for endpoints that need custom response formats (e.g., file downloads, SSE)
 *
 * @example
 * ```typescript
 * @Get('download')
 * @ExcludeGlobalResponse()
 * downloadFile() {
 *   // Returns raw response without standardized formatting
 * }
 * ```
 */
export const ExcludeGlobalResponse = () =>
  SetMetadata(EXCLUDE_GLOBAL_RESPONSE_KEY, true);
