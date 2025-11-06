import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ArrowRight } from 'lucide-react';

export async function CategoryShowcase() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null, // Only top-level categories
    },
    orderBy: {
      displayOrder: 'asc',
    },
    take: 3,
  });

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Shop by Category
          </h2>
          <p className="mt-2 text-muted-foreground">
            Explore our wide range of product categories
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="group relative overflow-hidden rounded-lg aspect-[4/3] bg-muted transition-transform hover:scale-105"
            >
              {category.image && (
                <img
                  src={category.image}
                  alt={category.name}
                  className="object-cover w-full h-full transition-transform group-hover:scale-110"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white w-full">
                  <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-white/80 mb-4">
                      {category.description}
                    </p>
                  )}
                  <span className="inline-flex items-center text-sm font-medium">
                    Shop Now
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/categories" className="btn-outline">
            View All Categories
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
