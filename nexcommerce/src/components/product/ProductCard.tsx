'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart } from 'lucide-react';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import type { ProductWithImages } from '@/types';

interface ProductCardProps {
  product: ProductWithImages;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.thumbnail || product.images[0]?.url || '',
      slug: product.slug,
      stock: product.stock,
    });
  };

  const discount = product.compareAtPrice
    ? calculateDiscount(Number(product.price), Number(product.compareAtPrice))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group"
    >
      <Link href={`/products/${product.slug}`}>
        <div className="card overflow-hidden transition-shadow hover:shadow-lg">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.thumbnail || product.images[0]?.url ? (
              <img
                src={product.thumbnail || product.images[0]?.url}
                alt={product.name}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                No image
              </div>
            )}

            {/* Badges */}
            {discount > 0 && (
              <div className="absolute top-2 left-2 badge badge-default">
                -{discount}%
              </div>
            )}
            {product.stock < product.lowStockThreshold && product.stock > 0 && (
              <div className="absolute top-2 right-2 badge bg-yellow-500 text-white">
                Low Stock
              </div>
            )}
            {product.stock === 0 && (
              <div className="absolute top-2 right-2 badge bg-red-500 text-white">
                Sold Out
              </div>
            )}

            {/* Quick Actions */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="btn-primary p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add to cart"
              >
                <ShoppingCart className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              {product.category.name}
            </p>
            <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {formatPrice(Number(product.price))}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(Number(product.compareAtPrice))}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
