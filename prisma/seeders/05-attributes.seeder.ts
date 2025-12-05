import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedAttributes() {
  console.log('🏷️  Seeding Attribute Definitions...');

  const attributes = [
    // Common attributes for all organizations
    {
      key: 'website_url',
      label: 'Website URL',
      description: 'Official website of the organization',
      dataType: 'string',
      isRequired: false,
      minLength: 5,
      maxLength: 255,
      pattern: '^https?://.+',
      group: 'general',
      displayOrder: 1,
      placeholder: 'https://example.com',
      helpText: 'Enter your organization website URL',
      isActive: true,
      organizationTypes: ['vendor', 'delivery_partner', 'financial_service', 'warehouse', 'marketing_agency'],
    },
    {
      key: 'business_hours',
      label: 'Business Hours',
      description: 'Operating hours of the business',
      dataType: 'string',
      isRequired: false,
      group: 'general',
      displayOrder: 2,
      placeholder: 'Mon-Fri: 9AM-6PM',
      helpText: 'Enter your business operating hours',
      isActive: true,
      organizationTypes: ['vendor', 'delivery_partner', 'warehouse'],
    },
    {
      key: 'support_email',
      label: 'Support Email',
      description: 'Customer support email address',
      dataType: 'string',
      isRequired: true,
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
      group: 'general',
      displayOrder: 3,
      placeholder: 'support@example.com',
      helpText: 'Enter customer support email',
      isActive: true,
      organizationTypes: ['vendor', 'delivery_partner'],
    },

    // Vendor-specific attributes
    {
      key: 'product_categories',
      label: 'Product Categories',
      description: 'Main product categories offered',
      dataType: 'multiselect',
      isRequired: true,
      group: 'vendor',
      displayOrder: 10,
      helpText: 'Select the main product categories you sell',
      isActive: true,
      organizationTypes: ['vendor'],
      options: [
        { value: 'electronics', label: 'Electronics', position: 1 },
        { value: 'fashion', label: 'Fashion & Apparel', position: 2 },
        { value: 'home_garden', label: 'Home & Garden', position: 3 },
        { value: 'sports', label: 'Sports & Outdoors', position: 4 },
        { value: 'beauty', label: 'Beauty & Personal Care', position: 5 },
        { value: 'books', label: 'Books & Media', position: 6 },
        { value: 'toys', label: 'Toys & Games', position: 7 },
        { value: 'automotive', label: 'Automotive', position: 8 },
      ],
    },
    {
      key: 'avg_shipping_days',
      label: 'Average Shipping Days',
      description: 'Average number of days for shipping',
      dataType: 'number',
      isRequired: true,
      minValue: 1,
      maxValue: 30,
      group: 'vendor',
      displayOrder: 11,
      placeholder: '3',
      helpText: 'Enter average shipping days',
      isActive: true,
      organizationTypes: ['vendor'],
    },
    {
      key: 'accepts_returns',
      label: 'Accepts Returns',
      description: 'Whether the vendor accepts product returns',
      dataType: 'boolean',
      isRequired: true,
      group: 'vendor',
      displayOrder: 12,
      helpText: 'Do you accept product returns?',
      isActive: true,
      organizationTypes: ['vendor'],
    },

    // Delivery partner-specific attributes
    {
      key: 'delivery_types',
      label: 'Delivery Types',
      description: 'Types of delivery services offered',
      dataType: 'multiselect',
      isRequired: true,
      group: 'delivery',
      displayOrder: 20,
      helpText: 'Select delivery types you offer',
      isActive: true,
      organizationTypes: ['delivery_partner'],
      options: [
        { value: 'standard', label: 'Standard Delivery', position: 1 },
        { value: 'express', label: 'Express Delivery', position: 2 },
        { value: 'same_day', label: 'Same Day Delivery', position: 3 },
        { value: 'overnight', label: 'Overnight Delivery', position: 4 },
        { value: 'international', label: 'International Shipping', position: 5 },
      ],
    },
    {
      key: 'coverage_area',
      label: 'Coverage Area',
      description: 'Geographic coverage area',
      dataType: 'select',
      isRequired: true,
      group: 'delivery',
      displayOrder: 21,
      helpText: 'Select your coverage area',
      isActive: true,
      organizationTypes: ['delivery_partner'],
      options: [
        { value: 'local', label: 'Local (City)', position: 1 },
        { value: 'regional', label: 'Regional (State)', position: 2 },
        { value: 'national', label: 'National', position: 3 },
        { value: 'international', label: 'International', position: 4 },
      ],
    },
    {
      key: 'fleet_size',
      label: 'Fleet Size',
      description: 'Number of delivery vehicles',
      dataType: 'number',
      isRequired: false,
      minValue: 1,
      maxValue: 10000,
      group: 'delivery',
      displayOrder: 22,
      placeholder: '50',
      helpText: 'Enter the number of delivery vehicles',
      isActive: true,
      organizationTypes: ['delivery_partner'],
    },
  ];

  console.log(`  Creating ${attributes.length} attribute definitions...`);

  for (const attrData of attributes) {
    const { organizationTypes, options, ...attributeInfo } = attrData;

    const attribute = await prisma.attributeDefinition.upsert({
      where: { key: attributeInfo.key },
      update: {},
      create: attributeInfo,
    });

    // Create options if dataType is select or multiselect
    if (options && options.length > 0) {
      // Check if options already exist
      const existingOptions = await prisma.attributeOption.findMany({
        where: { attributeDefinitionId: attribute.id },
      });

      if (existingOptions.length === 0) {
        await prisma.attributeOption.createMany({
          data: options.map((option) => ({
            attributeDefinitionId: attribute.id,
            ...option,
          })),
        });
      }
    }

    // Link attribute to organization types
    for (const orgType of organizationTypes) {
      await prisma.attributeApplicableType.upsert({
        where: {
          attributeDefinitionId_organizationType: {
            attributeDefinitionId: attribute.id,
            organizationType: orgType,
          },
        },
        update: {},
        create: {
          attributeDefinitionId: attribute.id,
          organizationType: orgType,
        },
      });
    }

    console.log(`  ✓ Created: ${attributeInfo.label}`);
  }

  console.log('✅ Attribute Definitions seeding completed!\n');
}
