import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";

// Pages
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import OrderPayment from "./pages/OrderPayment";
import ProfilePage from "./pages/ProfilePage";

// Admin Pages
import DashboardPage from "./pages/admin/DashboardPage";
import MembersPage from "./pages/admin/MembersPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminOrderDetailPage from "./pages/admin/AdminOrderDetailPage";
import ChatbotSettingsPage from "./pages/admin/ChatbotSettingsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";

// Layouts
import CustomerLayout from "./components/layout/CustomerLayout";
import AdminLayout from "./components/layout/AdminLayout";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Admin Route - requires admin role
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Customer Routes (with layout) */}
      <Route
        path="/"
        element={
          <CustomerLayout>
            <HomePage />
          </CustomerLayout>
        }
      />

      {/* Protected Routes (require authentication) */}
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <CustomerLayout>
              <Checkout />
            </CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <CustomerLayout>
              <OrderHistory />
            </CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:orderId"
        element={
          <ProtectedRoute>
            <CustomerLayout>
              <OrderDetail />
            </CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:orderId/payment"
        element={
          <ProtectedRoute>
            <CustomerLayout>
              <OrderPayment />
            </CustomerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <CustomerLayout>
              <ProfilePage />
            </CustomerLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
        <Route path="chatbot" element={<ChatbotSettingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* Fallback - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
