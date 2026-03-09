import api from "./api";

export interface CartItem {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_sku: string | null;
  price: number;
  quantity: number;
  stock_quantity: number;
  image_url: string | null;
  unit: string | null;
  size: string | null;
  color: string | null;
  is_available: boolean;
  subtotal: number;
}

export interface CartResponse {
  items: CartItem[];
  total_items: number;
  total_amount: number;
}

export const cartService = {
  /**
   * ดึงตะกร้าสินค้า (logged-in users)
   */
  async getCart(): Promise<CartResponse> {
    const response = await api.get<CartResponse>("/api/cart");
    return response.data;
  },

  /**
   * เพิ่มสินค้าลงตะกร้า
   */
  async addToCart(variantId: number, quantity: number = 1): Promise<CartResponse> {
    const response = await api.post<CartResponse>("/api/cart/items", {
      variant_id: variantId,
      quantity,
    });
    return response.data;
  },

  /**
   * แก้ไขจำนวนสินค้า
   */
  async updateQuantity(variantId: number, quantity: number): Promise<CartResponse> {
    const response = await api.put<CartResponse>(`/api/cart/items/${variantId}`, {
      quantity,
    });
    return response.data;
  },

  /**
   * ลบสินค้าออกจากตะกร้า
   */
  async removeItem(variantId: number): Promise<CartResponse> {
    const response = await api.delete<CartResponse>(`/api/cart/items/${variantId}`);
    return response.data;
  },

  /**
   * Sync guest cart to database (when user logs in)
   */
  async syncCart(items: Array<{ variant_id: number; quantity: number }>): Promise<CartResponse> {
    const response = await api.post<CartResponse>("/api/cart/sync", { items });
    return response.data;
  },

  /**
   * ล้างตะกร้าทั้งหมด
   */
  async clearCart(): Promise<void> {
    await api.delete("/api/cart");
  },
};
