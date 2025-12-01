import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedRBAC() {
  console.log('🔐 Seeding RBAC (Roles & Permissions)...');

  // ==================== PERMISSIONS ====================
  const permissions = [
    // ===== Platform-level permissions =====
    { name: 'platform:admin', description: 'Full platform administration', resource: 'platform', action: 'admin', scope: 'platform' },
    { name: 'platform:read', description: 'Read platform data', resource: 'platform', action: 'read', scope: 'platform' },

    // ===== User management =====
    { name: 'user:create', description: 'Create users', resource: 'user', action: 'create', scope: 'platform' },
    { name: 'user:read', description: 'Read user data', resource: 'user', action: 'read', scope: 'platform' },
    { name: 'user:update', description: 'Update user data', resource: 'user', action: 'update', scope: 'platform' },
    { name: 'user:delete', description: 'Delete users', resource: 'user', action: 'delete', scope: 'platform' },
    { name: 'users:view', description: 'View users', resource: 'users', action: 'view', scope: 'platform' },
    { name: 'users:update', description: 'Update users', resource: 'users', action: 'update', scope: 'platform' },
    { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete', scope: 'platform' },

    // ===== Organization management (singular) =====
    { name: 'organization:create', description: 'Create organizations', resource: 'organization', action: 'create', scope: 'platform' },
    { name: 'organization:read', description: 'Read organization data', resource: 'organization', action: 'read', scope: 'platform' },
    { name: 'organization:update', description: 'Update organization data', resource: 'organization', action: 'update', scope: 'platform' },
    { name: 'organization:delete', description: 'Delete organizations', resource: 'organization', action: 'delete', scope: 'platform' },
    { name: 'organization:approve', description: 'Approve organizations', resource: 'organization', action: 'approve', scope: 'platform' },
    { name: 'organization:invite', description: 'Invite to organizations', resource: 'organization', action: 'invite', scope: 'platform' },

    // ===== Organizations management (plural - used by controllers) =====
    { name: 'organizations:create', description: 'Create organizations', resource: 'organizations', action: 'create', scope: 'platform' },
    { name: 'organizations:read', description: 'Read organizations data', resource: 'organizations', action: 'read', scope: 'platform' },
    { name: 'organizations:view', description: 'View organizations', resource: 'organizations', action: 'view', scope: 'platform' },
    { name: 'organizations:update', description: 'Update organizations data', resource: 'organizations', action: 'update', scope: 'platform' },
    { name: 'organizations:delete', description: 'Delete organizations', resource: 'organizations', action: 'delete', scope: 'platform' },
    { name: 'organizations:approve', description: 'Approve organizations', resource: 'organizations', action: 'approve', scope: 'platform' },
    { name: 'organizations:suspend', description: 'Suspend organizations', resource: 'organizations', action: 'suspend', scope: 'platform' },
    { name: 'organizations:invite', description: 'Invite users to organizations', resource: 'organizations', action: 'invite', scope: 'platform' },

    // ===== Attributes =====
    { name: 'attribute:create', description: 'Create attributes', resource: 'attribute', action: 'create', scope: 'platform' },
    { name: 'attribute:read', description: 'Read attributes', resource: 'attribute', action: 'read', scope: 'platform' },

    // ===== Products (platform) =====
    { name: 'products:create', description: 'Create products', resource: 'products', action: 'create', scope: 'platform' },
    { name: 'products:update', description: 'Update products', resource: 'products', action: 'update', scope: 'platform' },
    { name: 'products:delete', description: 'Delete products', resource: 'products', action: 'delete', scope: 'platform' },

    // ===== Categories =====
    { name: 'categories:create', description: 'Create categories', resource: 'categories', action: 'create', scope: 'platform' },
    { name: 'categories:update', description: 'Update categories', resource: 'categories', action: 'update', scope: 'platform' },
    { name: 'categories:delete', description: 'Delete categories', resource: 'categories', action: 'delete', scope: 'platform' },

    // ===== Orders (platform) =====
    { name: 'orders:view', description: 'View orders', resource: 'orders', action: 'view', scope: 'platform' },
    { name: 'orders:create', description: 'Create orders', resource: 'orders', action: 'create', scope: 'platform' },
    { name: 'orders:update', description: 'Update orders', resource: 'orders', action: 'update', scope: 'platform' },
    { name: 'orders:cancel', description: 'Cancel orders', resource: 'orders', action: 'cancel', scope: 'platform' },

    // ===== Inventory (platform) =====
    { name: 'inventory:view', description: 'View inventory', resource: 'inventory', action: 'view', scope: 'platform' },
    { name: 'inventory:create', description: 'Create inventory', resource: 'inventory', action: 'create', scope: 'platform' },
    { name: 'inventory:update', description: 'Update inventory', resource: 'inventory', action: 'update', scope: 'platform' },
    { name: 'inventory:delete', description: 'Delete inventory', resource: 'inventory', action: 'delete', scope: 'platform' },
    { name: 'inventory:adjust', description: 'Adjust inventory', resource: 'inventory', action: 'adjust', scope: 'platform' },
    { name: 'inventory:transfer', description: 'Transfer inventory', resource: 'inventory', action: 'transfer', scope: 'platform' },

    // ===== Carts =====
    { name: 'carts:create', description: 'Create carts', resource: 'carts', action: 'create', scope: 'platform' },
    { name: 'carts:read', description: 'Read carts', resource: 'carts', action: 'read', scope: 'platform' },
    { name: 'carts:view', description: 'View carts', resource: 'carts', action: 'view', scope: 'platform' },
    { name: 'carts:update', description: 'Update carts', resource: 'carts', action: 'update', scope: 'platform' },
    { name: 'carts:delete', description: 'Delete carts', resource: 'carts', action: 'delete', scope: 'platform' },

    // ===== Reviews =====
    { name: 'reviews:create', description: 'Create reviews', resource: 'reviews', action: 'create', scope: 'platform' },
    { name: 'reviews:update', description: 'Update reviews', resource: 'reviews', action: 'update', scope: 'platform' },
    { name: 'reviews:delete', description: 'Delete reviews', resource: 'reviews', action: 'delete', scope: 'platform' },
    { name: 'reviews:approve', description: 'Approve reviews', resource: 'reviews', action: 'approve', scope: 'platform' },

    // ===== Shipping =====
    { name: 'shipping:view', description: 'View shipping', resource: 'shipping', action: 'view', scope: 'platform' },
    { name: 'shipping:create', description: 'Create shipping', resource: 'shipping', action: 'create', scope: 'platform' },
    { name: 'shipping:update', description: 'Update shipping', resource: 'shipping', action: 'update', scope: 'platform' },
    { name: 'shipping:delete', description: 'Delete shipping', resource: 'shipping', action: 'delete', scope: 'platform' },

    // ===== Bundles =====
    { name: 'bundles:create', description: 'Create bundles', resource: 'bundles', action: 'create', scope: 'platform' },
    { name: 'bundles:update', description: 'Update bundles', resource: 'bundles', action: 'update', scope: 'platform' },
    { name: 'bundles:delete', description: 'Delete bundles', resource: 'bundles', action: 'delete', scope: 'platform' },

    // ===== Blog =====
    { name: 'blog:view', description: 'View blog posts', resource: 'blog', action: 'view', scope: 'platform' },
    { name: 'blog:create', description: 'Create blog posts', resource: 'blog', action: 'create', scope: 'platform' },
    { name: 'blog:update', description: 'Update blog posts', resource: 'blog', action: 'update', scope: 'platform' },
    { name: 'blog:delete', description: 'Delete blog posts', resource: 'blog', action: 'delete', scope: 'platform' },
    { name: 'blog:publish', description: 'Publish blog posts', resource: 'blog', action: 'publish', scope: 'platform' },

    // ===== CMS =====
    { name: 'cms:read', description: 'Read CMS content', resource: 'cms', action: 'read', scope: 'platform' },
    { name: 'cms:update', description: 'Update CMS content', resource: 'cms', action: 'update', scope: 'platform' },

    // ===== Notifications =====
    { name: 'notifications:view', description: 'View notifications', resource: 'notifications', action: 'view', scope: 'platform' },
    { name: 'notifications:send', description: 'Send notifications', resource: 'notifications', action: 'send', scope: 'platform' },
    { name: 'notifications:update', description: 'Update notifications', resource: 'notifications', action: 'update', scope: 'platform' },
    { name: 'notifications:delete', description: 'Delete notifications', resource: 'notifications', action: 'delete', scope: 'platform' },

    // ===== Reports =====
    { name: 'reports:view', description: 'View reports', resource: 'reports', action: 'view', scope: 'platform' },
    { name: 'reports:read', description: 'Read reports', resource: 'reports', action: 'read', scope: 'platform' },

    // ===== Documents =====
    { name: 'documents:view', description: 'View documents', resource: 'documents', action: 'view', scope: 'platform' },
    { name: 'documents:review', description: 'Review documents', resource: 'documents', action: 'review', scope: 'platform' },

    // ===== Roles (dot notation as used in controllers) =====
    { name: 'role.read', description: 'Read roles', resource: 'role', action: 'read', scope: 'platform' },
    { name: 'role.create', description: 'Create roles', resource: 'role', action: 'create', scope: 'platform' },
    { name: 'role.update', description: 'Update roles', resource: 'role', action: 'update', scope: 'platform' },
    { name: 'role.delete', description: 'Delete roles', resource: 'role', action: 'delete', scope: 'platform' },
    { name: 'role.manage', description: 'Manage roles', resource: 'role', action: 'manage', scope: 'platform' },

    // ===== Permissions (dot notation as used in controllers) =====
    { name: 'permission.read', description: 'Read permissions', resource: 'permission', action: 'read', scope: 'platform' },
    { name: 'permission.create', description: 'Create permissions', resource: 'permission', action: 'create', scope: 'platform' },
    { name: 'permission.delete', description: 'Delete permissions', resource: 'permission', action: 'delete', scope: 'platform' },
    { name: 'permission.manage', description: 'Manage permissions', resource: 'permission', action: 'manage', scope: 'platform' },

    // ===== Organization-level permissions =====
    { name: 'org:product:create', description: 'Create products in organization', resource: 'product', action: 'create', scope: 'organization' },
    { name: 'org:product:read', description: 'Read products in organization', resource: 'product', action: 'read', scope: 'organization' },
    { name: 'org:product:update', description: 'Update products in organization', resource: 'product', action: 'update', scope: 'organization' },
    { name: 'org:product:delete', description: 'Delete products in organization', resource: 'product', action: 'delete', scope: 'organization' },

    { name: 'org:order:create', description: 'Create orders in organization', resource: 'order', action: 'create', scope: 'organization' },
    { name: 'org:order:read', description: 'Read orders in organization', resource: 'order', action: 'read', scope: 'organization' },
    { name: 'org:order:update', description: 'Update orders in organization', resource: 'order', action: 'update', scope: 'organization' },

    { name: 'org:inventory:create', description: 'Create inventory in organization', resource: 'inventory', action: 'create', scope: 'organization' },
    { name: 'org:inventory:read', description: 'Read inventory in organization', resource: 'inventory', action: 'read', scope: 'organization' },
    { name: 'org:inventory:update', description: 'Update inventory in organization', resource: 'inventory', action: 'update', scope: 'organization' },

    { name: 'org:settings:read', description: 'Read organization settings', resource: 'settings', action: 'read', scope: 'organization' },
    { name: 'org:settings:update', description: 'Update organization settings', resource: 'settings', action: 'update', scope: 'organization' },

    { name: 'org:member:invite', description: 'Invite members to organization', resource: 'member', action: 'invite', scope: 'organization' },
    { name: 'org:member:read', description: 'Read organization members', resource: 'member', action: 'read', scope: 'organization' },
    { name: 'org:member:update', description: 'Update organization members', resource: 'member', action: 'update', scope: 'organization' },
    { name: 'org:member:remove', description: 'Remove members from organization', resource: 'member', action: 'remove', scope: 'organization' },
  ];

  console.log(`  Creating ${permissions.length} permissions...`);
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  console.log(`  ✓ Created ${permissions.length} permissions`);

  // ==================== ROLES ====================
  const roles = [
    // Platform roles
    {
      name: 'super_admin',
      description: 'Super administrator with full system access',
      scope: 'platform',
      permissions: [
        'platform:admin',
        // Users
        'user:create', 'user:read', 'user:update', 'user:delete',
        'users:view', 'users:update', 'users:delete',
        // Organizations (both singular and plural)
        'organization:create', 'organization:read', 'organization:update', 'organization:delete', 'organization:approve', 'organization:invite',
        'organizations:create', 'organizations:read', 'organizations:view', 'organizations:update', 'organizations:delete', 'organizations:approve', 'organizations:suspend', 'organizations:invite',
        // Attributes
        'attribute:create', 'attribute:read',
        // Products
        'products:create', 'products:update', 'products:delete',
        // Categories
        'categories:create', 'categories:update', 'categories:delete',
        // Orders
        'orders:view', 'orders:create', 'orders:update', 'orders:cancel',
        // Inventory
        'inventory:view', 'inventory:create', 'inventory:update', 'inventory:delete', 'inventory:adjust', 'inventory:transfer',
        // Carts
        'carts:create', 'carts:read', 'carts:view', 'carts:update', 'carts:delete',
        // Reviews
        'reviews:create', 'reviews:update', 'reviews:delete', 'reviews:approve',
        // Shipping
        'shipping:view', 'shipping:create', 'shipping:update', 'shipping:delete',
        // Bundles
        'bundles:create', 'bundles:update', 'bundles:delete',
        // Blog
        'blog:view', 'blog:create', 'blog:update', 'blog:delete', 'blog:publish',
        // CMS
        'cms:read', 'cms:update',
        // Notifications
        'notifications:view', 'notifications:send', 'notifications:update', 'notifications:delete',
        // Reports
        'reports:view', 'reports:read',
        // Documents
        'documents:view', 'documents:review',
        // RBAC
        'role.read', 'role.create', 'role.update', 'role.delete', 'role.manage',
        'permission.read', 'permission.create', 'permission.delete', 'permission.manage',
      ],
    },
    {
      name: 'platform_admin',
      description: 'Platform administrator',
      scope: 'platform',
      permissions: [
        'platform:read',
        // Users
        'user:read', 'user:update',
        'users:view', 'users:update',
        // Organizations
        'organization:read', 'organization:approve',
        'organizations:read', 'organizations:view', 'organizations:approve',
        // Products
        'products:update',
        // Orders
        'orders:view', 'orders:update',
        // Inventory
        'inventory:view', 'inventory:update',
        // Reviews
        'reviews:approve',
        // Reports
        'reports:view', 'reports:read',
        // Documents
        'documents:view', 'documents:review',
        // RBAC (read only)
        'role.read', 'permission.read',
      ],
    },
    {
      name: 'customer',
      description: 'Regular customer',
      scope: 'platform',
      permissions: [
        // Customers can view products, create orders, manage their cart
        'orders:create', 'orders:view',
        'carts:create', 'carts:read', 'carts:view', 'carts:update', 'carts:delete',
        'reviews:create',
      ],
    },

    // Organization roles
    {
      name: 'org_owner',
      description: 'Organization owner with full control',
      scope: 'organization',
      permissions: [
        'org:product:create', 'org:product:read', 'org:product:update', 'org:product:delete',
        'org:order:read', 'org:order:update',
        'org:inventory:create', 'org:inventory:read', 'org:inventory:update',
        'org:settings:read', 'org:settings:update',
        'org:member:invite', 'org:member:read', 'org:member:update', 'org:member:remove',
      ],
      organizationTypes: ['vendor', 'delivery_partner', 'financial_service'],
    },
    {
      name: 'org_manager',
      description: 'Organization manager',
      scope: 'organization',
      permissions: [
        'org:product:create', 'org:product:read', 'org:product:update',
        'org:order:read', 'org:order:update',
        'org:inventory:read', 'org:inventory:update',
        'org:member:read',
      ],
      organizationTypes: ['vendor', 'delivery_partner'],
    },
    {
      name: 'org_staff',
      description: 'Organization staff member',
      scope: 'organization',
      permissions: [
        'org:product:read',
        'org:order:read',
        'org:inventory:read',
      ],
      organizationTypes: ['vendor', 'delivery_partner'],
    },
  ];

  console.log(`  Creating ${roles.length} roles...`);
  for (const roleData of roles) {
    const { permissions: rolePermissions, organizationTypes, ...roleInfo } = roleData;

    const role = await prisma.role.upsert({
      where: { name: roleInfo.name },
      update: {},
      create: roleInfo,
    });

    // Assign permissions to role
    if (rolePermissions && rolePermissions.length > 0) {
      for (const permName of rolePermissions) {
        const permission = await prisma.permission.findUnique({
          where: { name: permName },
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
    }

    // Assign organization types to role
    if (organizationTypes && organizationTypes.length > 0) {
      for (const orgType of organizationTypes) {
        await prisma.roleOrganizationType.upsert({
          where: {
            roleId_organizationType: {
              roleId: role.id,
              organizationType: orgType,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            organizationType: orgType,
          },
        });
      }
    }

    console.log(`  ✓ Created role: ${roleInfo.name}`);
  }

  console.log('✅ RBAC seeding completed!\n');
}
