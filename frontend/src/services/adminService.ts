import api from "./api";

// Types
export interface DashboardStats {
  total_users: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  orders_by_status: Record<string, number>;
  recent_orders: Array<{
    order_id: number;
    full_name: string | null;
    phone_number: string;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
  low_stock_alerts: Array<{
    variant_id: number;
    product_name: string;
    sku: string | null;
    stock_quantity: number;
    unit: string | null;
    size: string | null;
  }>;
}

export interface AdminUser {
  user_id: number;
  phone_number: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  order_count: number;
  total_spent: number;
  last_login_at: string | null;
  created_at: string;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminOrderItem {
  order_id: number;
  user_name: string | null;
  user_phone: string;
  total_amount: number;
  status: string;
  payment_status: string;
  items_count: number;
  created_at: string;
}

export interface AdminOrderListResponse {
  orders: AdminOrderItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminOrderDetailItem {
  variant_id: number;
  product_name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

export interface AdminOrderDetail {
  order_id: number;
  user_id: number;
  user_name: string | null;
  user_phone: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  shipping_address: {
    recipient_name: string;
    phone_number: string;
    address_line: string;
    subdistrict: string;
    district: string;
    province: string;
    postal_code: string;
  } | null;
  items: AdminOrderDetailItem[];
  created_at: string;
  updated_at: string;
}

export interface ChatbotPrompt {
  prompt_id: number;
  prompt_type: string;
  category_id: number | null;
  product_id: number | null;
  prompt_text: string;
  is_active: boolean;
}

// Product Management
export interface AdminProductListItem {
  product_id: number;
  name: string;
  category_name: string | null;
  variant_count: number;
  min_price: number | null;
  max_price: number | null;
  total_stock: number;
  image_url: string | null;
  is_active: boolean;
}

export interface AdminProductListResponse {
  products: AdminProductListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminVariant {
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

export interface AdminProductDetail {
  product_id: number;
  name: string;
  description: string | null;
  marketing_copy: string | null;
  category_id: number | null;
  category_name: string | null;
  is_active: boolean;
  variants: AdminVariant[];
  created_at: string;
  updated_at: string;
}

export interface ReportSummary {
  revenue_by_period: Array<{ period: string; revenue: number }>;
  top_products: Array<{
    product_name: string;
    total_sold: number;
    total_revenue: number;
  }>;
  orders_over_time: Array<{ period: string; count: number }>;
}

export const adminService = {
  // Dashboard
  async getDashboard(): Promise<DashboardStats> {
    const res = await api.get("/api/admin/dashboard");
    return res.data;
  },

  // Users
  async getUsers(
    page?: number,
    search?: string
  ): Promise<UserListResponse> {
    const res = await api.get("/api/admin/users", {
      params: { page, search },
    });
    return res.data;
  },

  async getUser(userId: number): Promise<AdminUser> {
    const res = await api.get(`/api/admin/users/${userId}`);
    return res.data;
  },

  async updateUser(
    userId: number,
    data: { role?: string; is_active?: boolean }
  ) {
    const res = await api.patch(`/api/admin/users/${userId}`, data);
    return res.data;
  },

  // Orders
  async getOrders(params?: {
    page?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<AdminOrderListResponse> {
    const res = await api.get("/api/admin/orders", { params });
    return res.data;
  },

  async getOrder(orderId: number): Promise<AdminOrderDetail> {
    const res = await api.get(`/api/admin/orders/${orderId}`);
    return res.data;
  },

  async updateOrderStatus(orderId: number, status: string) {
    const res = await api.patch(`/api/admin/orders/${orderId}/status`, {
      status,
    });
    return res.data;
  },

  // Chatbot
  async getPrompts(): Promise<ChatbotPrompt[]> {
    const res = await api.get("/api/admin/chatbot/prompts");
    return res.data;
  },

  async updatePrompt(promptId: number, promptText: string) {
    const res = await api.put(`/api/admin/chatbot/prompts/${promptId}`, {
      prompt_text: promptText,
    });
    return res.data;
  },

  async createPrompt(data: {
    prompt_type: string;
    prompt_text: string;
    category_id?: number;
    product_id?: number;
  }) {
    const res = await api.post("/api/admin/chatbot/prompts", data);
    return res.data;
  },

  async regenerateEmbeddings() {
    const res = await api.post("/api/admin/chatbot/embeddings/regenerate");
    return res.data;
  },

  // Reports
  async getReports(period?: string): Promise<ReportSummary> {
    const res = await api.get("/api/admin/reports/summary", {
      params: { period },
    });
    return res.data;
  },

  // Products
  async getProducts(params?: {
    page?: number;
    search?: string;
    category_id?: number;
  }): Promise<AdminProductListResponse> {
    const res = await api.get("/api/admin/products", { params });
    return res.data;
  },

  async getProduct(productId: number): Promise<AdminProductDetail> {
    const res = await api.get(`/api/admin/products/${productId}`);
    return res.data;
  },

  async createProduct(data: {
    name: string;
    description?: string;
    marketing_copy?: string;
    category_id?: number;
    variants?: Array<{
      sku?: string;
      price: number;
      stock_quantity?: number;
      image_url?: string;
      unit?: string;
      size?: string;
      color?: string;
    }>;
  }): Promise<AdminProductDetail> {
    const res = await api.post("/api/admin/products", data);
    return res.data;
  },

  async updateProduct(
    productId: number,
    data: {
      name?: string;
      description?: string;
      marketing_copy?: string;
      category_id?: number;
      is_active?: boolean;
    }
  ) {
    const res = await api.put(`/api/admin/products/${productId}`, data);
    return res.data;
  },

  async deleteProduct(productId: number) {
    const res = await api.delete(`/api/admin/products/${productId}`);
    return res.data;
  },

  async createVariant(
    productId: number,
    data: {
      sku?: string;
      price: number;
      stock_quantity?: number;
      image_url?: string;
      unit?: string;
      size?: string;
      color?: string;
    }
  ) {
    const res = await api.post(`/api/admin/products/${productId}/variants`, data);
    return res.data;
  },

  async updateVariant(
    variantId: number,
    data: {
      sku?: string;
      price?: number;
      stock_quantity?: number;
      image_url?: string;
      unit?: string;
      size?: string;
      color?: string;
      is_active?: boolean;
    }
  ) {
    const res = await api.put(`/api/admin/variants/${variantId}`, data);
    return res.data;
  },

  async deleteVariant(variantId: number) {
    const res = await api.delete(`/api/admin/variants/${variantId}`);
    return res.data;
  },

};
