import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CartProvider } from './contexts/CartContext';
import { CartSidebar } from './components/CartSidebar';
import { MobileNavigation } from './components/MobileNavigation';
import { ErrorBoundary } from './components/ErrorBoundary';

// 用戶界面頁面
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { FlavorsPage } from './pages/FlavorsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import OrderQueryPage from './pages/OrderQueryPage';

// 管理界面頁面
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminWebsiteSettings } from './pages/admin/AdminWebsiteSettings';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminProductCategories } from './pages/admin/AdminProductCategories';
import { AdminFlavors } from './pages/admin/AdminFlavors';
import { AdminFlavorCategories } from './pages/admin/AdminFlavorCategories';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements';
import { AdminChangePassword } from './pages/admin/AdminChangePassword';
import AdminUpsellProducts from './pages/admin/AdminUpsellProducts';
import { AdminCoupons } from './pages/admin/AdminCoupons';
// import { AdminFlavorCategories } from './pages/admin/AdminFlavorCategories';

// 管理界面保護路由組件
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <CartProvider>
        <Router>
          <div className="App">
            {/* 主要路由 */}
            <Routes>
              {/* 用戶界面路由 */}
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/flavors" element={<FlavorsPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/order-query" element={<OrderQueryPage />} />

              {/* 管理界面路由 */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedAdminRoute>
                    <AdminSettings />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/website-settings"
                element={
                  <ProtectedAdminRoute>
                    <AdminWebsiteSettings />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedAdminRoute>
                    <AdminProducts />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/product-categories"
                element={
                  <ProtectedAdminRoute>
                    <AdminProductCategories />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/flavors"
                element={
                  <ProtectedAdminRoute>
                    <AdminFlavors />
                  </ProtectedAdminRoute>
                }
              />
              {/* 隱藏規格類別管理路由 */}
              <Route
                path="/admin/flavor-categories"
                element={
                  <ProtectedAdminRoute>
                    <AdminFlavorCategories />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedAdminRoute>
                    <AdminOrders />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/coupons"
                element={
                  <ProtectedAdminRoute>
                    <AdminCoupons />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedAdminRoute>
                    <AdminAnnouncements />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/upsell-products"
                element={
                  <ProtectedAdminRoute>
                    <AdminUpsellProducts />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/change-password"
                element={
                  <ProtectedAdminRoute>
                    <AdminChangePassword />
                  </ProtectedAdminRoute>
                }
              />

              {/* 默認重定向 */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* 購物車側邊欄 */}
            <CartSidebar />

            {/* 移動端底部導航 */}
            <MobileNavigation />

            {/* 全局通知 */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'white',
                  color: 'black',
                  border: '1px solid #e5e7eb',
                },
              }}
            />
          </div>
        </Router>
      </CartProvider>
    </ErrorBoundary>
  );
}

export default App;
