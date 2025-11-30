import { SetMetadata } from '@nestjs/common';
import { RelatedLinksConfig } from '../types/related-links-config.interface';

/**
 * Metadata key for storing related links configuration
 */
export const RELATED_LINKS_KEY = 'related_links';

/**
 * Decorator to define related HATEOAS links for an endpoint
 *
 * @example
 * ```typescript
 * @Post('sign-in')
 * @RelatedLinks({
 *   profile: {
 *     path: '/user/profile',
 *     method: 'GET',
 *     description: 'View your profile'
 *   },
 *   logout: {
 *     path: '/auth/logout',
 *     method: 'POST',
 *     description: 'Logout from your account'
 *   }
 * })
 * async signIn(@Body() signInDto: SignInDto) {
 *   return this.authService.signIn(signInDto);
 * }
 * ```
 */
export const RelatedLinks = (config: RelatedLinksConfig) =>
  SetMetadata(RELATED_LINKS_KEY, config);
