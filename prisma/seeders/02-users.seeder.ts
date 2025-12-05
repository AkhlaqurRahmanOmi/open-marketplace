import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SUPER_ADMIN_CREDENTIALS, TEST_USERS } from './config/seeder.config';

const prisma = new PrismaClient();

export async function seedUsers() {
  console.log('👥 Seeding Users...');

  // Hash password helper
  const hashPassword = async (password: string) => {
    return bcrypt.hash(password, 10);
  };

  // ==================== SUPER ADMIN ====================
  console.log('  Creating Super Admin...');
  const superAdminPassword = await hashPassword(SUPER_ADMIN_CREDENTIALS.password);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_CREDENTIALS.email },
    update: {},
    create: {
      email: SUPER_ADMIN_CREDENTIALS.email,
      password: superAdminPassword,
      firstName: SUPER_ADMIN_CREDENTIALS.firstName,
      lastName: SUPER_ADMIN_CREDENTIALS.lastName,
      userType: 'admin',
      isVerified: true,
      verifiedAt: new Date(),
      isActive: true,
    },
  });

  // Assign super_admin role
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super_admin' },
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: superAdmin.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    });
  }

  console.log(`  ✓ Created Super Admin: ${SUPER_ADMIN_CREDENTIALS.email}`);

  // ==================== TEST USERS ====================
  console.log(`  Creating ${TEST_USERS.length} test users...`);

  const createdUsers: any[] = [];
  for (const userData of TEST_USERS) {
    const hashedPassword = await hashPassword(userData.password);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: userData.userType,
        isVerified: true,
        verifiedAt: new Date(),
        isActive: true,
      },
    });

    // Assign customer role to all test users (will get org roles later)
    const customerRole = await prisma.role.findUnique({
      where: { name: 'customer' },
    });

    if (customerRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: customerRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: customerRole.id,
        },
      });
    }

    createdUsers.push(user);
    console.log(`  ✓ Created user: ${userData.email}`);
  }

  console.log('✅ Users seeding completed!\n');

  return { superAdmin, testUsers: createdUsers };
}
