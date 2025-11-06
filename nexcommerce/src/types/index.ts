import { Product, Category, User, Order, OrderItem, CartItem } from '@prisma/client';

export type ProductWithImages = Product & {
  images: { id: string; url: string; alt: string | null }[];
  category: Category;
};

export type ProductWithVariants = Product & {
  images: { id: string; url: string; alt: string | null }[];
  category: Category;
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: any;
    image: string | null;
  }[];
};

export type CartItemWithProduct = CartItem & {
  product: ProductWithImages;
};

export type OrderWithItems = Order & {
  items: (OrderItem & {
    product: Product;
  })[];
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
  };
  billingAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
  };
};

export interface FilterParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}
