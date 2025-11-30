import { Role, Permission, RolePermission, UserRole, OrganizationUser } from '@prisma/client';

/**
 * Role with its associated permissions
 */
export type RoleWithPermissions = Role & {
  rolePermissions: Array<
    RolePermission & {
      permission: Permission;
    }
  >;
};

/**
 * Role with user assignments
 */
export type RoleWithUsers = Role & {
  userRoles: UserRole[];
  organizationUsers: OrganizationUser[];
};

/**
 * Complete role with all relations
 */
export type RoleWithRelations = Role & {
  rolePermissions: Array<
    RolePermission & {
      permission: Permission;
    }
  >;
  userRoles: UserRole[];
  organizationUsers: OrganizationUser[];
};

/**
 * Permission response with role count
 */
export type PermissionWithRoleCount = Permission & {
  _count?: {
    rolePermissions: number;
  };
};
