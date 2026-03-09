import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, CreditCard, Truck, ChevronLeft, Check } from "lucide-react";
import { addressService } from "../services/addressService";
import type { Address, AddressCreate } from "../services/addressService";
import { orderService } from "../services/orderService";
import type { CreateOrderRequest } from "../services/orderService";
import { cartService } from "../services/cartService";
import { useAuthStore } from "../stores/authStore";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function Checkout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"promptpay_qr" | "cod">("cod");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [newAddress, setNewAddress] = useState<AddressCreate>({
    recipient_name: "",
    phone_number: "",
    address_line: "",
    subdistrict: "",
    district: "",
    province: "",
    postal_code: "",
    is_default: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setPageLoading(true);
      const [addressesData, cartData] = await Promise.all([
        addressService.getAddresses(),
        cartService.getCart(),
      ]);

      setAddresses(addressesData);
      setCartItems(cartData.items);
      setTotal(cartData.total_amount);

      const defaultAddr = addressesData.find((addr) => addr.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.address_id);
      }
    } catch (error) {
      console.error("Failed to load checkout data:", error);
      alert("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
    } finally {
      setPageLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const created = await addressService.createAddress(newAddress);
      setAddresses([...addresses, created]);
      setSelectedAddressId(created.address_id);
      setShowAddressForm(false);
      setNewAddress({
        recipient_name: "",
        phone_number: "",
        address_line: "",
        subdistrict: "",
        district: "",
        province: "",
        postal_code: "",
        is_default: false,
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || "ไม่สามารถเพิ่มที่อยู่ได้");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      alert("กรุณาเลือกที่อยู่จัดส่ง");
      return;
    }
    if (cartItems.length === 0) {
      alert("ตะกร้าว่างเปล่า");
      return;
    }

    setLoading(true);
    try {
      const orderRequest: CreateOrderRequest = {
        shipping_address_id: selectedAddressId,
        payment_method: paymentMethod,
      };
      const order = await orderService.createOrder(orderRequest);

      if (paymentMethod === "promptpay_qr") {
        navigate(`/orders/${order.order_id}/payment`);
      } else {
        navigate(`/orders/${order.order_id}`);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || "ไม่สามารถสร้างคำสั่งซื้อได้");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  if (pageLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">สั่งซื้อสินค้า</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Shipping Address Section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-primary-500" />
            <h2 className="font-bold text-gray-900">ที่อยู่จัดส่ง</h2>
          </div>

          <div className="p-4">
            {addresses.length === 0 && !showAddressForm && (
              <p className="text-sm text-gray-400 mb-3">ยังไม่มีที่อยู่ กรุณาเพิ่มที่อยู่จัดส่ง</p>
            )}

            <div className="space-y-2.5">
              {addresses.map((address) => (
                <button
                  key={address.address_id}
                  type="button"
                  onClick={() => setSelectedAddressId(address.address_id)}
                  className={`w-full text-left rounded-xl p-3.5 border-2 transition-all ${
                    selectedAddressId === address.address_id
                      ? "border-primary-500 bg-primary-50/50"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      selectedAddressId === address.address_id
                        ? "border-primary-500 bg-primary-500"
                        : "border-gray-300"
                    }`}>
                      {selectedAddressId === address.address_id && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{address.recipient_name}</span>
                        {address.is_default && (
                          <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-md font-semibold">
                            ค่าเริ่มต้น
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{address.phone_number}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {address.address_line}
                        {address.subdistrict && ` ${address.subdistrict}`}
                        {address.district && ` ${address.district}`}
                        {address.province && ` ${address.province}`}
                        {address.postal_code && ` ${address.postal_code}`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!showAddressForm ? (
              <button
                onClick={() => setShowAddressForm(true)}
                className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                เพิ่มที่อยู่ใหม่
              </button>
            ) : (
              <form onSubmit={handleAddAddress} className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-sm text-gray-900 mb-3">ที่อยู่ใหม่</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="ชื่อผู้รับ"
                    value={newAddress.recipient_name}
                    onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                    className="input-field"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="เบอร์โทรศัพท์ (0xxxxxxxxx)"
                    value={newAddress.phone_number}
                    onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })}
                    pattern="^0\d{9}$"
                    className="input-field"
                    required
                  />
                  <textarea
                    placeholder="ที่อยู่"
                    value={newAddress.address_line}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                    className="input-field"
                    rows={2}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="ตำบล/แขวง"
                      value={newAddress.subdistrict}
                      onChange={(e) => setNewAddress({ ...newAddress, subdistrict: e.target.value })}
                      className="input-field"
                    />
                    <input
                      type="text"
                      placeholder="อำเภอ/เขต"
                      value={newAddress.district}
                      onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="จังหวัด"
                      value={newAddress.province}
                      onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                      className="input-field"
                    />
                    <input
                      type="text"
                      placeholder="รหัสไปรษณีย์"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                      pattern="^\d{5}$"
                      className="input-field"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                      className="w-4 h-4 rounded text-primary-500 border-gray-300 focus:ring-primary-400"
                    />
                    <span className="text-sm text-gray-600">ตั้งเป็นที่อยู่หลัก</span>
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      บันทึกที่อยู่
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <CreditCard className="w-4.5 h-4.5 text-primary-500" />
            <h2 className="font-bold text-gray-900">วิธีชำระเงิน</h2>
          </div>

          <div className="p-4 space-y-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("cod")}
              className={`w-full text-left rounded-xl p-3.5 border-2 transition-all ${
                paymentMethod === "cod"
                  ? "border-primary-500 bg-primary-50/50"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  paymentMethod === "cod" ? "border-primary-500 bg-primary-500" : "border-gray-300"
                }`}>
                  {paymentMethod === "cod" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <Truck className="w-5 h-5 text-gray-500 inline mr-2" />
                  <span className="font-semibold text-sm text-gray-900">เก็บเงินปลายทาง (COD)</span>
                  <p className="text-xs text-gray-400 mt-0.5 ml-7">ชำระเงินเมื่อได้รับสินค้า</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("promptpay_qr")}
              className={`w-full text-left rounded-xl p-3.5 border-2 transition-all ${
                paymentMethod === "promptpay_qr"
                  ? "border-primary-500 bg-primary-50/50"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  paymentMethod === "promptpay_qr" ? "border-primary-500 bg-primary-500" : "border-gray-300"
                }`}>
                  {paymentMethod === "promptpay_qr" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <CreditCard className="w-5 h-5 text-gray-500 inline mr-2" />
                  <span className="font-semibold text-sm text-gray-900">PromptPay QR Code</span>
                  <p className="text-xs text-gray-400 mt-0.5 ml-7">สแกน QR จ่ายเงินทันที</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">สรุปคำสั่งซื้อ</h2>
          </div>

          <div className="p-4">
            <div className="space-y-2.5 mb-4">
              {cartItems.map((item) => (
                <div key={item.variant_id} className="flex justify-between items-center text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-700 line-clamp-1">{item.product_name}</span>
                    <span className="text-gray-400 ml-1">x{item.quantity}</span>
                  </div>
                  <span className="font-semibold text-gray-900 ml-3">
                    ฿{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">ยอดรวมทั้งหมด</span>
              <span className="text-xl font-bold text-primary-600">฿{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading || !selectedAddressId || cartItems.length === 0}
          className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-base font-bold transition-colors shadow-sm"
        >
          {loading ? "กำลังดำเนินการ..." : "ยืนยันคำสั่งซื้อ"}
        </button>
      </div>
    </div>
  );
}
