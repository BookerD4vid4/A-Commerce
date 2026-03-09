import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Package, MapPin, CreditCard, User, ChevronDown } from "lucide-react";
import { adminService } from "../../services/adminService";
import type { AdminOrderDetail } from "../../services/adminService";

const STATUS_FLOW = ["pending", "confirmed", "preparing", "shipping", "delivered"];
const ALL_STATUSES = [...STATUS_FLOW, "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังจัดเตรียม",
  shipping: "กำลังจัดส่ง",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipping: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  pending: "border-yellow-300",
  confirmed: "border-blue-300",
  preparing: "border-purple-300",
  shipping: "border-indigo-300",
  delivered: "border-green-300",
  cancelled: "border-red-300",
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder(parseInt(orderId));
    }
  }, [orderId]);

  // Reset selected status when order status changes
  useEffect(() => {
    if (order) setSelectedStatus(order.status);
  }, [order?.status]);

  const loadOrder = async (id: number) => {
    try {
      setLoading(true);
      const data = await adminService.getOrder(id);
      setOrder(data);
    } catch {
      console.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    const confirmMsg =
      newStatus === "cancelled"
        ? "ยืนยันยกเลิกคำสั่งซื้อ?"
        : `เปลี่ยนสถานะเป็น "${STATUS_LABELS[newStatus]}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      setUpdating(true);
      await adminService.updateOrderStatus(order.order_id, newStatus);
      setOrder({ ...order, status: newStatus });
    } catch {
      alert("ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setShowDropdown(false);
  };

  const handleConfirmChange = () => {
    if (!order || selectedStatus === order.status) return;
    updateStatus(selectedStatus);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <p className="text-center py-12 text-gray-400">ไม่พบคำสั่งซื้อ</p>;
  }

  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/orders")}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">คำสั่งซื้อ #{order.order_id}</h1>
          <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
        </div>
        <span className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[order.status] || ""}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {/* Status Progress */}
      {order.status !== "cancelled" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            {STATUS_FLOW.map((step, i) => {
              const isDone = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-400"
                      } ${isCurrent ? "ring-2 ring-primary-300" : ""}`}
                    >
                      {i + 1}
                    </div>
                    <p className={`text-[10px] mt-1 text-center ${isDone ? "text-primary-600 font-medium" : "text-gray-400"}`}>
                      {STATUS_LABELS[step]}
                    </p>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${i < currentStepIndex ? "bg-primary-500" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Customer Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            ข้อมูลลูกค้า
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-gray-900">{order.user_name || "-"}</p>
            <p className="text-gray-500">{order.user_phone}</p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            การชำระเงิน
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-gray-900">
              {order.payment_method === "promptpay_qr" ? "PromptPay QR" : order.payment_method === "cod" ? "เก็บเงินปลายทาง" : order.payment_method || "-"}
            </p>
            <p className="text-gray-500">สถานะ: {order.payment_status}</p>
            <p className="text-lg font-bold text-primary-600">{formatPrice(order.total_amount)}</p>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            ที่อยู่จัดส่ง
          </h3>
          <div className="text-sm text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-900">{order.shipping_address.recipient_name}</p>
            <p>{order.shipping_address.phone_number}</p>
            <p>{order.shipping_address.address_line}</p>
            <p>
              {order.shipping_address.subdistrict} {order.shipping_address.district}{" "}
              {order.shipping_address.province} {order.shipping_address.postal_code}
            </p>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          รายการสินค้า ({order.items.length})
        </h3>
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                <p className="text-xs text-gray-400">
                  {formatPrice(item.price)} x {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Changer */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3">เปลี่ยนสถานะคำสั่งซื้อ</h3>
        <div className="flex gap-3 items-center">
          {/* Custom Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={updating}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                STATUS_BORDER_COLORS[selectedStatus] || "border-gray-200"
              } ${STATUS_COLORS[selectedStatus] || ""}`}
            >
              <span>{STATUS_LABELS[selectedStatus]}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                  {ALL_STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                        status === selectedStatus
                          ? "bg-primary-50 font-semibold"
                          : "hover:bg-gray-50"
                      } ${status === "cancelled" ? "text-red-600 border-t border-gray-100" : "text-gray-700"}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        STATUS_COLORS[status]?.split(" ")[0] || "bg-gray-200"
                      }`} />
                      {STATUS_LABELS[status]}
                      {status === order.status && (
                        <span className="ml-auto text-[10px] text-gray-400 font-normal">ปัจจุบัน</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmChange}
            disabled={updating || selectedStatus === order.status}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {updating ? "กำลังอัปเดต..." : "บันทึก"}
          </button>
        </div>
        {selectedStatus !== order.status && (
          <p className="text-xs text-gray-400 mt-2">
            เปลี่ยนจาก <span className="font-medium text-gray-600">{STATUS_LABELS[order.status]}</span> เป็น{" "}
            <span className={`font-medium ${selectedStatus === "cancelled" ? "text-red-500" : "text-primary-600"}`}>
              {STATUS_LABELS[selectedStatus]}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
