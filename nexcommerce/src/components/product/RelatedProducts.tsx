import { prisma } from '@/lib/prisma';
import { ProductCard } from './ProductCard';

interface RelatedProductsProps {
  categoryId: string;
  currentProductId: string;
}

export async function RelatedProducts({
  categoryId,
  currentProductId,
}: RelatedProductsProps) {
  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId,
      isActive: true,
      id: {
        not: currentProductId,
      },
    },
    include: {
      images: true,
      category: true,
    },
    take: 4,
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="border-t py-16">
      <div className="container-custom">
        <h2 className="text-2xl font-bold tracking-tight mb-8">Related Products</h2>
        <div className="product-grid">
          {relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
