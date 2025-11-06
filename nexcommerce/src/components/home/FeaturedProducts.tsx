import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '../product/ProductCard';
import { ArrowRight } from 'lucide-react';

export async function FeaturedProducts() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    include: {
      images: true,
      category: true,
    },
    take: 8,
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Featured Products
            </h2>
            <p className="mt-2 text-muted-foreground">
              Handpicked favorites from our collection
            </p>
          </div>
          <Link
            href="/products?featured=true"
            className="btn-ghost hidden md:flex items-center"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 text-center md:hidden">
          <Link href="/products?featured=true" className="btn-outline">
            View All Products
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
