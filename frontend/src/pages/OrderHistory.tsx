import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, ChevronRight, Package } from "lucide-react";
import { orderService } from "../services/orderService";
import type { OrderListItem } from "../services/orderService";
import { useAuthStore } from "../stores/authStore";
import LoadingSpinner from "../components/common/LoadingSpinner";

const statusLabels: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังจัดเตรียม",
  shipping: "กำลังจัดส่ง",
  delivered: "จัดส่งแล้ว",
  cancelled: "ยกเลิก",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "ยังไม่ชำระ",
  paid: "ชำระแล้ว",
  cod_pending: "เก็บปลายทาง",
  refunded: "คืนเงินแล้ว",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning-50 text-warning-700",
  confirmed: "bg-primary-50 text-primary-700",
  preparing: "bg-purple-50 text-purple-700",
  shipping: "bg-blue-50 text-blue-700",
  delivered: "bg-success-50 text-success-700",
  cancelled: "bg-danger-50 text-danger-700",
};

export default function OrderHistory() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    loadOrders();
  }, [isAuthenticated, navigate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to load orders:", error);
      alert("ไม่สามารถโหลดคำสั่งซื้อได้");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-2.5">
        <ClipboardList className="w-5 h-5 text-primary-500" />
        <h1 className="text-xl font-bold text-gray-900">คำสั่งซื้อของฉัน</h1>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-400 mb-1">ยังไม่มีคำสั่งซื้อ</p>
            <p className="text-sm text-gray-300 mb-6">เริ่มช้อปปิ้งกันเลย!</p>
            <Link
              to="/"
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              ไปหน้าร้านค้า
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.order_id}
                to={`/orders/${order.order_id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">
                      คำสั่งซื้อ #{order.order_id}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        statusColors[order.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-500">
                      {paymentStatusLabels[order.payment_status] || order.payment_status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">฿{order.total_amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">{order.items_count} รายการ</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
