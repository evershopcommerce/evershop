'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, getSubtotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Contact
    email: session?.user?.email || '',
    // Shipping
    shippingFullName: session?.user?.name || '',
    shippingAddress1: '',
    shippingAddress2: '',
    shippingCity: '',
    shippingState: '',
    shippingCountry: 'US',
    shippingPostalCode: '',
    shippingPhone: '',
    // Billing (same as shipping by default)
    sameAsShipping: true,
    billingFullName: '',
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingState: '',
    billingCountry: 'US',
    billingPostalCode: '',
    billingPhone: '',
  });

  const subtotal = getSubtotal();
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.085;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <Link href="/products" className="btn-primary">
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please sign in to continue</h2>
            <Link href="/auth/login" className="btn-primary">
              Sign In
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real app, this would integrate with Stripe
      // For demo purposes, we'll simulate the order creation

      const orderData = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          variantId: item.variantId,
        })),
        shippingAddress: {
          fullName: formData.shippingFullName,
          addressLine1: formData.shippingAddress1,
          addressLine2: formData.shippingAddress2,
          city: formData.shippingCity,
          state: formData.shippingState,
          country: formData.shippingCountry,
          postalCode: formData.shippingPostalCode,
          phone: formData.shippingPhone,
        },
        billingAddress: formData.sameAsShipping
          ? {
              fullName: formData.shippingFullName,
              addressLine1: formData.shippingAddress1,
              addressLine2: formData.shippingAddress2,
              city: formData.shippingCity,
              state: formData.shippingState,
              country: formData.shippingCountry,
              postalCode: formData.shippingPostalCode,
              phone: formData.shippingPhone,
            }
          : {
              fullName: formData.billingFullName,
              addressLine1: formData.billingAddress1,
              addressLine2: formData.billingAddress2,
              city: formData.billingCity,
              state: formData.billingState,
              country: formData.billingCountry,
              postalCode: formData.billingPostalCode,
              phone: formData.billingPhone,
            },
        subtotal,
        shipping,
        tax,
        total,
      };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success('Order placed successfully!');
      clearCart();
      router.push('/account/orders');
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-custom max-w-6xl">
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Form */}
              <div className="lg:col-span-2 space-y-8">
                {/* Contact Information */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="input w-full"
                      disabled
                    />
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.shippingFullName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shippingFullName: e.target.value,
                          })
                        }
                        required
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        value={formData.shippingAddress1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shippingAddress1: e.target.value,
                          })
                        }
                        required
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.shippingAddress2}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shippingAddress2: e.target.value,
                          })
                        }
                        className="input w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">City</label>
                        <input
                          type="text"
                          value={formData.shippingCity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              shippingCity: e.target.value,
                            })
                          }
                          required
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          State/Province
                        </label>
                        <input
                          type="text"
                          value={formData.shippingState}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              shippingState: e.target.value,
                            })
                          }
                          required
                          className="input w-full"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.shippingPostalCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              shippingPostalCode: e.target.value,
                            })
                          }
                          required
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Phone</label>
                        <input
                          type="tel"
                          value={formData.shippingPhone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              shippingPhone: e.target.value,
                            })
                          }
                          required
                          className="input w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                  <div className="border-2 border-primary rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-semibold">Credit Card (Demo)</p>
                        <p className="text-sm text-muted-foreground">
                          Stripe integration ready
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    💡 This is a demo. In production, Stripe payment would be integrated here.
                  </p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="card p-6 sticky top-20">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                          <p className="text-sm font-semibold">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="font-semibold">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span className="font-semibold">
                        {shipping === 0 ? 'Free' : formatPrice(shipping)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span className="font-semibold">{formatPrice(tax)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-bold">Total</span>
                      <span className="text-2xl font-bold">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full mt-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </button>

                  <p className="mt-4 text-xs text-center text-muted-foreground">
                    By placing your order, you agree to our Terms of Service and
                    Privacy Policy
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
