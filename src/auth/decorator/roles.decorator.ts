import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for storing required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are allowed to access an endpoint
 *
 * @example
 * ```typescript
 * @Get('admin-only')
 * @Roles('ADMIN')
 * async adminEndpoint() {
 *   return 'Only admins can see this';
 * }
 *
 * @Get('admin-or-moderator')
 * @Roles('ADMIN', 'MODERATOR')
 * async multiRoleEndpoint() {
 *   return 'Admins or moderators can see this';
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
