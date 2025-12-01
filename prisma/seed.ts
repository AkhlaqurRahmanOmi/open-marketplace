import { PrismaClient } from '@prisma/client';
import { seedRBAC } from './seeders/01-rbac.seeder';
import { seedUsers } from './seeders/02-users.seeder';
import { seedOrganizationTypes } from './seeders/03-organization-types.seeder';
import { seedOrganizations } from './seeders/04-organizations.seeder';
import { seedAttributes } from './seeders/05-attributes.seeder';
import { seedCategories } from './seeders/06-categories.seeder';
import { seedProducts } from './seeders/07-products.seeder';
import { seederConfig, SUPER_ADMIN_CREDENTIALS, TEST_USERS } from './seeders/config/seeder.config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');
  console.log('=' .repeat(60));
  console.log('  WAYWISE MULTI-VENDOR E-COMMERCE PLATFORM');
  console.log('  Database Seeder');
  console.log('=' + '='.repeat(60) + '\n');

  try {
    // 1. RBAC (Roles & Permissions)
    if (seederConfig.rbac.enabled) {
      await seedRBAC();
    }

    // 2. Users (including Super Admin)
    if (seederConfig.users.enabled) {
      await seedUsers();
    }

    // 3. Organization Types
    if (seederConfig.organizationTypes.enabled) {
      await seedOrganizationTypes();
    }

    // 4. Organizations
    if (seederConfig.organizations.enabled) {
      await seedOrganizations();
    }

    // 5. Attribute Definitions
    if (seederConfig.attributes.enabled) {
      await seedAttributes();
    }

    // 6. Categories
    if (seederConfig.categories.enabled) {
      await seedCategories();
    }

    // 7. Products (with Variants, Images, Inventory)
    if (seederConfig.products.enabled) {
      await seedProducts();
    }

    console.log('=' + '='.repeat(60));
    console.log('✅ Database seeding completed successfully!\n');

    // Print summary
    console.log('📊 SEEDING SUMMARY:');
    console.log('=' + '='.repeat(60));

    const stats = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.organizationType.count(),
      prisma.organization.count(),
      prisma.attributeDefinition.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.variant.count(),
      prisma.variantInventory.count(),
    ]);

    console.log(`  Users:                    ${stats[0]}`);
    console.log(`  Roles:                    ${stats[1]}`);
    console.log(`  Permissions:              ${stats[2]}`);
    console.log(`  Organization Types:       ${stats[3]}`);
    console.log(`  Organizations:            ${stats[4]}`);
    console.log(`  Attribute Definitions:    ${stats[5]}`);
    console.log(`  Categories:               ${stats[6]}`);
    console.log(`  Products:                 ${stats[7]}`);
    console.log(`  Variants:                 ${stats[8]}`);
    console.log(`  Inventory Records:        ${stats[9]}`);
    console.log('=' + '='.repeat(60) + '\n');

    // Print credentials
    console.log('🔑 SUPER ADMIN CREDENTIALS:');
    console.log('=' + '='.repeat(60));
    console.log(`  Email:    ${SUPER_ADMIN_CREDENTIALS.email}`);
    console.log(`  Password: ${SUPER_ADMIN_CREDENTIALS.password}`);
    console.log('=' + '='.repeat(60) + '\n');

    console.log('👥 TEST USER CREDENTIALS:');
    console.log('=' + '='.repeat(60));
    TEST_USERS.forEach((user) => {
      console.log(`  ${user.email.padEnd(30)} | Password: ${user.password}`);
    });
    console.log('=' + '='.repeat(60) + '\n');

    console.log('🎉 You can now test the API with Postman using these credentials!\n');
    console.log('📍 API Base URL: http://localhost:5000/api\n');
    console.log('🔗 Common Endpoints:');
    console.log('  - POST /api/auth/sign-in        (Login)');
    console.log('  - GET  /api/organizations        (List organizations)');
    console.log('  - GET  /api/products             (List products - public)');
    console.log('  - GET  /api/categories           (List categories)');
    console.log('\n');

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
