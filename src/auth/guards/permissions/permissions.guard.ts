import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from 'src/auth/decorator/permissions.decorator';
import { ROLES_KEY } from 'src/auth/decorator/roles.decorator';
import { REQUEST_USER_KEY } from 'src/auth/constants/auth.constants';
import { UserService } from 'src/user/user.service';
import { UserWithRoles } from 'src/user/types/user-with-relations.type';
import type { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles and permissions from decorators
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions are required, allow access
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    // Get user from request (JWT payload already decoded by AccessTokenGuard)
    const request = context.switchToHttp().getRequest();
    const user: ActiveUserData = request[REQUEST_USER_KEY];

    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract user's roles and permissions from JWT
    const userRoles = new Set<string>(user.roles || []);
    const userPermissions = new Set<string>(user.permissions || []);

    // Get active organization from JWT
    const activeOrganization = user.activeOrganization;

    // Check roles (if specified)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) => userRoles.has(role));

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check permissions (if specified)
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.has(permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          'You do not have the required permissions to access this resource',
        );
      }
    }

    // Store organization context in request for controllers to use
    request['organizationContext'] = activeOrganization;

    return true;
  }
}
