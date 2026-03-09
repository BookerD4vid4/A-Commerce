import { useEffect, useRef } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { orderService } from "../../services/orderService";
import type { ChatMessage } from "../../stores/chatStore";

interface Props {
  message: ChatMessage;
}

export default function ChatCODConfirm({ message }: Props) {
  const { order_id, total } = message.checkoutData ?? {};
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!order_id || confirmedRef.current) return;
    confirmedRef.current = true;
    orderService.confirmCOD(order_id).catch(() => {
      // Silent fail — order was already created, COD confirm is best-effort
    });
  }, [order_id]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-4">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
        <p className="text-sm font-bold text-green-800">สั่งซื้อสำเร็จค่ะ!</p>

        {order_id && (
          <p className="text-xs text-green-600">ออเดอร์ #{order_id}</p>
        )}

        {total !== undefined && (
          <p className="text-xs text-gray-600">
            ยอดรวม:{" "}
            <span className="font-semibold text-gray-800">
              ฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
          </p>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-lg">
          <span className="text-[11px] text-gray-600 font-medium">ชำระเงินเมื่อรับสินค้า</span>
        </div>
      </div>

      {order_id && (
        <Link
          to={`/orders/${order_id}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <ClipboardList className="w-3 h-3" />
          <span>ดูสถานะออเดอร์</span>
        </Link>
      )}
    </div>
  );
}
