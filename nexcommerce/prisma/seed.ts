import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexcommerce.com' },
    update: {},
    create: {
      email: 'admin@nexcommerce.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create Customer User
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: 'John Doe',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Create Categories
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Latest electronic gadgets and devices',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
      metaTitle: 'Electronics - Shop Latest Gadgets',
      metaDescription: 'Browse our collection of cutting-edge electronics',
      displayOrder: 1,
    },
  });

  const clothing = await prisma.category.create({
    data: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel for everyone',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
      metaTitle: 'Clothing - Fashion Apparel',
      metaDescription: 'Discover trendy clothing for all occasions',
      displayOrder: 2,
    },
  });

  const home = await prisma.category.create({
    data: {
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Everything for your home',
      image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800',
      metaTitle: 'Home & Living - Decor and Essentials',
      metaDescription: 'Shop home decor, furniture, and living essentials',
      displayOrder: 3,
    },
  });

  console.log('✅ Categories created');

  // Create Products
  const products = [
    // Electronics
    {
      name: 'Wireless Headphones Pro',
      slug: 'wireless-headphones-pro',
      description:
        'Premium wireless headphones with active noise cancellation, 30-hour battery life, and studio-quality sound. Perfect for music lovers and professionals.',
      price: 299.99,
      compareAtPrice: 399.99,
      sku: 'WHP-001',
      stock: 50,
      categoryId: electronics.id,
      isFeatured: true,
      thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      metaTitle: 'Wireless Headphones Pro - Premium Audio',
      metaDescription: 'Experience superior sound quality with our wireless headphones',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
            alt: 'Wireless Headphones Pro',
            position: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
            alt: 'Headphones Detail View',
            position: 2,
          },
        ],
      },
    },
    {
      name: 'Smart Watch Series X',
      slug: 'smart-watch-series-x',
      description:
        'Advanced smartwatch with health monitoring, GPS, water resistance, and seamless smartphone integration. Track your fitness and stay connected.',
      price: 449.99,
      compareAtPrice: 549.99,
      sku: 'SWT-002',
      stock: 35,
      categoryId: electronics.id,
      isFeatured: true,
      thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      metaTitle: 'Smart Watch Series X - Advanced Fitness Tracker',
      metaDescription: 'Stay fit and connected with our latest smartwatch',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
            alt: 'Smart Watch Series X',
            position: 1,
          },
        ],
      },
    },
    {
      name: 'Portable Bluetooth Speaker',
      slug: 'portable-bluetooth-speaker',
      description:
        'Compact and powerful Bluetooth speaker with 360-degree sound, waterproof design, and 20-hour battery life. Perfect for outdoor adventures.',
      price: 79.99,
      sku: 'PBS-003',
      stock: 100,
      categoryId: electronics.id,
      thumbnail: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
            alt: 'Portable Bluetooth Speaker',
            position: 1,
          },
        ],
      },
    },
    // Clothing
    {
      name: 'Premium Cotton T-Shirt',
      slug: 'premium-cotton-tshirt',
      description:
        'Ultra-soft premium cotton t-shirt with a modern fit. Available in multiple colors and sizes. Perfect for everyday wear.',
      price: 29.99,
      sku: 'TSH-001',
      stock: 200,
      categoryId: clothing.id,
      hasVariants: true,
      thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
            alt: 'Premium Cotton T-Shirt',
            position: 1,
          },
        ],
      },
      variants: {
        create: [
          {
            name: 'Black - Small',
            sku: 'TSH-001-BLK-S',
            price: 29.99,
            stock: 50,
            attributes: { color: 'Black', size: 'S' },
          },
          {
            name: 'Black - Medium',
            sku: 'TSH-001-BLK-M',
            price: 29.99,
            stock: 50,
            attributes: { color: 'Black', size: 'M' },
          },
          {
            name: 'White - Medium',
            sku: 'TSH-001-WHT-M',
            price: 29.99,
            stock: 50,
            attributes: { color: 'White', size: 'M' },
          },
          {
            name: 'White - Large',
            sku: 'TSH-001-WHT-L',
            price: 29.99,
            stock: 50,
            attributes: { color: 'White', size: 'L' },
          },
        ],
      },
    },
    {
      name: 'Classic Denim Jeans',
      slug: 'classic-denim-jeans',
      description:
        'Timeless denim jeans with a comfortable fit and durable construction. A wardrobe essential for any style.',
      price: 89.99,
      sku: 'JNS-002',
      stock: 75,
      categoryId: clothing.id,
      thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
            alt: 'Classic Denim Jeans',
            position: 1,
          },
        ],
      },
    },
    {
      name: 'Cozy Wool Sweater',
      slug: 'cozy-wool-sweater',
      description:
        'Warm and stylish wool sweater perfect for cold weather. Made from high-quality merino wool with a comfortable fit.',
      price: 129.99,
      compareAtPrice: 179.99,
      sku: 'SWT-003',
      stock: 40,
      categoryId: clothing.id,
      isFeatured: true,
      thumbnail: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
            alt: 'Cozy Wool Sweater',
            position: 1,
          },
        ],
      },
    },
    // Home & Living
    {
      name: 'Minimalist Table Lamp',
      slug: 'minimalist-table-lamp',
      description:
        'Modern minimalist table lamp with adjustable brightness and elegant design. Perfect for any room in your home.',
      price: 59.99,
      sku: 'LMP-001',
      stock: 60,
      categoryId: home.id,
      thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
            alt: 'Minimalist Table Lamp',
            position: 1,
          },
        ],
      },
    },
    {
      name: 'Ceramic Plant Pot Set',
      slug: 'ceramic-plant-pot-set',
      description:
        'Set of 3 handcrafted ceramic plant pots with drainage holes. Beautiful addition to any indoor space.',
      price: 39.99,
      sku: 'POT-002',
      stock: 85,
      categoryId: home.id,
      thumbnail: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800',
            alt: 'Ceramic Plant Pot Set',
            position: 1,
          },
        ],
      },
    },
    {
      name: 'Luxury Throw Blanket',
      slug: 'luxury-throw-blanket',
      description:
        'Ultra-soft luxury throw blanket made from premium materials. Perfect for cozy evenings on the couch.',
      price: 79.99,
      sku: 'BLK-003',
      stock: 45,
      categoryId: home.id,
      isFeatured: true,
      thumbnail: 'https://images.unsplash.com/photo-1616627422135-2ee76e8c122a?w=800',
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1616627422135-2ee76e8c122a?w=800',
            alt: 'Luxury Throw Blanket',
            position: 1,
          },
        ],
      },
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log(`✅ ${products.length} products created`);

  // Create Site Settings
  await prisma.siteSettings.create({
    data: {
      siteName: 'NexCommerce',
      siteDescription: 'Your modern e-commerce destination for quality products',
      email: 'support@nexcommerce.com',
      phone: '+1 (555) 123-4567',
      metaTitle: 'NexCommerce - Modern E-commerce Platform',
      metaDescription:
        'Shop the latest products in electronics, clothing, and home essentials',
      freeShippingThreshold: 100.0,
      flatShippingRate: 9.99,
      taxRate: 8.5,
      taxEnabled: true,
    },
  });

  console.log('✅ Site settings created');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
