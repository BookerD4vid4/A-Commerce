import { useEffect, useRef, useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { orderService } from "../../services/orderService";
import { useChatStore } from "../../stores/chatStore";
import type { ChatMessage } from "../../stores/chatStore";

interface Props {
  message: ChatMessage;
  isLatest?: boolean;
}

const MAX_POLL_ATTEMPTS = 40; // 40 * 15s = 10 minutes

export default function ChatQRCode({ message, isLatest = false }: Props) {
  const { addLocalMessage } = useChatStore();
  const { order_id, qr_url, amount, demo_mode } = message.checkoutData ?? {};
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkPayment = async () => {
    if (!order_id || paid || expired) return;

    attemptsRef.current += 1;
    if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
      stopPolling();
      setExpired(true);
      addLocalMessage("QR Code หมดอายุแล้วค่ะ กรุณาสั่งใหม่อีกครั้งนะคะ");
      return;
    }

    setChecking(true);
    try {
      const result = await orderService.verifyPayment(order_id);
      if (result.paid) {
        setPaid(true);
        stopPolling();
        addLocalMessage(
          "ชำระเงินสำเร็จแล้วค่ะ! ขอบคุณที่ซื้อสินค้ากับเราค่ะ\nดูรายละเอียดออเดอร์ได้ที่ประวัติการสั่งซื้อ"
        );
      }
    } catch {
      // ignore — will retry on next interval
    } finally {
      setChecking(false);
    }
  };

  // Start polling only for the latest QR message, and only if not already paid/expired
  useEffect(() => {
    stopPolling();

    if (!isLatest || paid || expired || !order_id) return;

    intervalRef.current = setInterval(checkPayment, 15000);
    return () => stopPolling();
  }, [isLatest, order_id]);

  return (
    <div className="space-y-2.5">
      {demo_mode && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-[10px] font-semibold text-amber-600">Demo — ไม่ใช่ QR จริง</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-200 p-3">
        {qr_url ? (
          <img
            src={qr_url}
            alt="PromptPay QR"
            className="w-40 h-40 object-contain rounded-lg"
          />
        ) : (
          <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-xs text-gray-400">ไม่มี QR Code</span>
          </div>
        )}

        {amount !== undefined && (
          <p className="text-sm font-bold text-gray-800">
            ยอดชำระ:{" "}
            <span className="text-primary-600">
              ฿{amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
          </p>
        )}

        {order_id && (
          <p className="text-[10px] text-gray-400">ออเดอร์ #{order_id}</p>
        )}
      </div>

      {paid ? (
        <div className="flex items-center justify-center gap-2 py-2 bg-green-50 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs font-semibold text-green-700">ชำระเงินสำเร็จ</span>
        </div>
      ) : expired ? (
        <div className="flex items-center justify-center gap-2 py-2 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-red-600">QR หมดอายุ</span>
        </div>
      ) : isLatest ? (
        <button
          onClick={checkPayment}
          disabled={checking}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
          <span>{checking ? "กำลังตรวจสอบ..." : "ตรวจสอบการชำระเงิน"}</span>
        </button>
      ) : (
        <div className="flex items-center justify-center py-2 bg-gray-50 rounded-lg">
          <span className="text-xs text-gray-400">QR Code เก่า</span>
        </div>
      )}
    </div>
  );
}
