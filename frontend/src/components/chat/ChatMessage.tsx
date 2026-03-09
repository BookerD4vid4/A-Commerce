import { Bot, User } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import type { ChatMessage as ChatMessageType } from "../../stores/chatStore";
import type { ChatProduct, ChatVariant } from "../../services/chatService";
import ChatProductCard from "./ChatProductCard";
import ChatOrderCard from "./ChatOrderCard";
import ChatAddressSelector from "./ChatAddressSelector";
import ChatVariantSelector from "./ChatVariantSelector";
import ChatPaymentSelector from "./ChatPaymentSelector";
import ChatQRCode from "./ChatQRCode";
import ChatCODConfirm from "./ChatCODConfirm";

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
  onAddToCart?: (productId: number, variantId?: number) => void;
  onSelectVariant?: (variantId: number, product: ChatProduct, variant: ChatVariant) => void;
  addedVariantIds?: Set<number>;
  loadingVariantId?: number | null;
  loadingProductId?: number | null;
  isTestMode?: boolean;
}

export default function ChatMessage({
  message,
  isLatest = true,
  onAddToCart,
  onSelectVariant,
  addedVariantIds,
  loadingVariantId,
  loadingProductId,
  isTestMode = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const { isAuthenticated } = useAuthStore();

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-primary-100" : "bg-gray-100"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary-600" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-gray-500" />
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : ""}`}>
        {/* Text bubble — skip if empty (e.g. pure-action messages) */}
        {message.content && (
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? "bg-primary-500 text-white rounded-br-md"
                : "bg-gray-100 text-gray-800 rounded-bl-md"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Checkout: test mode for admin */}
        {message.action === "show_addresses" && isTestMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-yellow-700">[ทดสอบ] แสดงที่อยู่จัดส่งให้เลือก</p>
            <p className="text-[10px] text-yellow-600 mt-1">โหมดทดสอบ - ไม่ได้ดำเนินการสั่งซื้อจริง</p>
          </div>
        )}

        {/* Checkout: show address selector (real users) */}
        {message.action === "show_addresses" && !isTestMode && isAuthenticated && (
          <ChatAddressSelector isLatest={isLatest} />
        )}

        {/* Checkout: not logged in */}
        {message.action === "show_addresses" && !isTestMode && !isAuthenticated && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อค่ะ</p>
            <a
              href="/auth"
              className="inline-block mt-2 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 transition-colors"
            >
              เข้าสู่ระบบ
            </a>
          </div>
        )}

        {/* Payment method selector */}
        {message.action === "show_payment_method" && (
          <ChatPaymentSelector message={message} isLatest={isLatest} />
        )}

        {/* PromptPay QR */}
        {message.action === "show_qr" && (
          <ChatQRCode message={message} isLatest={isLatest} />
        )}

        {/* COD confirmation */}
        {message.action === "show_cod_confirm" && (
          <ChatCODConfirm message={message} />
        )}

        {/* Order confirmation card (auto-added, info only) */}
        {message.action === "add_to_cart" && message.orderProduct && (
          <ChatOrderCard
            product={message.orderProduct}
            quantity={message.quantity || 1}
            isAdded={true}
            onConfirmAdd={() => {}}
          />
        )}

        {/* Variant selector (multi-variant product) */}
        {message.action === "select_variant" && message.orderProduct && message.variants && message.variants.length > 0 && (
          <ChatVariantSelector
            product={message.orderProduct}
            variants={message.variants}
            onSelectVariant={onSelectVariant || (() => {})}
            isTestMode={isTestMode}
            addedVariantIds={addedVariantIds}
            loadingVariantId={loadingVariantId}
            isLatest={isLatest}
          />
        )}

        {/* Product recommendation cards (when user is searching) */}
        {message.products.length > 0 && !message.action && (
          <div className="space-y-1.5">
            {message.products.map((product) => (
              <ChatProductCard
                key={product.variant_id ?? product.product_id}
                product={product}
                onAddToCart={onAddToCart}
                loading={loadingProductId === (product.variant_id ?? product.product_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
