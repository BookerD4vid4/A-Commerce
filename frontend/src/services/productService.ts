import api from "./api";

export interface Category {
  category_id: number;
  name: string;
  parent_id: number | null;
  product_count?: number;
}

export interface Variant {
  variant_id: number;
  sku: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  unit: string | null;
  size: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Product {
  product_id: number;
  name: string;
  description: string | null;
  marketing_copy: string | null;
  category_id: number | null;
  category_name: string | null;
  is_active: boolean;
  variants: Variant[];
}

export interface ProductListItem {
  product_id: number;
  name: string;
  description: string | null;
  category_name: string | null;
  min_price: number;
  max_price: number;
  image_url: string | null;
  is_active: boolean;
  total_stock: number;
}

export interface ProductFilters {
  category_id?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
}

export const productService = {
  /**
   * ดึงรายการ categories ทั้งหมด
   */
  async getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>("/api/products/categories");
    return response.data;
  },

  /**
   * ดึงรายการสินค้า พร้อม filters
   */
  async getProducts(filters?: ProductFilters): Promise<ProductListItem[]> {
    const response = await api.get<ProductListItem[]>("/api/products", {
      params: filters,
    });
    return response.data;
  },

  /**
   * ดึงรายละเอียดสินค้าตาม ID
   */
  async getProductDetail(productId: number): Promise<Product> {
    const response = await api.get<Product>(`/api/products/${productId}`);
    return response.data;
  },

  /**
   * ดึงรายละเอียด variant ตาม ID
   */
  async getVariantDetail(variantId: number): Promise<Variant> {
    const response = await api.get<Variant>(
      `/api/products/variant/${variantId}`,
    );
    return response.data;
  },
};
