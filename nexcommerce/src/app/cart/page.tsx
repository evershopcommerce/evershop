'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();

  const subtotal = getSubtotal();
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.085;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">
              Start shopping to add items to your cart
            </p>
            <Link href="/products" className="btn-primary">
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-custom">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      href={`/products/${item.slug}`}
                      className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="object-cover w-full h-full"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {item.name}
                      </Link>
                      {item.attributes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {Object.entries(item.attributes)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </p>
                      )}
                      <p className="text-lg font-bold mt-2">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    {/* Quantity & Remove */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="btn-ghost p-2 text-destructive"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="btn-outline p-2"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="btn-outline p-2"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-20">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">
                      {shipping === 0 ? 'Free' : formatPrice(shipping)}
                    </span>
                  </div>
                  {shipping === 0 && (
                    <p className="text-xs text-green-600">
                      You qualified for free shipping!
                    </p>
                  )}
                  {shipping > 0 && subtotal < 100 && (
                    <p className="text-xs text-muted-foreground">
                      Add {formatPrice(100 - subtotal)} more for free shipping
                    </p>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (8.5%)</span>
                    <span className="font-semibold">{formatPrice(tax)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="text-2xl font-bold">{formatPrice(total)}</span>
                  </div>
                </div>

                <Link href="/checkout" className="btn-primary w-full mb-3">
                  Proceed to Checkout
                </Link>
                <Link href="/products" className="btn-outline w-full">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
