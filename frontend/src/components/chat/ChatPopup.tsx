import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Loader2, FlaskConical } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useAuthStore } from "../../stores/authStore";
import { useCartStore } from "../../stores/cartStore";
import { productService } from "../../services/productService";
import type { ChatProduct, ChatVariant } from "../../services/chatService";
import ChatMessage from "./ChatMessage";

// Module-level: persists across popup open/close (component mount/unmount)
// Prevents autoAddToCart from firing again when popup is reopened
const processedOrderIds = new Set<string>();

export default function ChatPopup() {
  const { isOpen, closeChat, messages, isLoading, sendMessage, addLocalMessage } = useChatStore();
  const { isAuthenticated, user } = useAuthStore();
  const { addToCart, addToGuestCart, fetchCart } = useCartStore();

  const isAdmin = user?.role === "admin";

  const [input, setInput] = useState("");
  const [addedVariantIds, setAddedVariantIds] = useState<Set<number>>(new Set());
  const [loadingVariantId, setLoadingVariantId] = useState<number | null>(null);
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-add to cart when order intent is detected
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg?.action === "add_to_cart" &&
      lastMsg.orderProduct &&
      !processedOrderIds.has(lastMsg.id)
    ) {
      processedOrderIds.add(lastMsg.id);
      autoAddToCart(lastMsg);
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    await sendMessage(trimmed);
  };

  const handleAddToCart = async (productId: number, variantId?: number) => {
    if (loadingProductId) return;
    setLoadingProductId(variantId ?? productId);
    try {
      // Find product info from messages
      let chatProduct: ChatProduct | null = null;
      for (const msg of messages) {
        const found = variantId
          ? msg.products.find((p) => p.variant_id === variantId)
          : msg.products.find((p) => p.product_id === productId);
        if (found) {
          chatProduct = found;
          break;
        }
      }
      const productName = chatProduct?.name || "สินค้า";

      // If we already have variant_id from the card, add directly
      if (variantId) {
        if (isAdmin) {
          addLocalMessage(
            `[ทดสอบ] เพิ่ม ${productName} x1 (${formatPrice(chatProduct?.min_price || 0)}) ในตะกร้า\n\n` +
            `(โหมดทดสอบ - ไม่ได้เพิ่มสินค้าลงตะกร้าจริง)`
          );
          return;
        }

        if (isAuthenticated) {
          await addToCart(variantId, 1);
        } else {
          addToGuestCart(variantId, 1);
        }

        let confirmText = `เพิ่ม ${productName} ในตะกร้าแล้วค่ะ`;
        if (isAuthenticated) {
          await fetchCart();
          const cartCount = useCartStore.getState().totalItems;
          const cartTotal = useCartStore.getState().totalAmount;
          confirmText += ` (ตะกร้า: ${cartCount} รายการ รวม ${formatPrice(cartTotal)})`;
        }
        addLocalMessage(confirmText);
        return;
      }

      // No variant_id: fetch product detail to find variants (legacy fallback)
      const productDetail = await productService.getProductDetail(productId);
      const activeVariants = productDetail.variants.filter((v) => v.is_active && v.stock_quantity > 0);

      if (activeVariants.length === 0) {
        addLocalMessage("ขออภัยค่ะ สินค้านี้หมดชั่วคราว");
        return;
      }

      // Admin: test mode
      if (isAdmin) {
        addLocalMessage(
          `[ทดสอบ] เพิ่ม ${productName} x1 (${formatPrice(activeVariants[0].price)}) ในตะกร้า\n\n` +
          `(โหมดทดสอบ - ไม่ได้เพิ่มสินค้าลงตะกร้าจริง)`
        );
        return;
      }

      const firstVariant = activeVariants[0];
      if (isAuthenticated) {
        await addToCart(firstVariant.variant_id, 1);
      } else {
        addToGuestCart(firstVariant.variant_id, 1);
      }

      let confirmText = `เพิ่ม ${productName} ในตะกร้าแล้วค่ะ`;

      if (isAuthenticated) {
        await fetchCart();
        const cartCount = useCartStore.getState().totalItems;
        const cartTotal = useCartStore.getState().totalAmount;
        confirmText += ` (ตะกร้า: ${cartCount} รายการ รวม ${formatPrice(cartTotal)})`;
      }

      addLocalMessage(confirmText);
    } catch {
      addLocalMessage("ขออภัยค่ะ ไม่สามารถเพิ่มสินค้าได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoadingProductId(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(price);

  const autoAddToCart = async (msg: typeof messages[0]) => {
    const product = msg.orderProduct!;
    const quantity = msg.quantity || 1;

    // Admin: test mode — don't actually add to cart
    if (isAdmin) {
      addLocalMessage(
        `[ทดสอบ] เพิ่ม ${product.name} x${quantity} (${formatPrice(product.min_price * quantity)}) ในตะกร้า\n\n` +
        `(โหมดทดสอบ - ไม่ได้เพิ่มสินค้าลงตะกร้าจริง)\n\nสั่งเพิ่มไหมคะ หรือจะชำระเงินเลย?`
      );
      return;
    }

    try {
      const detail = await productService.getProductDetail(product.product_id);
      const firstVariant = detail.variants.find((v) => v.is_active && v.stock_quantity > 0);
      if (!firstVariant) throw new Error("out_of_stock");

      if (isAuthenticated) {
        await addToCart(firstVariant.variant_id, quantity);
      } else {
        addToGuestCart(firstVariant.variant_id, quantity);
      }

      let confirmText = `เพิ่ม ${product.name} x${quantity} (${formatPrice(product.min_price * quantity)}) ในตะกร้าแล้วค่ะ`;

      if (isAuthenticated) {
        await fetchCart();
        const cartCount = useCartStore.getState().totalItems;
        const cartTotal = useCartStore.getState().totalAmount;
        confirmText += ` (ตะกร้า: ${cartCount} รายการ รวม ${formatPrice(cartTotal)})`;
      }

      confirmText += "\n\nสั่งเพิ่มไหมคะ หรือจะชำระเงินเลย?";
      addLocalMessage(confirmText);
    } catch {
      addLocalMessage("ขออภัยค่ะ ไม่สามารถเพิ่มสินค้าได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleSelectVariant = async (variantId: number, product: ChatProduct, variant: ChatVariant) => {
    if (isAdmin) {
      const label = variant.size || variant.unit || variant.sku || `#${variantId}`;
      setAddedVariantIds((prev) => new Set(prev).add(variantId));
      addLocalMessage(
        `[ทดสอบ] เพิ่ม ${product.name} (${label}) x1 (${formatPrice(variant.price)}) ในตะกร้า\n\n` +
        `(โหมดทดสอบ - ไม่ได้เพิ่มสินค้าลงตะกร้าจริง)\n\nสั่งเพิ่มไหมคะ หรือจะชำระเงินเลย?`
      );
      return;
    }

    setLoadingVariantId(variantId);
    try {
      if (isAuthenticated) {
        await addToCart(variantId, 1);
      } else {
        addToGuestCart(variantId, 1);
      }

      setAddedVariantIds((prev) => new Set(prev).add(variantId));

      const label = variant.size || variant.unit || variant.sku || `#${variantId}`;
      let confirmText = `เพิ่ม ${product.name} (${label}) x1 (${formatPrice(variant.price)}) ในตะกร้าแล้วค่ะ`;

      if (isAuthenticated) {
        await fetchCart();
        const cartCount = useCartStore.getState().totalItems;
        const cartTotal = useCartStore.getState().totalAmount;
        confirmText += ` (ตะกร้า: ${cartCount} รายการ รวม ${formatPrice(cartTotal)})`;
      }

      confirmText += "\n\nสั่งเพิ่มไหมคะ หรือจะชำระเงินเลย?";
      addLocalMessage(confirmText);
    } catch {
      addLocalMessage("ขออภัยค่ะ ไม่สามารถเพิ่มสินค้าได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoadingVariantId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[340px] h-[480px] bg-white rounded-2xl shadow-2xl shadow-black/15 flex flex-col overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-primary-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">ผู้ช่วยร้าน ABC</h3>
            {isAdmin ? (
              <div className="flex items-center gap-1">
                <FlaskConical className="w-2.5 h-2.5 text-yellow-200" />
                <p className="text-yellow-200 text-[10px] font-semibold">โหมดทดสอบ (Admin)</p>
              </div>
            ) : (
              <p className="text-white/70 text-[10px]">ถามเรื่องสินค้าได้เลยค่ะ</p>
            )}
          </div>
        </div>
        <button
          onClick={closeChat}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/20 transition-colors"
        >
          <X className="w-4.5 h-4.5 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-3">
              <Bot className="w-7 h-7 text-primary-400" />
            </div>
            {isAdmin ? (
              <>
                <p className="text-sm font-semibold text-gray-500 mb-1">โหมดทดสอบ</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  ทดสอบระบบแชทบอทได้เลยค่ะ การสั่งซื้อจะไม่ถูกดำเนินการจริง
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-500 mb-1">สวัสดีค่ะ!</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  สอบถามเรื่องสินค้า ราคา หรือต้องการให้แนะนำสินค้า พิมพ์ได้เลยค่ะ
                </p>
              </>
            )}

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
              {["มีน้ำดื่มอะไรบ้าง", "แนะนำขนม", "สินค้าราคาถูก"].map((text) => (
                <button
                  key={text}
                  onClick={() => {
                    setInput("");
                    sendMessage(text);
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium hover:bg-primary-100 disabled:opacity-50 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isLatest={i === messages.length - 1}
            onAddToCart={handleAddToCart}
            onSelectVariant={handleSelectVariant}
            addedVariantIds={addedVariantIds}
            loadingVariantId={loadingVariantId}
            loadingProductId={loadingProductId}
            isTestMode={isAdmin}
          />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
          onSubmit={handleSubmit}
          className="border-t border-gray-100 px-3 py-2.5 flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            disabled={isLoading}
            className="flex-1 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
    </div>
  );
}
