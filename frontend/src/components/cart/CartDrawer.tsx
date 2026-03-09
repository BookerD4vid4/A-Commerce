import { useEffect } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag, AlertCircle } from "lucide-react";
import { useCartStore } from "../../stores/cartStore";
import { useAuthStore } from "../../stores/authStore";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../common/LoadingSpinner";

export default function CartDrawer() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    isOpen,
    closeCart,
    items,
    totalItems,
    totalAmount,
    isLoading,
    updateQuantity,
    removeItem,
    fetchCart,
  } = useCartStore();

  // Refresh cart from database every time drawer opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchCart();
    }
  }, [isOpen, isAuthenticated, fetchCart]);

  if (!isOpen) return null;

  const handleUpdateQuantity = async (variantId: number, newQuantity: number) => {
    try {
      await updateQuantity(variantId, newQuantity);
    } catch (error: any) {
      alert(error.response?.data?.detail || "เกิดข้อผิดพลาด");
    }
  };

  const handleRemove = async (variantId: number) => {
    if (!confirm("ต้องการลบสินค้านี้ออกจากตะกร้า?")) return;

    try {
      await removeItem(variantId);
    } catch (error) {
      alert("ไม่สามารถลบสินค้าได้");
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      closeCart();
      navigate("/auth");
      return;
    }

    closeCart();
    navigate("/checkout");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">ตะกร้าสินค้า</h2>
              {totalItems > 0 && (
                <p className="text-xs text-gray-400">{totalItems} รายการ</p>
              )}
            </div>
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-gray-200" />
              </div>
              <p className="text-lg font-semibold text-gray-400 mb-1">ตะกร้าว่างเปล่า</p>
              <p className="text-sm text-gray-300 mb-6 text-center">
                เลือกสินค้าที่ชอบแล้วเพิ่มลงตะกร้าได้เลย
              </p>
              <button
                onClick={() => {
                  closeCart();
                  navigate("/");
                }}
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                ไปหน้าร้านค้า
              </button>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="p-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.variant_id}
                  className={`bg-gray-50 rounded-2xl p-3 ${
                    !item.is_available ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-[72px] h-[72px] flex-shrink-0 bg-white rounded-xl overflow-hidden border border-gray-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ShoppingBag className="w-7 h-7" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                        {item.product_name}
                      </h3>
                      {item.size && (
                        <p className="text-xs text-gray-400 mt-0.5">ขนาด: {item.size}</p>
                      )}
                      <p className="text-base font-bold text-primary-600 mt-1">
                        ฿{item.price.toFixed(2)}
                        {item.unit && (
                          <span className="text-xs text-gray-400 font-normal ml-1">/{item.unit}</span>
                        )}
                      </p>

                      {/* Stock warning */}
                      {!item.is_available && (
                        <div className="flex items-center gap-1 mt-1 text-danger-500">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-xs font-medium">สินค้าหมดสต็อก</span>
                        </div>
                      )}
                      {item.is_available && item.stock_quantity < 5 && (
                        <div className="flex items-center gap-1 mt-1 text-warning-500">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-xs font-medium">เหลือเพียง {item.stock_quantity} ชิ้น</span>
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleRemove(item.variant_id)}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-danger-50 hover:text-danger-500 text-gray-300 rounded-lg transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity controls */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-0.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.variant_id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || !item.is_available}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>

                      <button
                        onClick={() => handleUpdateQuantity(item.variant_id, item.quantity + 1)}
                        disabled={
                          item.quantity >= item.stock_quantity || !item.is_available
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="font-bold text-gray-900 text-sm">
                      ฿{item.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">ยอดรวม</span>
              <span className="text-2xl font-bold text-primary-600">฿{totalAmount.toFixed(2)}</span>
            </div>

            {/* Buttons */}
            <button
              onClick={handleCheckout}
              disabled={items.some((item) => !item.is_available)}
              className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-2xl text-base font-bold transition-colors shadow-sm"
            >
              {isAuthenticated ? "ดำเนินการสั่งซื้อ" : "เข้าสู่ระบบเพื่อสั่งซื้อ"}
            </button>

            <button
              onClick={closeCart}
              className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
              ช้อปต่อ
            </button>
          </div>
        )}
      </div>
    </>
  );
}
