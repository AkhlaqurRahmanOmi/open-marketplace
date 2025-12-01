import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOrganizations() {
  console.log('🏪 Seeding Organizations...');

  // Get test users
  const vendor1User = await prisma.user.findUnique({ where: { email: 'vendor1@waywise.com' } });
  const vendor2User = await prisma.user.findUnique({ where: { email: 'vendor2@waywise.com' } });
  const deliveryUser = await prisma.user.findUnique({ where: { email: 'delivery@waywise.com' } });

  // Get org_owner role
  const ownerRole = await prisma.role.findUnique({ where: { name: 'org_owner' } });

  if (!vendor1User || !vendor2User || !deliveryUser || !ownerRole) {
    throw new Error('Required users or roles not found');
  }

  const organizations = [
    {
      type: 'vendor',
      status: 'active' as const,
      name: 'TechGear Pro',
      slug: 'techgear-pro',
      email: 'contact@techgearpro.com',
      phone: '+1-555-0101',
      logo: 'https://via.placeholder.com/200x200?text=TechGear+Pro',
      banner: 'https://via.placeholder.com/1200x300?text=TechGear+Pro+Banner',
      description: 'Your one-stop shop for the latest tech gadgets and accessories. We offer premium electronics at competitive prices.',
      registrationNumber: 'TG-2024-001',
      taxId: 'TAX-TG-001',
      addressLine1: '123 Tech Street',
      addressLine2: 'Suite 100',
      city: 'San Francisco',
      state: 'California',
      postalCode: '94102',
      country: 'US',
      feeType: 'percentage',
      feeAmount: 15.0,
      currency: 'USD',
      seoTitle: 'TechGear Pro - Premium Electronics Store',
      seoDescription: 'Shop the latest tech gadgets, smartphones, laptops, and accessories at TechGear Pro.',
      isActive: true,
      approvedAt: new Date(),
      ownerId: vendor1User.id,
    },
    {
      type: 'vendor',
      status: 'active' as const,
      name: 'Fashion Hub',
      slug: 'fashion-hub',
      email: 'hello@fashionhub.com',
      phone: '+1-555-0202',
      logo: 'https://via.placeholder.com/200x200?text=Fashion+Hub',
      banner: 'https://via.placeholder.com/1200x300?text=Fashion+Hub+Banner',
      description: 'Trendy fashion for everyone. Discover the latest styles in clothing, shoes, and accessories.',
      registrationNumber: 'FH-2024-002',
      taxId: 'TAX-FH-002',
      addressLine1: '456 Fashion Ave',
      city: 'New York',
      state: 'New York',
      postalCode: '10001',
      country: 'US',
      feeType: 'percentage',
      feeAmount: 12.0,
      currency: 'USD',
      seoTitle: 'Fashion Hub - Trendy Clothing & Accessories',
      seoDescription: 'Find the latest fashion trends at Fashion Hub. Shop clothing, shoes, and accessories.',
      isActive: true,
      approvedAt: new Date(),
      ownerId: vendor2User.id,
    },
    {
      type: 'delivery_partner',
      status: 'active' as const,
      name: 'QuickShip Logistics',
      slug: 'quickship-logistics',
      email: 'info@quickship.com',
      phone: '+1-555-0303',
      logo: 'https://via.placeholder.com/200x200?text=QuickShip',
      description: 'Fast and reliable delivery services. We deliver your packages on time, every time.',
      registrationNumber: 'QS-2024-003',
      taxId: 'TAX-QS-003',
      addressLine1: '789 Logistics Blvd',
      city: 'Chicago',
      state: 'Illinois',
      postalCode: '60601',
      country: 'US',
      feeType: 'percentage',
      feeAmount: 10.0,
      currency: 'USD',
      isActive: true,
      approvedAt: new Date(),
      ownerId: deliveryUser.id,
    },
  ];

  console.log(`  Creating ${organizations.length} organizations...`);

  for (const orgData of organizations) {
    const { ownerId, ...organizationInfo } = orgData;

    const organization = await prisma.organization.upsert({
      where: { slug: organizationInfo.slug },
      update: {},
      create: organizationInfo,
    });

    // Create OrganizationUser (link user to organization with role)
    await prisma.organizationUser.upsert({
      where: {
        userId_organizationId: {
          userId: ownerId,
          organizationId: organization.id,
        },
      },
      update: {},
      create: {
        userId: ownerId,
        organizationId: organization.id,
        roleId: ownerRole.id,
        isActive: true,
        joinedAt: new Date(),
      },
    });

    // Create organization settings
    await prisma.organizationSettings.upsert({
      where: { organizationId: organization.id },
      update: {},
      create: {
        organizationId: organization.id,
        timezone: 'America/New_York',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        returnPolicy: 'We accept returns within 30 days of purchase.',
        privacyPolicy: 'We protect your personal information.',
        termsConditions: 'By using our services, you agree to our terms.',
        shippingPolicy: 'We ship within 1-3 business days.',
      },
    });

    // Create a location for inventory
    await prisma.location.create({
      data: {
        organizationId: organization.id,
        name: `${organization.name} - Main Warehouse`,
        addressLine1: organization.addressLine1,
        addressLine2: organization.addressLine2,
        city: organization.city,
        state: organization.state,
        postalCode: organization.postalCode,
        country: organization.country,
      },
    });

    console.log(`  ✓ Created: ${organization.name}`);
  }

  console.log('✅ Organizations seeding completed!\n');
}
