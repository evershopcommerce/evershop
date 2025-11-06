'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Truck, Shield, RotateCcw } from 'lucide-react';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import type { ProductWithVariants } from '@/types';
import toast from 'react-hot-toast';

interface ProductDetailsProps {
  product: ProductWithVariants;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  const images = product.images.length > 0 ? product.images : [
    { id: '1', url: product.thumbnail || '', alt: product.name }
  ];

  const currentVariant = product.variants.find((v) => v.id === selectedVariant);
  const currentPrice = currentVariant ? Number(currentVariant.price) : Number(product.price);
  const currentStock = currentVariant ? currentVariant.stock : product.stock;

  const discount = product.compareAtPrice
    ? calculateDiscount(Number(product.price), Number(product.compareAtPrice))
    : 0;

  const handleAddToCart = () => {
    if (product.hasVariants && !selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    if (quantity > currentStock) {
      toast.error('Not enough stock available');
      return;
    }

    addItem({
      id: selectedVariant || product.id,
      productId: product.id,
      name: currentVariant ? `${product.name} - ${currentVariant.name}` : product.name,
      price: currentPrice,
      image: currentVariant?.image || product.thumbnail || images[0]?.url || '',
      slug: product.slug,
      quantity,
      variantId: selectedVariant || undefined,
      attributes: currentVariant?.attributes,
      stock: currentStock,
    });
  };

  return (
    <div className="container-custom py-12">
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square overflow-hidden rounded-lg bg-muted"
          >
            <img
              src={images[selectedImage]?.url}
              alt={images[selectedImage]?.alt || product.name}
              className="object-cover w-full h-full cursor-zoom-in hover:scale-110 transition-transform duration-300"
            />
          </motion.div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt || product.name}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="text-sm text-muted-foreground">
            <span>{product.category.name}</span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{product.name}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{formatPrice(currentPrice)}</span>
                {product.compareAtPrice && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(Number(product.compareAtPrice))}
                    </span>
                    <span className="badge badge-default">Save {discount}%</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stock Status */}
          <div>
            {currentStock > 0 ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                In stock ({currentStock} available)
              </p>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">Out of stock</p>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{product.description}</p>
          </div>

          {/* Variants */}
          {product.hasVariants && product.variants.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Select Variant</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    disabled={variant.stock === 0}
                    className={`px-4 py-2 rounded-md border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedVariant === variant.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="font-semibold mb-3">Quantity</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="btn-outline px-4 py-2"
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                className="btn-outline px-4 py-2"
                disabled={quantity >= currentStock}
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              disabled={currentStock === 0}
              className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </button>
            <button className="btn-outline p-3" aria-label="Add to wishlist">
              <Heart className="h-5 w-5" />
            </button>
          </div>

          {/* Features */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Free Shipping</p>
                <p className="text-sm text-muted-foreground">On orders over $100</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Easy Returns</p>
                <p className="text-sm text-muted-foreground">30-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Secure Payment</p>
                <p className="text-sm text-muted-foreground">100% secure transactions</p>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Product Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">SKU:</dt>
                <dd className="font-medium">{product.sku}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Category:</dt>
                <dd className="font-medium">{product.category.name}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
