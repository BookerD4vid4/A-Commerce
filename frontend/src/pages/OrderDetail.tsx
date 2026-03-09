import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Package, MapPin, CreditCard, ShoppingBag } from "lucide-react";
import { orderService } from "../services/orderService";
import type { Order } from "../services/orderService";
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
  pending: "bg-warning-50 text-warning-700 border-warning-200",
  confirmed: "bg-primary-50 text-primary-700 border-primary-200",
  preparing: "bg-purple-50 text-purple-700 border-purple-200",
  shipping: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-success-50 text-success-700 border-success-200",
  cancelled: "bg-danger-50 text-danger-700 border-danger-200",
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    loadOrder();
  }, [isAuthenticated, navigate, orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await orderService.getOrder(parseInt(orderId));
      setOrder(data);
    } catch (error: any) {
      alert(error.response?.data?.detail || "ไม่สามารถโหลดคำสั่งซื้อได้");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm("ต้องการยกเลิกคำสั่งซื้อนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้")) return;

    try {
      setCancelling(true);
      await orderService.cancelOrder(order.order_id);
      alert("ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว");
      loadOrder();
    } catch (error: any) {
      alert(error.response?.data?.detail || "ไม่สามารถยกเลิกคำสั่งซื้อได้");
    } finally {
      setCancelling(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Package className="w-16 h-16 text-gray-200 mb-4" />
        <p className="text-gray-400 font-medium">ไม่พบคำสั่งซื้อ</p>
      </div>
    );
  }

  const canCancel = ["pending", "confirmed"].includes(order.status);

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/orders")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">คำสั่งซื้อ #{order.order_id}</h1>
          <p className="text-xs text-gray-400">
            {new Date(order.created_at).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Status badges */}
        <div className="flex gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${statusColors[order.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
            {statusLabels[order.status] || order.status}
          </span>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 text-gray-500 border border-gray-100">
            {paymentStatusLabels[order.payment_status] || order.payment_status}
          </span>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-500" />
            <h2 className="font-bold text-sm text-gray-900">ที่อยู่จัดส่ง</h2>
          </div>
          <div className="p-4">
            <p className="font-semibold text-sm text-gray-900">{order.shipping_address.recipient_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.shipping_address.phone_number}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {order.shipping_address.address_line}
              {order.shipping_address.subdistrict && ` ${order.shipping_address.subdistrict}`}
              {order.shipping_address.district && ` ${order.shipping_address.district}`}
              {order.shipping_address.province && ` ${order.shipping_address.province}`}
              {order.shipping_address.postal_code && ` ${order.shipping_address.postal_code}`}
            </p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-500" />
            <h2 className="font-bold text-sm text-gray-900">วิธีชำระเงิน</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-700">
              {order.payment_method === "cod" ? "เก็บเงินปลายทาง (COD)" : "PromptPay QR Code"}
            </p>
            {order.payment_method === "promptpay_qr" && order.payment_status === "unpaid" && (
              <Link
                to={`/orders/${order.order_id}/payment`}
                className="inline-block mt-2 text-sm text-primary-600 font-semibold hover:text-primary-700"
              >
                ชำระเงินเลย →
              </Link>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary-500" />
            <h2 className="font-bold text-sm text-gray-900">รายการสินค้า</h2>
          </div>
          <div className="p-4 space-y-3">
            {order.items.map((item) => (
              <div key={item.variant_id} className="flex gap-3">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-gray-200" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{item.product_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ฿{item.price.toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-gray-900">
                    ฿{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">ยอดรวมทั้งหมด</span>
              <span className="text-xl font-bold text-primary-600">฿{order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Cancel button */}
        {canCancel && (
          <button
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="w-full py-3 border-2 border-danger-200 text-danger-600 rounded-2xl text-sm font-semibold hover:bg-danger-50 disabled:opacity-50 transition-colors"
          >
            {cancelling ? "กำลังยกเลิก..." : "ยกเลิกคำสั่งซื้อ"}
          </button>
        )}
      </div>
    </div>
  );
}
