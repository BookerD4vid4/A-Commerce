import { useState, useEffect } from "react";
import { Users, ShoppingCart, Package, DollarSign, AlertTriangle, Loader2 } from "lucide-react";
import { adminService } from "../../services/adminService";
import type { DashboardStats } from "../../services/adminService";

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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboard();
      setStats(data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-red-500">{error || "เกิดข้อผิดพลาด"}</div>
    );
  }

  const statCards = [
    { label: "สมาชิกทั้งหมด", value: stats.total_users, icon: Users, color: "bg-blue-500" },
    { label: "คำสั่งซื้อทั้งหมด", value: stats.total_orders, icon: ShoppingCart, color: "bg-primary-500" },
    { label: "รายได้รวม", value: formatPrice(stats.total_revenue), icon: DollarSign, color: "bg-green-500" },
    { label: "สินค้าที่ขาย", value: stats.total_products, icon: Package, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">แดชบอร์ด</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Orders by Status */}
      {Object.keys(stats.orders_by_status).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3">สถานะคำสั่งซื้อ</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.orders_by_status).map(([status, count]) => (
              <span
                key={status}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}
              >
                {STATUS_LABELS[status] || status}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3">คำสั่งซื้อล่าสุด</h2>
          {stats.recent_orders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">ยังไม่มีคำสั่งซื้อ</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_orders.map((order: any) => (
                <div key={order.order_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      #{order.order_id} - {order.full_name || order.phone_number}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatPrice(order.total_amount)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || ""}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            สินค้าใกล้หมด
          </h2>
          {stats.low_stock_alerts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">ไม่มีสินค้าใกล้หมด</p>
          ) : (
            <div className="space-y-2">
              {stats.low_stock_alerts.map((item: any) => (
                <div key={item.variant_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-400">
                      {item.sku || ""} {item.size ? `(${item.size})` : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    item.stock_quantity === 0
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}>
                    {item.stock_quantity} {item.unit || "ชิ้น"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
