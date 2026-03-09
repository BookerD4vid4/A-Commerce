import { Link, useLocation } from "react-router-dom";
import { Home, Store, ClipboardList, User, ShoppingCart, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useCartStore } from "../../stores/cartStore";
import { useChatStore } from "../../stores/chatStore";
import CartDrawer from "../cart/CartDrawer";
import ChatPopup from "../chat/ChatPopup";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
}

function NavItem({ icon: Icon, label, to }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors ${
        isActive
          ? "text-primary-600"
          : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <Icon className={`w-5 h-5 mb-1 ${isActive ? "stroke-[2.5]" : ""}`} />
      <span>{label}</span>
    </Link>
  );
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const { user, isAuthenticated } = useAuthStore();
  const {
    openCart,
    totalItems,
    getGuestCartCount,
    fetchCart,
    syncCart,
  } = useCartStore();

  const cartCount = isAuthenticated ? totalItems : getGuestCartCount();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  useEffect(() => {
    if (isAuthenticated && getGuestCartCount() > 0) {
      syncCart();
    }
  }, [isAuthenticated]);

  const { toggleChat, isOpen: isChatOpen } = useChatStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                A-Commerce
              </h1>
              <p className="text-[10px] text-gray-400 leading-tight">
                ร้านโชห่วย ABC
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                to="/profile"
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="text-sm text-primary-600 font-semibold hover:text-primary-700 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
            )}

            <button
              onClick={openCart}
              className="relative w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-2xl mx-auto pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-100">
        <div className="max-w-2xl mx-auto flex">
          <NavItem icon={Home} label="หน้าแรก" to="/" />
          <NavItem icon={Store} label="ร้านค้า" to="/" />
          {isAuthenticated && (
            <>
              <NavItem icon={ClipboardList} label="คำสั่งซื้อ" to="/orders" />
              <NavItem icon={User} label="โปรไฟล์" to="/profile" />
            </>
          )}
        </div>
      </nav>

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Popup */}
      <ChatPopup />

      {/* Cart Drawer */}
      <CartDrawer />
    </div>
  );
}
