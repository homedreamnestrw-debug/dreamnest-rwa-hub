import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import ScrollToTop from "@/components/ScrollToTop";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Account from "./pages/Account";
import Terms from "./pages/Terms";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import Orders from "./pages/admin/Orders";
import Customers from "./pages/admin/Customers";
import Analytics from "./pages/admin/Analytics";
import Stock from "./pages/admin/Stock";
import Suppliers from "./pages/admin/Suppliers";
import Invoices from "./pages/admin/Invoices";
import Expenses from "./pages/admin/Expenses";
import PurchaseOrders from "./pages/admin/PurchaseOrders";
import Settings from "./pages/admin/Settings";
import POS from "./pages/admin/POS";
import Staff from "./pages/admin/Staff";
import Finance from "./pages/admin/Finance";
import Messages from "./pages/admin/Messages";
import GiftVouchers from "./pages/GiftVouchers";
import GiftVoucherConfirmation from "./pages/GiftVoucherConfirmation";
import AdminGiftVouchers from "./pages/admin/GiftVouchers";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />

            {/* Auth */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Checkout */}
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
            <Route path="/account" element={<Account />} />
            <Route path="/wishlist" element={<Account />} />
            <Route path="/gift-vouchers" element={<GiftVouchers />} />
            <Route path="/gift-vouchers/confirmation/:code" element={<GiftVoucherConfirmation />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="staff">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<POS />} />
              <Route path="pos" element={<POS />} />
              <Route path="orders" element={<Orders />} />
              <Route path="customers" element={<Customers />} />
              <Route path="stock" element={<Stock />} />
              <Route path="products" element={<Navigate to="/admin/stock?tab=products" replace />} />
              <Route path="categories" element={<Navigate to="/admin/stock?tab=categories" replace />} />
              <Route path="locations" element={<Navigate to="/admin/stock?tab=locations" replace />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="messages" element={<Messages />} />
              <Route path="gift-vouchers" element={<AdminGiftVouchers />} />

              {/* Admin-only */}
              <Route path="dashboard" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
              <Route path="analytics" element={<ProtectedRoute requiredRole="admin"><Analytics /></ProtectedRoute>} />
              <Route path="suppliers" element={<ProtectedRoute requiredRole="admin"><Suppliers /></ProtectedRoute>} />
              <Route path="purchase-orders" element={<ProtectedRoute requiredRole="admin"><PurchaseOrders /></ProtectedRoute>} />
              <Route path="expenses" element={<ProtectedRoute requiredRole="admin"><Expenses /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
              <Route path="staff" element={<ProtectedRoute requiredRole="admin"><Staff /></ProtectedRoute>} />
              <Route path="finance" element={<ProtectedRoute requiredRole="admin"><Finance /></ProtectedRoute>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
