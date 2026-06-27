import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Brands from "./pages/Brands";
import Deals from "./pages/Deals";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Wishlist from "./pages/Wishlist";
import Account from "./pages/Account";
import OrderSuccess from "./pages/Ordersuccess";
import Admin from "./pages/Admin";
import SignIn from "./pages/Signin";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

const ForgotPassword = () => (
  <div className="p-10 text-center text-muted-foreground">Forgot Password — coming soon</div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "products", Component: Products },
      { path: "products/:slug", Component: ProductDetail },
      { path: "brands", Component: Brands },
      { path: "deals", Component: Deals },
      { path: "cart", Component: Cart },
      { path: "wishlist", Component: Wishlist },
      { path: "login", Component: SignIn },
      { path: "signup", Component: SignUp },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "order-success", Component: OrderSuccess },
      { path: "*", Component: NotFound },

      // 🔒 Protected customer routes
      {
        Component: ProtectedRoute,
        children: [
          { path: "checkout", Component: Checkout },
          { path: "account", Component: Account },
        ],
      },

      // 🛑 Admin routes
      {
        Component: AdminRoute,
        children: [
          { path: "admin", Component: Admin },
        ],
      },
    ],
  },
]);