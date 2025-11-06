import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductDetails } from '@/components/product/ProductDetails';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import type { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
    },
  });

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: {
        orderBy: {
          position: 'asc',
        },
      },
      category: true,
      variants: {
        where: {
          isActive: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ProductDetails product={product} />
        <RelatedProducts categoryId={product.categoryId} currentProductId={product.id} />
      </main>
      <Footer />
    </div>
  );
}
