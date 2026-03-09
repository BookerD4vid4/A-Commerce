import api from "./api";

export interface OrderItem {
  variant_id: number;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface Order {
  order_id: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_address: {
    recipient_name: string;
    phone_number: string;
    address_line: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    postal_code?: string;
  };
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderListItem {
  order_id: number;
  total_amount: number;
  status: string;
  payment_status: string;
  items_count: number;
  created_at: string;
}

export interface CreateOrderRequest {
  shipping_address_id: number;
  payment_method: "promptpay_qr" | "cod";
  items?: Array<{
    variant_id: number;
    quantity: number;
  }>;
}

export interface QRCodeResponse {
  source_id: string;
  qr_code_url: string;
  expires_at?: string;
  amount: number;
  demo_mode: boolean;
}

export const orderService = {
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const response = await api.post("/api/orders/", request);
    return response.data;
  },

  async getOrders(): Promise<OrderListItem[]> {
    const response = await api.get("/api/orders/");
    return response.data;
  },

  async getOrder(orderId: number): Promise<Order> {
    const response = await api.get(`/api/orders/${orderId}`);
    return response.data;
  },

  async cancelOrder(
    orderId: number,
    reason?: string
  ): Promise<{ message: string; order_id: number }> {
    const response = await api.post(`/api/orders/${orderId}/cancel`, {
      cancel_reason: reason || "Customer requested cancellation",
    });
    return response.data;
  },

  async generatePaymentQR(orderId: number): Promise<QRCodeResponse> {
    const response = await api.post(`/api/payments/${orderId}/generate-qr`);
    return response.data;
  },

  async verifyPayment(
    orderId: number
  ): Promise<{ paid: boolean; status: string; message: string }> {
    const response = await api.post(`/api/payments/${orderId}/verify`);
    return response.data;
  },

  async confirmCOD(
    orderId: number
  ): Promise<{ message: string; order_id: number }> {
    const response = await api.post(`/api/payments/${orderId}/confirm-cod`);
    return response.data;
  },
};
