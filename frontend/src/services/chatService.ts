import api from "./api";

export interface ChatSession {
  session_id: number;
  session_token: string | null;
}

export interface ChatProduct {
  product_id: number;
  variant_id?: number | null;
  name: string;
  description: string | null;
  category_name: string | null;
  min_price: number;
  max_price: number;
  image_url: string | null;
  total_stock: number;
  size?: string | null;
  unit?: string | null;
  similarity?: number;
}

export interface ChatVariant {
  variant_id: number;
  sku: string | null;
  price: number;
  stock_quantity: number;
  unit: string | null;
  size: string | null;
  color: string | null;
  image_url: string | null;
}

export interface ChatMessageResponse {
  role: string;
  content: string;
  products: ChatProduct[];
  action?: string | null;
  order_product?: ChatProduct | null;
  variants?: ChatVariant[];
  quantity?: number | null;
}

export interface ChatHistoryItem {
  message_id: number;
  role: string;
  content: string;
  metadata: { products?: ChatProduct[] } | null;
  created_at: string;
}

export const chatService = {
  async createSession(sessionToken?: string | null): Promise<ChatSession> {
    const response = await api.post<ChatSession>("/api/chat/sessions", {
      session_token: sessionToken || null,
    });
    return response.data;
  },

  async sendMessage(sessionId: number, message: string): Promise<ChatMessageResponse> {
    const response = await api.post<ChatMessageResponse>(
      `/api/chat/sessions/${sessionId}/messages`,
      { message }
    );
    return response.data;
  },

  async getHistory(sessionId: number, limit = 20): Promise<ChatHistoryItem[]> {
    const response = await api.get<ChatHistoryItem[]>(
      `/api/chat/sessions/${sessionId}/messages`,
      { params: { limit } }
    );
    return response.data;
  },
};
