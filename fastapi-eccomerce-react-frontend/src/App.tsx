import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/home/Home"
import RegisterPage from "./pages/register/Register"
import LoginPage from "./pages/login/Login"
import AuthSuccessPage from "./pages/authSuccess/AuthSuccess"
import AuthErrorPage from "./pages/AuthError/AuthError"
import CategoriesPage from "./pages/categories/CategoryPage"
import ProductsPage from "./pages/products/ProductPage"
import ProductDetailsPage from "./pages/productDetails/ProductDetails"
import ForgotPasswordPage from "./pages/forgot-password/ForgotPassword"
import ResetPasswordPage from "./pages/reset-password/ResetPassword"
import ProfilePage from "./pages/profile/Profile"
import CartPage from "./pages/cart/Cart"
import PaymentSuccessPage from "./pages/paymentSuccess/PaymentSuccess"
import PaymentCancelPage from "./pages/paymentCancel/PaymentCancel"
import MyOrdersPage from "./pages/orders/MyOrders"
import { ProtectedRoute } from "./services/routes-protection"
import DeliveryDashboard from "./pages/deliveryDashboard/DeliveryDashboard"
import AdminDashboard from "./pages/admin/adminDashboard/AdminDashboard"
import AdminCategoriesPage from "./pages/admin/adminCategories/AdminCategories"
import AdminProductsPage from "./pages/admin/adminProductList/AdminProductsList"
import AddProductPage from "./pages/admin/addProduct/AddProduct"
import EditProductPage from "./pages/admin/editProduct/EditProduct"
import AdminOrdersPage from "./pages/admin/adminOrders/AdminOrders"
import AdminRegister from "./pages/admin/adminRegister/AdminRegister"

function App() {

  return (
    <BrowserRouter>
      <Navbar />

      <main>
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
          <Route path="/auth-success" element={<AuthSuccessPage />} />
          <Route path="/auth-error" element={<AuthErrorPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<PaymentCancelPage />} />



          {/* CUSTOMER OR LOGGED IN USERS AUTHENTICATED ROUTES */}
          < Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<MyOrdersPage />} />
          </Route>


          {/* DELIVERY USER ROUTES */}
          < Route element={<ProtectedRoute allowedRoles={["DELIVERY", "ADMIN"]} />}>
            <Route path="/delivery" element={<DeliveryDashboard />} />
          </Route>


          {/* ADMIN ROUTES */}
          < Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/add" element={<AddProductPage />} />
            <Route path="/admin/products/edit/:id" element={<EditProductPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/register" element={<AdminRegister />} />
          </Route>




          {/* WILDCARD ROUTE (404 Fallback) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />

    </BrowserRouter>
  )
}

export default App
