import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cartService, type CartItem } from "../services/cartService";

interface GuestCartItem {
  variant_id: number;
  quantity: number;
}

interface CartState {
  // Guest cart (localStorage)
  guestCart: GuestCartItem[];

  // Logged-in cart (from database)
  items: CartItem[];
  totalItems: number;
  totalAmount: number;

  // UI state
  isOpen: boolean;
  isLoading: boolean;

  // Actions
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Guest cart actions
  addToGuestCart: (variantId: number, quantity: number) => void;
  updateGuestCart: (variantId: number, quantity: number) => void;
  removeFromGuestCart: (variantId: number) => void;
  clearGuestCart: () => void;
  getGuestCartCount: () => number;

  // Logged-in cart actions
  fetchCart: () => Promise<void>;
  addToCart: (variantId: number, quantity: number) => Promise<void>;
  updateQuantity: (variantId: number, quantity: number) => Promise<void>;
  removeItem: (variantId: number) => Promise<void>;
  syncCart: () => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      guestCart: [],
      items: [],
      totalItems: 0,
      totalAmount: 0,
      isOpen: false,
      isLoading: false,

      // UI actions
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Guest cart actions
      addToGuestCart: (variantId, quantity) => {
        const { guestCart } = get();
        const existingIndex = guestCart.findIndex((item) => item.variant_id === variantId);

        if (existingIndex >= 0) {
          // Update existing item
          const newCart = [...guestCart];
          newCart[existingIndex].quantity += quantity;
          set({ guestCart: newCart });
        } else {
          // Add new item
          set({ guestCart: [...guestCart, { variant_id: variantId, quantity }] });
        }
      },

      updateGuestCart: (variantId, quantity) => {
        const { guestCart } = get();
        if (quantity <= 0) {
          // Remove item
          set({ guestCart: guestCart.filter((item) => item.variant_id !== variantId) });
        } else {
          // Update quantity
          const newCart = guestCart.map((item) =>
            item.variant_id === variantId ? { ...item, quantity } : item
          );
          set({ guestCart: newCart });
        }
      },

      removeFromGuestCart: (variantId) => {
        set((state) => ({
          guestCart: state.guestCart.filter((item) => item.variant_id !== variantId),
        }));
      },

      clearGuestCart: () => {
        set({ guestCart: [] });
      },

      getGuestCartCount: () => {
        const { guestCart } = get();
        return guestCart.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Logged-in cart actions
      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const cart = await cartService.getCart();
          set({
            items: cart.items,
            totalItems: cart.total_items,
            totalAmount: cart.total_amount,
          });
        } catch (error) {
          console.error("Failed to fetch cart:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      addToCart: async (variantId, quantity) => {
        set({ isLoading: true });
        try {
          const cart = await cartService.addToCart(variantId, quantity);
          set({
            items: cart.items,
            totalItems: cart.total_items,
            totalAmount: cart.total_amount,
          });
        } catch (error: any) {
          console.error("Failed to add to cart:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        set({ isLoading: true });
        try {
          const cart = await cartService.updateQuantity(variantId, quantity);
          set({
            items: cart.items,
            totalItems: cart.total_items,
            totalAmount: cart.total_amount,
          });
        } catch (error) {
          console.error("Failed to update quantity:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (variantId) => {
        set({ isLoading: true });
        try {
          const cart = await cartService.removeItem(variantId);
          set({
            items: cart.items,
            totalItems: cart.total_items,
            totalAmount: cart.total_amount,
          });
        } catch (error) {
          console.error("Failed to remove item:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      syncCart: async () => {
        const { guestCart } = get();
        if (guestCart.length === 0) return;

        set({ isLoading: true });
        try {
          const cart = await cartService.syncCart(guestCart);
          set({
            items: cart.items,
            totalItems: cart.total_items,
            totalAmount: cart.total_amount,
            guestCart: [], // Clear guest cart after sync
          });
        } catch (error) {
          console.error("Failed to sync cart:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        set({ isLoading: true });
        try {
          await cartService.clearCart();
          set({
            items: [],
            totalItems: 0,
            totalAmount: 0,
          });
        } catch (error) {
          console.error("Failed to clear cart:", error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        guestCart: state.guestCart,
      }),
    }
  )
);
