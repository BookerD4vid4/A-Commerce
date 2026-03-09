import { create } from "zustand";
import { persist } from "zustand/middleware";
import { chatService } from "../services/chatService";
import type { ChatProduct, ChatVariant, ChatHistoryItem } from "../services/chatService";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products: ChatProduct[];
  action?: string | null;
  orderProduct?: ChatProduct | null;
  variants?: ChatVariant[];
  quantity?: number | null;
  checkoutData?: {
    address_id?: number;
    address_text?: string;
    order_id?: number;
    total?: number;
    qr_url?: string;
    amount?: number;
    demo_mode?: boolean;
  };
  createdAt: string;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  sessionId: number | null;
  sessionToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  addLocalMessage: (content: string, extra?: Partial<ChatMessage>) => void;
  initSession: () => Promise<void>;
  resetChat: () => void;
}

let messageCounter = 0;
const generateId = () => `msg_${Date.now()}_${++messageCounter}`;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      messages: [],
      sessionId: null,
      sessionToken: null,
      isLoading: false,
      isInitialized: false,

      resetChat: () => {
        set({
          messages: [],
          sessionId: null,
          sessionToken: null,
          isInitialized: false,
          isOpen: false,
        });
      },

      openChat: () => {
        set({ isOpen: true });
        const { isInitialized } = get();
        if (!isInitialized) {
          get().initSession();
        }
      },

      closeChat: () => set({ isOpen: false }),

      toggleChat: () => {
        const { isOpen } = get();
        if (!isOpen) {
          get().openChat();
        } else {
          get().closeChat();
        }
      },

      addLocalMessage: (content: string, extra?: Partial<ChatMessage>) => {
        const msg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content,
          products: [],
          createdAt: new Date().toISOString(),
          ...extra,
        };
        set((state) => ({
          messages: [...state.messages, msg],
        }));
      },

      initSession: async () => {
        // Prevent concurrent init calls (race condition on rapid open/close)
        if (get().isInitialized) return;
        set({ isInitialized: true });

        const { sessionToken, sessionId } = get();

        try {
          const session = await chatService.createSession(sessionToken);
          set({
            sessionId: session.session_id,
            sessionToken: session.session_token,
          });

          // Load history if resuming session and messages are empty (e.g. page refresh)
          if (sessionId === session.session_id && get().messages.length > 0) return;

          const history = await chatService.getHistory(session.session_id);
          if (history.length > 0) {
            const messages: ChatMessage[] = history.map((h) => ({
              id: `hist_${h.message_id}`,
              role: h.role as "user" | "assistant",
              content: h.content,
              products: [], // Don't show product cards from history (stale data)
              action: h.metadata?.action || null,
              orderProduct: h.metadata?.order_product || null,
              quantity: h.metadata?.quantity || null,
              createdAt: h.created_at,
            }));
            set({ messages });
          }
        } catch (error) {
          console.error("Failed to init chat session:", error);
          set({ isInitialized: false }); // Allow retry on failure
        }
      },

      sendMessage: async (message: string) => {
        const { sessionId, isLoading } = get();
        if (!sessionId || isLoading) return;

        // Add user message immediately
        const userMsg: ChatMessage = {
          id: generateId(),
          role: "user",
          content: message,
          products: [],
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, userMsg],
          isLoading: true,
        }));

        try {
          const response = await chatService.sendMessage(sessionId, message);

          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: response.content,
            products: response.products,
            action: response.action,
            orderProduct: response.order_product,
            variants: response.variants || [],
            quantity: response.quantity,
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMsg],
            isLoading: false,
          }));
        } catch (error) {
          console.error("Failed to send message:", error);

          const errorMsg: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: "ขออภัยค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
            products: [],
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            messages: [...state.messages, errorMsg],
            isLoading: false,
          }));
        }
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        sessionId: state.sessionId,
        sessionToken: state.sessionToken,
      }),
    }
  )
);
