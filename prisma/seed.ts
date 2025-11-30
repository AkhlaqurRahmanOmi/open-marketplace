import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // ============================================
    // 1. Seed Roles
    // ============================================
    console.log('📝 Seeding roles...');

    const roles = [
      {
        name: 'Platform Admin',
        description: 'Full access to platform administration',
        scope: 'platform',
      },
      {
        name: 'Platform Manager',
        description: 'Manages platform operations and organizations',
        scope: 'platform',
      },
      {
        name: 'Organization Admin',
        description: 'Full access to organization management',
        scope: 'organization',
      },
      {
        name: 'Organization Manager',
        description: 'Manages organization operations',
        scope: 'organization',
      },
      {
        name: 'Organization Staff',
        description: 'Limited access to organization resources',
        scope: 'organization',
      },
      {
        name: 'Customer',
        description: 'Standard customer role',
        scope: 'platform',
      },
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {
          description: role.description,
          scope: role.scope,
        },
        create: role,
      });
      console.log(`  ✓ ${role.name}`);
    }

    console.log('✅ Roles seeded successfully\n');

    // ============================================
    // 2. Seed Permissions
    // ============================================
    console.log('📝 Seeding permissions...');

    const resources = [
      'user',
      'role',
      'permission',
      'organization',
      'organization_type',
      'organization_user',
      'attribute',
      'product',
      'category',
      'variant',
      'inventory',
      'order',
      'payment',
      'shipment',
      'refund',
      'coupon',
      'review',
      'document',
      'analytics',
      'settings',
    ];

    const actions = ['create', 'read', 'update', 'delete', 'manage'];

    const permissionPromises: any[] = [];

    // Platform-scoped permissions (for platform admins)
    for (const resource of resources) {
      for (const action of actions) {
        permissionPromises.push(
          prisma.permission.upsert({
            where: {
              resource_action_scope: {
                resource,
                action,
                scope: 'platform',
              },
            },
            update: {
              name: `${resource}.${action}`,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource} (platform-wide)`,
            },
            create: {
              name: `${resource}.${action}`,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource} (platform-wide)`,
              resource,
              action,
              scope: 'platform',
            },
          }),
        );
      }
    }

    // Organization-scoped permissions (for organization users)
    for (const resource of ['product', 'inventory', 'order', 'payment', 'shipment', 'refund', 'coupon', 'review', 'document', 'analytics', 'settings', 'organization_user']) {
      for (const action of actions) {
        permissionPromises.push(
          prisma.permission.upsert({
            where: {
              resource_action_scope: {
                resource,
                action,
                scope: 'organization',
              },
            },
            update: {
              name: `${resource}.${action}.org`,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource} (organization-scoped)`,
            },
            create: {
              name: `${resource}.${action}.org`,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource} (organization-scoped)`,
              resource,
              action,
              scope: 'organization',
            },
          }),
        );
      }
    }

    await Promise.all(permissionPromises);
    console.log(`  ✓ Created ${permissionPromises.length} permissions`);
    console.log('✅ Permissions seeded successfully\n');

    // ============================================
    // 3. Seed Role-Permission Mappings
    // ============================================
    console.log('📝 Seeding role-permission mappings...');

    // Get all roles and permissions
    const allRoles = await prisma.role.findMany();
    const allPermissions = await prisma.permission.findMany();

    const platformAdminRole = allRoles.find((r) => r.name === 'Platform Admin');
    const platformManagerRole = allRoles.find((r) => r.name === 'Platform Manager');
    const orgAdminRole = allRoles.find((r) => r.name === 'Organization Admin');
    const orgManagerRole = allRoles.find((r) => r.name === 'Organization Manager');
    const orgStaffRole = allRoles.find((r) => r.name === 'Organization Staff');
    const customerRole = allRoles.find((r) => r.name === 'Customer');

    // Platform Admin - All permissions
    if (platformAdminRole) {
      for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: platformAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: platformAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`  ✓ Platform Admin: ${allPermissions.length} permissions`);
    }

    // Platform Manager - Read-only platform permissions
    if (platformManagerRole) {
      const platformManagerPermissions = allPermissions.filter(
        (p) => p.scope === 'platform' && ['read', 'update'].includes(p.action),
      );
      for (const permission of platformManagerPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: platformManagerRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: platformManagerRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`  ✓ Platform Manager: ${platformManagerPermissions.length} permissions`);
    }

    // Organization Admin - All organization-scoped permissions
    if (orgAdminRole) {
      const orgAdminPermissions = allPermissions.filter((p) => p.scope === 'organization');
      for (const permission of orgAdminPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: orgAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: orgAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`  ✓ Organization Admin: ${orgAdminPermissions.length} permissions`);
    }

    // Organization Manager - Most organization-scoped permissions (no delete)
    if (orgManagerRole) {
      const orgManagerPermissions = allPermissions.filter(
        (p) => p.scope === 'organization' && p.action !== 'delete',
      );
      for (const permission of orgManagerPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: orgManagerRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: orgManagerRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`  ✓ Organization Manager: ${orgManagerPermissions.length} permissions`);
    }

    // Organization Staff - Read and limited update permissions
    if (orgStaffRole) {
      const orgStaffPermissions = allPermissions.filter(
        (p) =>
          p.scope === 'organization' &&
          ['read', 'update'].includes(p.action) &&
          ['product', 'inventory', 'order', 'shipment'].includes(p.resource),
      );
      for (const permission of orgStaffPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: orgStaffRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: orgStaffRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`  ✓ Organization Staff: ${orgStaffPermissions.length} permissions`);
    }

    // Customer - Read-only for products, orders, reviews
    if (customerRole) {
      const customerPermissions = allPermissions.filter(
        (p) =>
          p.action === 'read' && ['product', 'category', 'review'].includes(p.resource),
      );
      for (const permission of customerPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: customerRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: customerRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`  ✓ Customer: ${customerPermissions.length} permissions`);
    }

    console.log('✅ Role-permission mappings seeded successfully\n');

    // ============================================
    // 4. Seed Organization Types
    // ============================================
    console.log('📝 Seeding organization types...');

    const organizationTypes = [
      {
        code: 'vendor',
        displayName: 'Product Vendor',
        description: 'Organizations that sell physical or digital products',
        category: 'commerce',
        defaultFeeType: 'percentage',
        defaultFeeAmount: 10.0,
        isActive: true,
        requiresApproval: true,
      },
      {
        code: 'delivery_partner',
        displayName: 'Delivery Partner',
        description: 'Organizations that provide delivery and logistics services',
        category: 'logistics',
        defaultFeeType: 'percentage',
        defaultFeeAmount: 5.0,
        isActive: true,
        requiresApproval: true,
      },
      {
        code: 'photographer',
        displayName: 'Photographer',
        description: 'Professional photography services',
        category: 'services',
        defaultFeeType: 'percentage',
        defaultFeeAmount: 15.0,
        isActive: true,
        requiresApproval: true,
      },
      {
        code: 'caterer',
        displayName: 'Caterer',
        description: 'Catering and food service providers',
        category: 'services',
        defaultFeeType: 'percentage',
        defaultFeeAmount: 12.0,
        isActive: true,
        requiresApproval: true,
      },
      {
        code: 'event_planner',
        displayName: 'Event Planner',
        description: 'Event planning and coordination services',
        category: 'services',
        defaultFeeType: 'percentage',
        defaultFeeAmount: 15.0,
        isActive: true,
        requiresApproval: true,
      },
      {
        code: 'venue',
        displayName: 'Venue Provider',
        description: 'Organizations that provide event venues',
        category: 'facilities',
        defaultFeeType: 'percentage',
        defaultFeeAmount: 8.0,
        isActive: true,
        requiresApproval: true,
      },
    ];

    for (const orgType of organizationTypes) {
      await prisma.organizationType.upsert({
        where: { code: orgType.code },
        update: {
          displayName: orgType.displayName,
          description: orgType.description,
          category: orgType.category,
          defaultFeeType: orgType.defaultFeeType,
          defaultFeeAmount: orgType.defaultFeeAmount,
          isActive: orgType.isActive,
          requiresApproval: orgType.requiresApproval,
        },
        create: orgType,
      });
      console.log(`  ✓ ${orgType.displayName} (${orgType.code})`);
    }

    console.log('✅ Organization types seeded successfully\n');

    // ============================================
    // 5. Seed Attribute Definitions
    // ============================================
    console.log('📝 Seeding attribute definitions...');

    const attributeDefinitions = [
      // Vendor-specific attributes
      {
        key: 'business_license_number',
        label: 'Business License Number',
        description: 'Official business registration number',
        dataType: 'string',
        isRequired: true,
        group: 'legal',
        displayOrder: 1,
        applicableTypes: ['vendor'],
      },
      {
        key: 'warehouse_capacity',
        label: 'Warehouse Capacity (sqft)',
        description: 'Total warehouse storage capacity',
        dataType: 'number',
        isRequired: false,
        minValue: 0,
        group: 'operations',
        displayOrder: 2,
        applicableTypes: ['vendor'],
      },
      {
        key: 'product_categories',
        label: 'Product Categories',
        description: 'Categories of products sold',
        dataType: 'array',
        isRequired: true,
        group: 'business',
        displayOrder: 3,
        applicableTypes: ['vendor'],
      },
      // Delivery Partner attributes
      {
        key: 'vehicle_types',
        label: 'Vehicle Types',
        description: 'Types of delivery vehicles available',
        dataType: 'array',
        isRequired: true,
        group: 'fleet',
        displayOrder: 1,
        applicableTypes: ['delivery_partner'],
      },
      {
        key: 'coverage_areas',
        label: 'Coverage Areas',
        description: 'Geographic areas covered for delivery',
        dataType: 'array',
        isRequired: true,
        group: 'operations',
        displayOrder: 2,
        applicableTypes: ['delivery_partner'],
      },
      {
        key: 'max_weight_capacity',
        label: 'Max Weight Capacity (kg)',
        description: 'Maximum weight per delivery',
        dataType: 'number',
        isRequired: true,
        minValue: 0,
        group: 'fleet',
        displayOrder: 3,
        applicableTypes: ['delivery_partner'],
      },
      // Photographer attributes
      {
        key: 'photography_styles',
        label: 'Photography Styles',
        description: 'Specialization in photography styles',
        dataType: 'array',
        isRequired: true,
        group: 'services',
        displayOrder: 1,
        applicableTypes: ['photographer'],
      },
      {
        key: 'hourly_rate',
        label: 'Hourly Rate (USD)',
        description: 'Standard hourly rate',
        dataType: 'number',
        isRequired: true,
        minValue: 0,
        group: 'pricing',
        displayOrder: 2,
        applicableTypes: ['photographer', 'event_planner'],
      },
      {
        key: 'equipment_list',
        label: 'Equipment List',
        description: 'List of professional equipment owned',
        dataType: 'array',
        isRequired: false,
        group: 'equipment',
        displayOrder: 3,
        applicableTypes: ['photographer'],
      },
      // Caterer attributes
      {
        key: 'cuisine_types',
        label: 'Cuisine Types',
        description: 'Types of cuisine offered',
        dataType: 'array',
        isRequired: true,
        group: 'menu',
        displayOrder: 1,
        applicableTypes: ['caterer'],
      },
      {
        key: 'min_order_size',
        label: 'Minimum Order Size (people)',
        description: 'Minimum number of people for catering',
        dataType: 'number',
        isRequired: true,
        minValue: 1,
        group: 'operations',
        displayOrder: 2,
        applicableTypes: ['caterer'],
      },
      {
        key: 'food_safety_certification',
        label: 'Food Safety Certification',
        description: 'Food handling and safety certification',
        dataType: 'string',
        isRequired: true,
        group: 'legal',
        displayOrder: 3,
        applicableTypes: ['caterer'],
      },
      // Venue attributes
      {
        key: 'venue_capacity',
        label: 'Venue Capacity (people)',
        description: 'Maximum number of people venue can accommodate',
        dataType: 'number',
        isRequired: true,
        minValue: 1,
        group: 'facilities',
        displayOrder: 1,
        applicableTypes: ['venue'],
      },
      {
        key: 'venue_type',
        label: 'Venue Type',
        description: 'Type of venue (indoor, outdoor, hybrid)',
        dataType: 'string',
        isRequired: true,
        group: 'facilities',
        displayOrder: 2,
        applicableTypes: ['venue'],
      },
      {
        key: 'amenities',
        label: 'Amenities',
        description: 'Available amenities and facilities',
        dataType: 'array',
        isRequired: false,
        group: 'facilities',
        displayOrder: 3,
        applicableTypes: ['venue'],
      },
    ];

    for (const attrDef of attributeDefinitions) {
      const { applicableTypes, ...attrData } = attrDef;

      const createdAttr = await prisma.attributeDefinition.upsert({
        where: { key: attrDef.key },
        update: {
          label: attrData.label,
          description: attrData.description,
          dataType: attrData.dataType,
          isRequired: attrData.isRequired,
          minValue: attrData.minValue,
          group: attrData.group,
          displayOrder: attrData.displayOrder,
        },
        create: attrData,
      });

      // Create applicable type mappings
      for (const orgType of applicableTypes) {
        await prisma.attributeApplicableType.upsert({
          where: {
            attributeDefinitionId_organizationType: {
              attributeDefinitionId: createdAttr.id,
              organizationType: orgType,
            },
          },
          update: {},
          create: {
            attributeDefinitionId: createdAttr.id,
            organizationType: orgType,
          },
        });
      }

      console.log(`  ✓ ${attrDef.label} (${attrDef.key})`);
    }

    console.log('✅ Attribute definitions seeded successfully\n');

    // ============================================
    // 6. Create Platform Admin User (Optional)
    // ============================================
    console.log('📝 Creating platform admin user...');

    const adminEmail = 'admin@waywise.com';
    const adminPassword = await bcrypt.hash('Admin@123', 10);

    const adminRole = await prisma.role.findUnique({
      where: { name: 'Platform Admin' },
    });

    if (adminRole) {
      const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          firstName: 'Platform',
          lastName: 'Admin',
          userType: 'admin',
          isVerified: true,
          isActive: true,
          verifiedAt: new Date(),
        },
        create: {
          email: adminEmail,
          password: adminPassword,
          firstName: 'Platform',
          lastName: 'Admin',
          userType: 'admin',
          isVerified: true,
          isActive: true,
          verifiedAt: new Date(),
        },
      });

      // Assign Platform Admin role
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: adminRole.id,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });

      console.log(`  ✓ Admin user created: ${adminEmail}`);
      console.log(`  ℹ️  Default password: Admin@123 (Please change after first login)`);
    }

    console.log('✅ Platform admin user created successfully\n');

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
