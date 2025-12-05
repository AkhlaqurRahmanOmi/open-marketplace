import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProducts() {
  console.log('📦 Seeding Products...');

  // Get organizations
  const techGear = await prisma.organization.findUnique({ where: { slug: 'techgear-pro' } });
  const fashionHub = await prisma.organization.findUnique({ where: { slug: 'fashion-hub' } });

  if (!techGear || !fashionHub) {
    throw new Error('Organizations not found');
  }

  // Get categories
  const smartphones = await prisma.category.findUnique({ where: { slug: 'smartphones' } });
  const laptops = await prisma.category.findUnique({ where: { slug: 'laptops-computers' } });
  const headphones = await prisma.category.findUnique({ where: { slug: 'headphones' } });
  const mensClothing = await prisma.category.findUnique({ where: { slug: 'mens-clothing' } });
  const womensClothing = await prisma.category.findUnique({ where: { slug: 'womens-clothing' } });
  const shoes = await prisma.category.findUnique({ where: { slug: 'shoes' } });

  // Get location for inventory
  const techGearLocation = await prisma.location.findFirst({ where: { organizationId: techGear.id } });
  const fashionHubLocation = await prisma.location.findFirst({ where: { organizationId: fashionHub.id } });

  // ==================== TECHGEAR PRO PRODUCTS ====================
  console.log(`  Creating products for ${techGear.name}...`);

  // Product 1: iPhone 15 Pro
  const iphone = await prisma.product.create({
    data: {
      organizationId: techGear.id,
      name: 'iPhone 15 Pro',
      description: 'The most powerful iPhone ever with titanium design, A17 Pro chip, and advanced camera system.',
      seoTitle: 'iPhone 15 Pro - Buy Now at TechGear Pro',
      seoDescription: 'Get the new iPhone 15 Pro with titanium design and pro camera system',
      seoSlug: 'iphone-15-pro',
      isActive: true,
    },
  });

  await prisma.productImage.createMany({
    data: [
      { productId: iphone.id, imageUrl: 'https://via.placeholder.com/600x600?text=iPhone+15+Pro', altText: 'iPhone 15 Pro', position: 1, isMain: true },
      { productId: iphone.id, imageUrl: 'https://via.placeholder.com/600x600?text=iPhone+15+Pro+Back', altText: 'iPhone 15 Pro Back', position: 2, isMain: false },
    ],
  });

  await prisma.productCategory.create({ data: { productId: iphone.id, categoryId: smartphones!.id } });

  const iphoneVariants = await Promise.all([
    prisma.variant.create({
      data: {
        productId: iphone.id,
        sku: 'IPHONE-15-PRO-128-BLK',
        price: 999.99,
        compareAtPrice: 1099.99,
        currency: 'USD',
        isActive: true,
      },
    }),
    prisma.variant.create({
      data: {
        productId: iphone.id,
        sku: 'IPHONE-15-PRO-256-BLK',
        price: 1099.99,
        compareAtPrice: 1199.99,
        currency: 'USD',
        isActive: true,
      },
    }),
  ]);

  // Create inventory for variants
  for (const variant of iphoneVariants) {
    await prisma.variantInventory.create({
      data: {
        variantId: variant.id,
        locationId: techGearLocation!.id,
        quantity: 50,
        reserved: 0,
      },
    });
  }

  console.log(`  ✓ Created: ${iphone.name} (${iphoneVariants.length} variants)`);

  // Product 2: MacBook Pro 14"
  const macbook = await prisma.product.create({
    data: {
      organizationId: techGear.id,
      name: 'MacBook Pro 14"',
      description: 'Supercharged by M3 Pro chip. Stunning Liquid Retina XDR display. Up to 18 hours of battery life.',
      seoTitle: 'MacBook Pro 14" - Powerful Laptop for Professionals',
      seoDescription: 'Buy the MacBook Pro 14" with M3 Pro chip for ultimate performance',
      seoSlug: 'macbook-pro-14',
      isActive: true,
    },
  });

  await prisma.productImage.createMany({
    data: [
      { productId: macbook.id, imageUrl: 'https://via.placeholder.com/600x600?text=MacBook+Pro', altText: 'MacBook Pro', position: 1, isMain: true },
    ],
  });

  await prisma.productCategory.create({ data: { productId: macbook.id, categoryId: laptops!.id } });

  const macbookVariant = await prisma.variant.create({
    data: {
      productId: macbook.id,
      sku: 'MACBOOK-PRO-14-M3',
      price: 1999.99,
      currency: 'USD',
      isActive: true,
    },
  });

  await prisma.variantInventory.create({
    data: {
      variantId: macbookVariant.id,
      locationId: techGearLocation!.id,
      quantity: 25,
      reserved: 0,
    },
  });

  console.log(`  ✓ Created: ${macbook.name}`);

  // Product 3: AirPods Pro
  const airpods = await prisma.product.create({
    data: {
      organizationId: techGear.id,
      name: 'AirPods Pro (2nd Generation)',
      description: 'Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio with dynamic head tracking.',
      seoTitle: 'AirPods Pro - Premium Wireless Earbuds',
      seoDescription: 'Experience premium sound with AirPods Pro 2nd generation',
      seoSlug: 'airpods-pro-2',
      isActive: true,
    },
  });

  await prisma.productImage.createMany({
    data: [
      { productId: airpods.id, imageUrl: 'https://via.placeholder.com/600x600?text=AirPods+Pro', altText: 'AirPods Pro', position: 1, isMain: true },
    ],
  });

  await prisma.productCategory.create({ data: { productId: airpods.id, categoryId: headphones!.id } });

  const airpodsVariant = await prisma.variant.create({
    data: {
      productId: airpods.id,
      sku: 'AIRPODS-PRO-2',
      price: 249.99,
      currency: 'USD',
      isActive: true,
    },
  });

  await prisma.variantInventory.create({
    data: {
      variantId: airpodsVariant.id,
      locationId: techGearLocation!.id,
      quantity: 100,
      reserved: 0,
    },
  });

  console.log(`  ✓ Created: ${airpods.name}`);

  // ==================== FASHION HUB PRODUCTS ====================
  console.log(`  Creating products for ${fashionHub.name}...`);

  // Product 4: Classic Denim Jacket
  const denimJacket = await prisma.product.create({
    data: {
      organizationId: fashionHub.id,
      name: 'Classic Denim Jacket',
      description: 'Timeless denim jacket with a modern fit. Perfect for any casual occasion.',
      seoTitle: 'Classic Denim Jacket - Trendy Fashion',
      seoDescription: 'Shop our classic denim jacket in multiple sizes',
      seoSlug: 'classic-denim-jacket',
      isActive: true,
    },
  });

  await prisma.productImage.createMany({
    data: [
      { productId: denimJacket.id, imageUrl: 'https://via.placeholder.com/600x600?text=Denim+Jacket', altText: 'Denim Jacket', position: 1, isMain: true },
    ],
  });

  await prisma.productCategory.create({ data: { productId: denimJacket.id, categoryId: mensClothing!.id } });

  const denimVariants = await Promise.all([
    prisma.variant.create({ data: { productId: denimJacket.id, sku: 'DENIM-JKT-M', price: 79.99, currency: 'USD', isActive: true } }),
    prisma.variant.create({ data: { productId: denimJacket.id, sku: 'DENIM-JKT-L', price: 79.99, currency: 'USD', isActive: true } }),
    prisma.variant.create({ data: { productId: denimJacket.id, sku: 'DENIM-JKT-XL', price: 79.99, currency: 'USD', isActive: true } }),
  ]);

  for (const variant of denimVariants) {
    await prisma.variantInventory.create({
      data: {
        variantId: variant.id,
        locationId: fashionHubLocation!.id,
        quantity: 30,
        reserved: 0,
      },
    });
  }

  console.log(`  ✓ Created: ${denimJacket.name} (${denimVariants.length} variants)`);

  // Product 5: Summer Floral Dress
  const floralDress = await prisma.product.create({
    data: {
      organizationId: fashionHub.id,
      name: 'Summer Floral Dress',
      description: 'Beautiful floral print dress perfect for summer. Light and comfortable fabric.',
      seoTitle: 'Summer Floral Dress - Womens Fashion',
      seoDescription: 'Shop our beautiful summer floral dress',
      seoSlug: 'summer-floral-dress',
      isActive: true,
    },
  });

  await prisma.productImage.createMany({
    data: [
      { productId: floralDress.id, imageUrl: 'https://via.placeholder.com/600x600?text=Floral+Dress', altText: 'Floral Dress', position: 1, isMain: true },
    ],
  });

  await prisma.productCategory.create({ data: { productId: floralDress.id, categoryId: womensClothing!.id } });

  const dressVariants = await Promise.all([
    prisma.variant.create({ data: { productId: floralDress.id, sku: 'DRESS-FLORAL-S', price: 59.99, currency: 'USD', isActive: true } }),
    prisma.variant.create({ data: { productId: floralDress.id, sku: 'DRESS-FLORAL-M', price: 59.99, currency: 'USD', isActive: true } }),
    prisma.variant.create({ data: { productId: floralDress.id, sku: 'DRESS-FLORAL-L', price: 59.99, currency: 'USD', isActive: true } }),
  ]);

  for (const variant of dressVariants) {
    await prisma.variantInventory.create({
      data: {
        variantId: variant.id,
        locationId: fashionHubLocation!.id,
        quantity: 40,
        reserved: 0,
      },
    });
  }

  console.log(`  ✓ Created: ${floralDress.name} (${dressVariants.length} variants)`);

  // Product 6: Running Sneakers
  const sneakers = await prisma.product.create({
    data: {
      organizationId: fashionHub.id,
      name: 'Performance Running Sneakers',
      description: 'Lightweight running shoes with excellent cushioning and support. Perfect for daily runs.',
      seoTitle: 'Running Sneakers - Athletic Footwear',
      seoDescription: 'High-performance running sneakers for comfort and speed',
      seoSlug: 'performance-running-sneakers',
      isActive: true,
    },
  });

  await prisma.productImage.createMany({
    data: [
      { productId: sneakers.id, imageUrl: 'https://via.placeholder.com/600x600?text=Running+Sneakers', altText: 'Running Sneakers', position: 1, isMain: true },
    ],
  });

  await prisma.productCategory.create({ data: { productId: sneakers.id, categoryId: shoes!.id } });

  const sneakerVariants = await Promise.all([
    prisma.variant.create({ data: { productId: sneakers.id, sku: 'SNEAKERS-RUN-9', price: 89.99, currency: 'USD', isActive: true } }),
    prisma.variant.create({ data: { productId: sneakers.id, sku: 'SNEAKERS-RUN-10', price: 89.99, currency: 'USD', isActive: true } }),
    prisma.variant.create({ data: { productId: sneakers.id, sku: 'SNEAKERS-RUN-11', price: 89.99, currency: 'USD', isActive: true } }),
  ]);

  for (const variant of sneakerVariants) {
    await prisma.variantInventory.create({
      data: {
        variantId: variant.id,
        locationId: fashionHubLocation!.id,
        quantity: 50,
        reserved: 0,
      },
    });
  }

  console.log(`  ✓ Created: ${sneakers.name} (${sneakerVariants.length} variants)`);

  console.log('✅ Products seeding completed!\n');
}
