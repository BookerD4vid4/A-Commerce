import { useState, useEffect } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { adminService } from "../../services/adminService";
import type { AdminUser } from "../../services/adminService";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function MembersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const pageSize = 20;

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const data = await adminService.getUsers(page, (searchTerm ?? search) || undefined);
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      console.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers(search);
  };

  const toggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      setUpdating(userId);
      await adminService.updateUser(userId, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    } catch {
      alert("ไม่สามารถอัปเดตได้");
    } finally {
      setUpdating(null);
    }
  };

  const toggleActive = async (userId: number, currentActive: boolean) => {
    try {
      setUpdating(userId);
      await adminService.updateUser(userId, { is_active: !currentActive });
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, is_active: !currentActive } : u
        )
      );
    } catch {
      alert("ไม่สามารถอัปเดตได้");
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">จัดการสมาชิก</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          ค้นหา
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">ไม่พบสมาชิก</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">ชื่อ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">เบอร์โทร</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">สิทธิ์</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">สถานะ</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">คำสั่งซื้อ</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">ยอดซื้อ</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">สมัครเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.full_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone_number}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleRole(u.user_id, u.role)}
                        disabled={updating === u.user_id}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          u.role === "admin"
                            ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {u.role === "admin" ? "Admin" : "User"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(u.user_id, u.is_active)}
                        disabled={updating === u.user_id}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          u.is_active ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            u.is_active ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{u.order_count}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatPrice(u.total_spent)}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatDate(u.created_at)}</td>
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
