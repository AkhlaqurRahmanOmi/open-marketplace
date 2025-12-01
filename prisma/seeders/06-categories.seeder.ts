import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCategories() {
  console.log('📂 Seeding Categories...');

  // Parent categories
  const parentCategories = [
    { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and accessories' },
    { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories' },
    { name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement and garden supplies' },
    { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment and outdoor gear' },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Beauty products and personal care items' },
  ];

  console.log('  Creating parent categories...');
  const createdParents: Record<string, any> = {};

  for (const category of parentCategories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    createdParents[category.slug] = created;
    console.log(`  ✓ Created: ${category.name}`);
  }

  // Subcategories
  const subcategories = [
    // Electronics subcategories
    { name: 'Smartphones', slug: 'smartphones', description: 'Mobile phones and accessories', parentSlug: 'electronics' },
    { name: 'Laptops & Computers', slug: 'laptops-computers', description: 'Computers and computer accessories', parentSlug: 'electronics' },
    { name: 'Headphones', slug: 'headphones', description: 'Headphones and earbuds', parentSlug: 'electronics' },
    { name: 'Smart Home', slug: 'smart-home', description: 'Smart home devices', parentSlug: 'electronics' },
    { name: 'Cameras', slug: 'cameras', description: 'Digital cameras and photography equipment', parentSlug: 'electronics' },

    // Fashion subcategories
    { name: "Men's Clothing", slug: 'mens-clothing', description: 'Clothing for men', parentSlug: 'fashion' },
    { name: "Women's Clothing", slug: 'womens-clothing', description: 'Clothing for women', parentSlug: 'fashion' },
    { name: 'Shoes', slug: 'shoes', description: 'Footwear for all', parentSlug: 'fashion' },
    { name: 'Accessories', slug: 'fashion-accessories', description: 'Fashion accessories', parentSlug: 'fashion' },
    { name: 'Watches', slug: 'watches', description: 'Wristwatches and smartwatches', parentSlug: 'fashion' },

    // Home & Garden subcategories
    { name: 'Furniture', slug: 'furniture', description: 'Home and office furniture', parentSlug: 'home-garden' },
    { name: 'Kitchen & Dining', slug: 'kitchen-dining', description: 'Kitchen appliances and dining items', parentSlug: 'home-garden' },
    { name: 'Bedding', slug: 'bedding', description: 'Bedding and linens', parentSlug: 'home-garden' },
    { name: 'Garden Tools', slug: 'garden-tools', description: 'Gardening tools and equipment', parentSlug: 'home-garden' },
    { name: 'Home Decor', slug: 'home-decor', description: 'Decorative items for home', parentSlug: 'home-garden' },

    // Sports & Outdoors subcategories
    { name: 'Fitness Equipment', slug: 'fitness-equipment', description: 'Exercise and fitness gear', parentSlug: 'sports-outdoors' },
    { name: 'Camping & Hiking', slug: 'camping-hiking', description: 'Camping and hiking gear', parentSlug: 'sports-outdoors' },
    { name: 'Cycling', slug: 'cycling', description: 'Bicycles and cycling accessories', parentSlug: 'sports-outdoors' },
    { name: 'Team Sports', slug: 'team-sports', description: 'Equipment for team sports', parentSlug: 'sports-outdoors' },

    // Beauty & Personal Care subcategories
    { name: 'Skincare', slug: 'skincare', description: 'Skincare products', parentSlug: 'beauty-personal-care' },
    { name: 'Makeup', slug: 'makeup', description: 'Makeup and cosmetics', parentSlug: 'beauty-personal-care' },
    { name: 'Haircare', slug: 'haircare', description: 'Hair care products', parentSlug: 'beauty-personal-care' },
    { name: 'Fragrances', slug: 'fragrances', description: 'Perfumes and colognes', parentSlug: 'beauty-personal-care' },
  ];

  console.log('  Creating subcategories...');

  for (const subcategory of subcategories) {
    const { parentSlug, ...categoryData } = subcategory;
    const parent = createdParents[parentSlug];

    if (parent) {
      await prisma.category.upsert({
        where: { slug: categoryData.slug },
        update: {},
        create: {
          ...categoryData,
          parentId: parent.id,
        },
      });
      console.log(`  ✓ Created: ${categoryData.name} (under ${parent.name})`);
    }
  }

  console.log('✅ Categories seeding completed!\n');
}
