import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOrganizationTypes() {
  console.log('🏢 Seeding Organization Types...');

  const organizationTypes = [
    {
      code: 'vendor',
      displayName: 'Product Vendor',
      description: 'Vendors who sell products on the platform',
      icon: '🏪',
      category: 'commerce',
      defaultFeeType: 'percentage',
      defaultFeeAmount: 15.0,
      isActive: true,
      requiresApproval: true,
    },
    {
      code: 'delivery_partner',
      displayName: 'Delivery Partner',
      description: 'Delivery and logistics partners',
      icon: '🚚',
      category: 'logistics',
      defaultFeeType: 'percentage',
      defaultFeeAmount: 10.0,
      isActive: true,
      requiresApproval: true,
    },
    {
      code: 'financial_service',
      displayName: 'Financial Service Provider',
      description: 'Banks, payment gateways, and financial institutions',
      icon: '🏦',
      category: 'finance',
      defaultFeeType: 'fixed',
      defaultFeeAmount: 50.0,
      isActive: true,
      requiresApproval: true,
    },
    {
      code: 'warehouse',
      displayName: 'Warehouse / Fulfillment Center',
      description: 'Warehouses and fulfillment centers',
      icon: '🏭',
      category: 'logistics',
      defaultFeeType: 'fixed',
      defaultFeeAmount: 100.0,
      isActive: true,
      requiresApproval: true,
    },
    {
      code: 'marketing_agency',
      displayName: 'Marketing Agency',
      description: 'Marketing and advertising agencies',
      icon: '📢',
      category: 'marketing',
      defaultFeeType: 'percentage',
      defaultFeeAmount: 20.0,
      isActive: true,
      requiresApproval: false,
    },
  ];

  console.log(`  Creating ${organizationTypes.length} organization types...`);

  for (const orgType of organizationTypes) {
    await prisma.organizationType.upsert({
      where: { code: orgType.code },
      update: {},
      create: orgType,
    });
    console.log(`  ✓ Created: ${orgType.displayName}`);
  }

  console.log('✅ Organization Types seeding completed!\n');
}
