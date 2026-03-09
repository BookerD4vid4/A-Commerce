import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { adminService } from "../../services/adminService";
import type { AdminOrderItem } from "../../services/adminService";

const STATUS_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "pending", label: "รอดำเนินการ" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "preparing", label: "กำลังจัดเตรียม" },
  { value: "shipping", label: "กำลังจัดส่ง" },
  { value: "delivered", label: "ส่งแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipping: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "bg-yellow-50 text-yellow-600",
  paid: "bg-green-50 text-green-600",
  cod_pending: "bg-blue-50 text-blue-600",
  refunded: "bg-red-50 text-red-600",
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
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await adminService.getOrders({
        page,
        status: statusFilter || undefined,
      });
      setOrders(data.orders);
      setTotal(data.total);
    } catch {
      console.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">จัดการคำสั่งซื้อ</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === opt.value
                ? "bg-primary-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">ไม่พบคำสั่งซื้อ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">ลูกค้า</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">ยอดรวม</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">สถานะ</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">ชำระเงิน</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">รายการ</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">วันที่</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.order_id}
                    onClick={() => navigate(`/admin/orders/${order.order_id}`)}
                    className="border-b border-gray-50 hover:bg-primary-50/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {order.order_id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{order.user_name || "-"}</p>
                      <p className="text-xs text-gray-400">{order.user_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[order.status] || ""}`}>
                        {STATUS_OPTIONS.find((s) => s.value === order.status)?.label || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${PAYMENT_COLORS[order.payment_status] || ""}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {order.items_count}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            แสดง {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} จาก {total} รายการ
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-700">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
