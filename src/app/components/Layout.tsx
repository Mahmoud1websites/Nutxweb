import {
  ChevronDown,
  Heart,
  Menu,
  Moon,
  Search,
  ShoppingCart,
  Sun,
  User,
  X,
  Phone,
  LogIn,
  Languages,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useStore } from "../store";
import { useLanguage } from "../i18n/LanguageContext";

// Replace with your real API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

function AcornMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2c1.5 1.5 2.5 3 2.5 4.5 0 .5-.1 1-.3 1.5 2.3.4 4.3 1.8 5.3 3.9-1.4-.4-2.9-.3-4.2.3 1.6 1.2 2.7 3 2.7 5.1 0 3.7-3.5 5.7-6 5.7s-6-2-6-5.7c0-2.1 1.1-3.9 2.7-5.1-1.3-.6-2.8-.7-4.2-.3 1-2.1 3-3.5 5.3-3.9-.2-.5-.3-1-.3-1.5C9.5 5 10.5 3.5 12 2Z"
        fill="currentColor"
      />
      <path
        d="M9.5 8c1.6.6 3.4.6 5 0"
        stroke="var(--color-background-primary)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Layout() {
  const { state, dispatch, cartCount, user, signOut } = useStore();
  const { lang, toggleLang, t } = useLanguage();

  const isLoggedIn: boolean = !!user;
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Manage real categories fetched from the database
  const [liveCategories, setLiveCategories] = useState<Category[]>([]);

  const navigate = useNavigate();
  const shopRef = useRef<HTMLDivElement>(null);

  // Close shop dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) {
        setShopOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 2. Fetch official categories from the database API on component mount
  useEffect(() => {
    async function fetchDatabaseCategories() {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const data = await res.json();
        if (data.success) {
          setLiveCategories(data.categories);
        }
      } catch (err) {
        console.error("Failed loading layout database categories:", err);
      }
    }
    fetchDatabaseCategories();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMenuOpen(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Announcement bar */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-xs font-medium tracking-wide">
        {t("announcement")}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-16 gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-2 group">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform duration-300 group-hover:rotate-12">
              <AcornMark className="w-4.5 h-4.5" />
            </div>
            <span
              className="text-2xl text-foreground tracking-tight"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
            >
              NUTX
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Home */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              {t("nav_home")}
            </NavLink>

            {/* Shop dropdown */}
            <div className="relative" ref={shopRef}>
              <button
                onClick={() => setShopOpen((v) => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${shopOpen
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                {t("nav_shop")}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${shopOpen ? "rotate-180" : ""}`}
                />
              </button>

              {shopOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-2">
                    <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("nav_browse_category")}
                    </p>

                    {/* Fallback to local keys if data hasn't fully arrived yet */}
                    {(liveCategories.length > 0 ? liveCategories : []).map((cat) => (
                      <Link
                        key={cat.id}
                        // 3. Changed from query param to match your server backend's `category slug` requirement
                        to={`/products?category=${encodeURIComponent(cat.slug)}`}
                        onClick={() => setShopOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}

                    <div className="mt-2 pt-2 border-t border-border">
                      <Link
                        to="/products"
                        onClick={() => setShopOpen(false)}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        {t("nav_view_all_products")}
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gift Boxes */}
            <NavLink
              to="/gift-boxes"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              {t("nav_gift_boxes")}
            </NavLink>

            {/* Deals */}
            <NavLink
              to="/deals"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "text-primary bg-primary/10 font-semibold"
                  : "text-6F4E37 hover:text-6F4E37 hover:bg-6F4E37-50 font-semibold"
                }`
              }
            >
              {t("nav_offers")}
            </NavLink>
          </nav>

          {/* ── Search — desktop ── */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search_placeholder")}
                className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </form>

          {/* ── Actions ── */}
          <div className="flex items-center gap-1 ml-auto">

            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
              aria-label="Toggle language"
              title={lang === "en" ? "العربية" : "English"}
            >
              <span className="text-xs font-bold">{lang === "en" ? "AR" : "EN"}</span>
            </button>

            {/* Dark mode */}
            <button
              onClick={() => dispatch({ type: "TOGGLE_DARK_MODE" })}
              className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
              aria-label={t("action_wishlist")}
            >
              <Heart className="w-4 h-4" />
              {state.wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                  {state.wishlist.length}
                </span>
              )}
            </Link>

            {/* Profile icon & Sign Out */}
            {isLoggedIn && (
              <div className="flex items-center gap-1">
                <Link
                  to="/account"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                  aria-label={t("action_account")}
                >
                  <User className="w-4 h-4" />
                </Link>

                <button
                  onClick={signOut}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  {t("action_logout")}
                </button>
              </div>
            )}

            {/* Cart Component Link */}
            <Link
              to={isLoggedIn ? "/cart" : "/login"}
              className="relative flex items-center gap-2 pl-3 pr-3.5 h-9 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md"
              aria-label={t("action_cart")}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:block">{t("action_cart")}</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 bg-white text-primary text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-primary">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Sign In — ONLY for guests */}
            {!isLoggedIn && (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-1.5 pl-3 pr-3 h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t("action_sign_in")}
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-4">
            {/* Search */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("search_placeholder")}
                  className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </form>

            <nav className="flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t("nav_home")}
              </Link>

              {/* Shop section in mobile */}
              <div>
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("mobile_shop_by_category")}
                </p>
                {liveCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${encodeURIComponent(cat.slug)}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
                <Link
                  to="/products"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors block"
                >
                  {t("nav_view_all_products")}
                </Link>
              </div>

              <Link
                to="/gift-boxes"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t("nav_gift_boxes")}
              </Link>

              <Link
                to="/brands"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t("mobile_brands")}
              </Link>

              <Link
                to="/deals"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-orange-500 hover:bg-orange-50 transition-colors"
              >
                {t("mobile_deals")}
              </Link>

              {/* Sign In for guest on mobile */}
              {!isLoggedIn && (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  {t("action_sign_in_to_order")}
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                <AcornMark className="w-4.5 h-4.5" />
              </div>
              <span
                className="text-lg text-foreground"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
              >
                NUTX
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {t("footer_tagline")}
            </p>
           
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">{t("footer_shop")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {liveCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/products?category=${encodeURIComponent(cat.slug)}`}
                    className="hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">{t("footer_my_account")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { label: t("footer_sign_in"), to: "/login" },
                { label: t("footer_create_account"), to: "/signup" },
                { label: t("footer_order_history"), to: "/account" },
                { label: t("footer_saved_items"), to: "/wishlist" },
                { label: t("footer_shopping_cart"), to: "/cart" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">{t("footer_support")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                t("footer_help_center"),
                t("footer_shipping"),
                t("footer_returns"),
                t("footer_contact"),
                t("footer_installation"),
                t("footer_warranty"),
              ].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} NUTX. {t("footer_rights")}</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary transition-colors">{t("footer_privacy")}</a>
            <a href="#" className="hover:text-primary transition-colors">{t("footer_terms")}</a>
            <a href="#" className="hover:text-primary transition-colors">{t("footer_cookies")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}