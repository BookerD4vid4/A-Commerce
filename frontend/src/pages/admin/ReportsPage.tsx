import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { adminService } from "../../services/adminService";
import type { ReportSummary } from "../../services/adminService";

const PERIOD_OPTIONS = [
  { value: "daily", label: "รายวัน" },
  { value: "weekly", label: "รายสัปดาห์" },
  { value: "monthly", label: "รายเดือน" },
];

function formatPrice(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setReports(await adminService.getReports(period));
    } catch {
      console.error("Failed to load report");
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

  if (!reports) {
    return <p className="text-center py-12 text-gray-400">ไม่สามารถโหลดรายงานได้</p>;
  }

  const maxRevenue = Math.max(...reports.revenue_by_period.map((r) => r.revenue), 1);
  const maxOrders = Math.max(...reports.orders_over_time.map((r) => r.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">รายงาน</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === opt.value
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4">รายได้</h2>
        {reports.revenue_by_period.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <div>
            <div className="flex items-end gap-1 h-40">
              {reports.revenue_by_period.slice().reverse().map((item, i) => {
                const pct = Math.max((item.revenue / maxRevenue) * 100, 2);
                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                    <div
                      className="w-full bg-primary-400 hover:bg-primary-500 rounded-t-md transition-colors"
                      style={{ height: `${pct}%` }}
                    />
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                      {item.period}: {formatPrice(item.revenue)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400">{reports.revenue_by_period[reports.revenue_by_period.length - 1]?.period || ""}</span>
              <span className="text-[10px] text-gray-400">{reports.revenue_by_period[0]?.period || ""}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">รายได้รวม</p>
              <p className="text-lg font-bold text-primary-600">
                {formatPrice(reports.revenue_by_period.reduce((sum, r) => sum + r.revenue, 0))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Orders Over Time */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4">จำนวนคำสั่งซื้อ</h2>
        {reports.orders_over_time.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <div>
            <div className="flex items-end gap-1 h-32">
              {reports.orders_over_time.slice().reverse().map((item, i) => {
                const pct = Math.max((item.count / maxOrders) * 100, 2);
                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                    <div
                      className="w-full bg-blue-400 hover:bg-blue-500 rounded-t-md transition-colors"
                      style={{ height: `${pct}%` }}
                    />
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                      {item.period}: {item.count} คำสั่งซื้อ
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400">{reports.orders_over_time[reports.orders_over_time.length - 1]?.period || ""}</span>
              <span className="text-[10px] text-gray-400">{reports.orders_over_time[0]?.period || ""}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-3">สินค้าขายดี Top 10</h2>
        {reports.top_products.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">สินค้า</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">จำนวนขาย</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">รายได้</th>
                </tr>
              </thead>
              <tbody>
                {reports.top_products.map((product: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-2.5 text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-3 py-2.5 text-gray-900">{product.product_name}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{product.total_sold}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                      {formatPrice(Number(product.total_revenue))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
