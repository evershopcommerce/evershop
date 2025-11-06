import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import { Loader2 } from 'lucide-react';

interface SearchParams {
  category?: string;
  search?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
}

export const metadata = {
  title: 'All Products',
  description: 'Browse our complete collection of products',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page) || 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    isActive: true,
  };

  if (searchParams.category) {
    const category = await prisma.category.findFirst({
      where: { slug: searchParams.category },
    });
    if (category) {
      where.categoryId = category.id;
    }
  }

  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  if (searchParams.minPrice) {
    where.price = { ...where.price, gte: Number(searchParams.minPrice) };
  }

  if (searchParams.maxPrice) {
    where.price = { ...where.price, lte: Number(searchParams.maxPrice) };
  }

  // Build orderBy
  let orderBy: any = { createdAt: 'desc' };

  if (searchParams.sort) {
    switch (searchParams.sort) {
      case 'price-asc':
        orderBy = { price: 'asc' };
        break;
      case 'price-desc':
        orderBy = { price: 'desc' };
        break;
      case 'name-asc':
        orderBy = { name: 'asc' };
        break;
      case 'name-desc':
        orderBy = { name: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
    }
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: true,
        category: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-custom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
              All Products
            </h1>
            <p className="text-muted-foreground">
              Showing {skip + 1} - {Math.min(skip + limit, total)} of {total} products
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <ProductFilters categories={categories} />
            </aside>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              <Suspense
                fallback={
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
              >
                {products.length > 0 ? (
                  <>
                    <div className="product-grid">
                      {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-12 flex justify-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (pageNum) => {
                            const params = new URLSearchParams(searchParams as any);
                            params.set('page', pageNum.toString());
                            return (
                              <a
                                key={pageNum}
                                href={`/products?${params.toString()}`}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                  pageNum === page
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                              >
                                {pageNum}
                              </a>
                            );
                          }
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">
                      No products found matching your criteria.
                    </p>
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
