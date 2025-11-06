import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  slug: string;
  variantId?: string;
  attributes?: Record<string, string>;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items;
        const existingItemIndex = items.findIndex(
          (item) =>
            item.productId === newItem.productId &&
            item.variantId === newItem.variantId
        );

        if (existingItemIndex > -1) {
          // Update quantity if item exists
          const updatedItems = [...items];
          const currentQuantity = updatedItems[existingItemIndex].quantity;
          const newQuantity = currentQuantity + (newItem.quantity || 1);

          if (newQuantity > newItem.stock) {
            toast.error('Not enough stock available');
            return;
          }

          updatedItems[existingItemIndex].quantity = newQuantity;
          set({ items: updatedItems });
          toast.success('Cart updated');
        } else {
          // Add new item
          const itemToAdd: CartItem = {
            ...newItem,
            quantity: newItem.quantity || 1,
          };

          if (itemToAdd.quantity > newItem.stock) {
            toast.error('Not enough stock available');
            return;
          }

          set({ items: [...items, itemToAdd] });
          toast.success('Added to cart');
        }
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
        toast.success('Removed from cart');
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }

        const items = get().items;
        const item = items.find((item) => item.id === id);

        if (item && quantity > item.stock) {
          toast.error('Not enough stock available');
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
