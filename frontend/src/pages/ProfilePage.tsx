import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  LogOut,
  LayoutDashboard,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { addressService } from "../services/addressService";
import type { Address, AddressCreate } from "../services/addressService";

// Empty form state
const emptyForm: AddressCreate = {
  recipient_name: "",
  phone_number: "",
  address_line: "",
  subdistrict: "",
  district: "",
  province: "",
  postal_code: "",
  is_default: false,
};

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState<AddressCreate>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch {
      // silently fail
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const openCreateModal = () => {
    setEditingAddress(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setForm({
      recipient_name: addr.recipient_name,
      phone_number: addr.phone_number,
      address_line: addr.address_line,
      subdistrict: addr.subdistrict || "",
      district: addr.district || "",
      province: addr.province || "",
      postal_code: addr.postal_code || "",
      is_default: addr.is_default,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAddress(null);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipient_name || !form.phone_number || !form.address_line) return;

    setSaving(true);
    try {
      if (editingAddress) {
        await addressService.updateAddress(editingAddress.address_id, form);
      } else {
        await addressService.createAddress(form);
      }
      await loadAddresses();
      closeModal();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId: number) => {
    if (!confirm("ต้องการลบที่อยู่นี้ใช่ไหม?")) return;
    setDeletingId(addressId);
    try {
      await addressService.deleteAddress(addressId);
      await loadAddresses();
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await addressService.setDefaultAddress(addressId);
      await loadAddresses();
    } catch {
      // silently fail
    }
  };

  const formatAddress = (addr: Address) => {
    const parts = [addr.address_line, addr.subdistrict, addr.district, addr.province, addr.postal_code].filter(Boolean);
    return parts.join(" ");
  };

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {user?.name || "ผู้ใช้งาน"}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
              <Phone className="w-3.5 h-3.5" />
              <span>{user?.phone || "-"}</span>
            </div>
          </div>
        </div>

        {/* Admin Link */}
        {user?.role === "admin" && (
          <Link
            to="/admin"
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl font-semibold text-sm transition-colors mb-3"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>จัดการร้านค้า (Admin)</span>
          </Link>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* Addresses Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-bold text-gray-900">ที่อยู่จัดส่ง</h3>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มที่อยู่</span>
          </button>
        </div>

        {loadingAddresses ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">ยังไม่มีที่อยู่จัดส่ง</p>
            <p className="text-xs text-gray-300 mt-1">กดปุ่ม "เพิ่มที่อยู่" เพื่อเพิ่มที่อยู่ใหม่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.address_id}
                className="border border-gray-100 rounded-xl p-4 relative"
              >
                {/* Default badge */}
                {addr.is_default && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-primary-50 text-primary-600 rounded-lg text-[10px] font-semibold">
                    ค่าเริ่มต้น
                  </span>
                )}

                <div className="pr-16">
                  <p className="text-sm font-semibold text-gray-900">
                    {addr.recipient_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {addr.phone_number}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {formatAddress(addr)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr.address_id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Star className="w-3 h-3" />
                      <span>ตั้งเป็นค่าเริ่มต้น</span>
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(addr)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => handleDelete(addr.address_id)}
                    disabled={deletingId === addr.address_id}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Form Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-base font-bold text-gray-900">
                {editingAddress ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}
              </h3>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="w-4.5 h-4.5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  ชื่อผู้รับ *
                </label>
                <input
                  type="text"
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  placeholder="ชื่อ-นามสกุล"
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  type="tel"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  placeholder="0812345678"
                  required
                  pattern="0[0-9]{8,9}"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  ที่อยู่ *
                </label>
                <textarea
                  value={form.address_line}
                  onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                  placeholder="บ้านเลขที่ ซอย ถนน"
                  required
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    ตำบล/แขวง
                  </label>
                  <input
                    type="text"
                    value={form.subdistrict}
                    onChange={(e) => setForm({ ...form, subdistrict: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    อำเภอ/เขต
                  </label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    จังหวัด
                  </label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    รหัสไปรษณีย์
                  </label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    pattern="[0-9]{5}"
                    maxLength={5}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-400"
                />
                <span className="text-xs text-gray-600">ตั้งเป็นที่อยู่เริ่มต้น</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingAddress ? "บันทึกการแก้ไข" : "เพิ่มที่อยู่"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
