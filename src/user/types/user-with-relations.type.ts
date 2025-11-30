import { User, Role, Permission, Organization, OrganizationUser } from '@prisma/client';

// Type for Role with its permissions
export type RoleWithPermissions = Role & {
  rolePermissions: Array<{
    permission: Permission;
  }>;
};

// Type for UserRole with nested Role and Permissions
export type UserRoleWithRelations = {
  role: RoleWithPermissions;
};

// Type for User with roles and permissions
export type UserWithRoles = User & {
  userRoles: UserRoleWithRelations[];
};

// Type for OrganizationUser with organization details
export type OrganizationUserWithOrganization = OrganizationUser & {
  organization: Organization;
};

// Type for User with organizations (for multi-vendor context)
export type UserWithOrganizations = User & {
  organizationUsers: OrganizationUserWithOrganization[];
};

// Type for User with both roles and organizations
export type UserWithRolesAndOrganizations = User & {
  userRoles: UserRoleWithRelations[];
  organizationUsers: OrganizationUserWithOrganization[];
};

// Type for the formatted role response
export interface FormattedRole {
  id: number;
  name: string;
  description: string | null;
  permissions: FormattedPermission[];
}

// Type for the formatted permission response
export interface FormattedPermission {
  id: number;
  name: string;
  description: string | null;
}

// Type for the formatted organization response (in JWT)
export interface FormattedOrganization {
  id: number;
  name: string;
  type: string;
  status: string;
  role: string; // User's role within this organization
}
