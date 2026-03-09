import { useState } from "react";
import { QrCode, Truck, Loader2, MapPin } from "lucide-react";
import { orderService } from "../../services/orderService";
import { useChatStore } from "../../stores/chatStore";
import { useCartStore } from "../../stores/cartStore";
import type { ChatMessage } from "../../stores/chatStore";

interface Props {
  message: ChatMessage;
  isLatest?: boolean;
}

export default function ChatPaymentSelector({ message, isLatest = true }: Props) {
  const { addLocalMessage } = useChatStore();
  const { fetchCart } = useCartStore();
  const [loading, setLoading] = useState<"promptpay" | "cod" | null>(null);

  const { address_id, address_text } = message.checkoutData ?? {};

  const handleSelect = async (method: "promptpay_qr" | "cod") => {
    if (!address_id || loading || !isLatest) return;
    setLoading(method === "promptpay_qr" ? "promptpay" : "cod");

    try {
      // Refresh cart from database and verify it has items
      await fetchCart();
      const freshCart = useCartStore.getState().items;
      if (freshCart.length === 0) {
        addLocalMessage("ตะกร้าว่างเปล่าค่ะ กรุณาเพิ่มสินค้าก่อนนะคะ");
        setLoading(null);
        return;
      }

      const order = await orderService.createOrder({
        shipping_address_id: address_id,
        payment_method: method,
      });

      await fetchCart();

      if (method === "cod") {
        addLocalMessage("", {
          action: "show_cod_confirm",
          checkoutData: {
            order_id: order.order_id,
            total: order.total_amount,
          },
        });
      } else {
        const qr = await orderService.generatePaymentQR(order.order_id);
        addLocalMessage("", {
          action: "show_qr",
          checkoutData: {
            order_id: order.order_id,
            qr_url: qr.qr_code_url,
            amount: qr.amount,
            demo_mode: qr.demo_mode,
          },
        });
      }
    } catch (err: unknown) {
      // Extract error detail from axios response
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;

      let msg: string;
      if (detail && detail.toLowerCase().includes("cart")) {
        msg = "ตะกร้าว่างเปล่าค่ะ กรุณาเพิ่มสินค้าก่อนนะคะ";
      } else if (detail && detail.toLowerCase().includes("stock")) {
        msg = "ขออภัยค่ะ สินค้าบางรายการหมดสต็อก กรุณาตรวจสอบตะกร้าอีกครั้ง";
      } else {
        msg = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ";
      }
      addLocalMessage(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {address_text && (
        <div className="flex items-start gap-1.5 bg-gray-50 rounded-lg p-2.5">
          <MapPin className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-600 leading-relaxed">{address_text}</p>
        </div>
      )}

      <p className="text-xs font-semibold text-gray-600">เลือกวิธีชำระเงิน:</p>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSelect("promptpay_qr")}
          disabled={!!loading || !isLatest}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === "promptpay" ? (
            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
          ) : (
            <QrCode className="w-5 h-5 text-primary-500" />
          )}
          <span className="text-xs font-semibold text-primary-700">QR PromptPay</span>
        </button>

        <button
          onClick={() => handleSelect("cod")}
          disabled={!!loading || !isLatest}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === "cod" ? (
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          ) : (
            <Truck className="w-5 h-5 text-gray-500" />
          )}
          <span className="text-xs font-semibold text-gray-700">เก็บเงินปลายทาง</span>
        </button>
      </div>
    </div>
  );
}
