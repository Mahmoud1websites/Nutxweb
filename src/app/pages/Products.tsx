import { Filter, LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import ProductCard from "../components/ProductCard";
import { useLanguage } from "../i18n/LanguageContext";

// Replace with your real API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  parent_id?: string | null;
}

export default function Products() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [liveCategories, setLiveCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const SORT_OPTIONS = [
    { value: "featured", label: t("prod_featured") },
    { value: "price_asc", label: t("prod_price_asc") },
    { value: "price_desc", label: t("prod_price_desc") },
    { value: "rating", label: t("prod_top_rated") },
    { value: "newest", label: t("prod_newest") },
  ];

  // Client-side specific filter states
  const [priceMax, setPriceMax] = useState(3000);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Unified state parameters
  const categoryParam = searchParams.get("category") ?? "";
  const sortParam = searchParams.get("sort") ?? "newest";
  const searchQuery = searchParams.get("search") ?? "";
  const badgeParam = searchParams.get("badge") ?? "";

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const data = await res.json();
        if (data.success) {
          setLiveCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load live categories", err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setErrorMsg("");
      try {
        const urlParams = new URLSearchParams();
        if (categoryParam) urlParams.set("category", categoryParam);
        if (searchQuery) urlParams.set("search", searchQuery);
        if (sortParam) urlParams.set("sort", sortParam);

        urlParams.set("limit", "100");

        const res = await fetch(`${API_BASE_URL}/products?${urlParams.toString()}`);
        const data = await res.json();

        if (data.success) {
          setLiveProducts(data.products || []);
        } else {
          setErrorMsg(data.error || "Failed to parse database records.");
        }
      } catch (err: any) {
        setErrorMsg(t("prod_network_error"));
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [categoryParam, searchQuery, sortParam]);

  function setCategory(slug: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) next.set("category", slug);
      else next.delete("category");
      return next;
    });
  }

  function setSort(val: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sort", val);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let result = [...liveProducts];

    if (badgeParam) {
      result = result.filter((p) => p.badge === badgeParam);
    }
    result = result.filter((p) => (p.price ?? 0) <= priceMax);
    if (minRating > 0) {
      result = result.filter((p) => (p.avgRating || p.rating || 0) >= minRating);
    }
    if (inStockOnly) {
      result = result.filter((p) => p.inStock);
    }

    return result;
  }, [liveProducts, badgeParam, priceMax, minRating, inStockOnly]);

  const activeFilters = useMemo(() => {
    const filters = [];
    if (categoryParam) {
      filters.push({
        key: "category",
        label: liveCategories.find(c => c.slug === categoryParam)?.name || categoryParam,
        clear: () => setCategory("")
      });
    }
    if (searchQuery) {
      filters.push({
        key: "search",
        label: `"${searchQuery}"`,
        clear: () => setSearchParams((p) => {
          const n = new URLSearchParams(p);
          n.delete("search");
          return n;
        })
      });
    }
    return filters;
  }, [categoryParam, searchQuery, liveCategories]);

  const Filters = () => (
    <div className="flex flex-col gap-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-foreground text-sm mb-3">{t("prod_category")}</h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setCategory("")}
            className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${!categoryParam ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            {t("prod_all_products")}
          </button>
          {liveCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.slug)}
              className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${categoryParam === cat.slug ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">{t("prod_max_price")}</h3>
          <span className="text-sm font-semibold text-primary">${priceMax.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={10}
          max={3000}
          step={10}
          value={priceMax}
          onChange={(e) => setPriceMax(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>$10</span>
          <span>$3,000</span>
        </div>
      </div>

      {/* Rating */}
      <div>
        <h3 className="font-semibold text-foreground text-sm mb-3">{t("prod_min_rating")}</h3>
        <div className="flex flex-col gap-1">
          {[0, 4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={`text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${minRating === r ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {r === 0 ? (
                t("prod_any_rating")
              ) : (
                <>
                  <span className="text-primary">{"★".repeat(Math.floor(r))}</span>
                  {r}+ {t("prod_stars_up")}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* In Stock */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`w-10 h-5 rounded-full transition-colors relative ${inStockOnly ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${inStockOnly ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{t("prod_in_stock_only")}</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-foreground">
          {categoryParam ? (
            liveCategories.find(c => c.slug === categoryParam)?.name || categoryParam
          ) : searchQuery ? (
            `${t("prod_search_results")} "${searchQuery}"`
          ) : (
            t("prod_all_products")
          )}
        </h1>
        <p className="text-muted-foreground mt-1">
          {loading ? t("prod_loading_items") : `${filtered.length} ${t("prod_products_found")}`}
        </p>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.clear}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              {f.label} <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <Filters />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("prod_filters")}
            </button>

            <div className="flex-1" />

            {/* Sort */}
            <select
              value={sortParam}
              onChange={(e) => setSort(e.target.value)}
              className="bg-muted text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* View mode */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications */}
          {errorMsg && (
            <div className="text-center py-12 text-destructive font-medium">{errorMsg}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground animate-pulse text-sm font-medium">
              {t("prod_updating_gallery")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="text-5xl">🔍</div>
              <h3 className="text-xl font-bold text-foreground">{t("prod_no_products_found")}</h3>
              <p className="text-muted-foreground">{t("prod_adjust_filters")}</p>
              <button
                onClick={() => { setSearchParams({}); setPriceMax(3000); setMinRating(0); setInStockOnly(false); }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {t("prod_clear_filters")}
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((p) => (
                <div key={p.id} className="flex gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                  <img src={p.image || p.images?.[0]} alt={p.name} className="w-28 h-28 object-cover rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {typeof p.category === 'object' ? p.category?.name : (p.category || t("prod_general"))}
                    </p>
                    <h3 className="font-bold text-foreground mt-0.5 truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="font-bold text-foreground text-lg">${(p.price ?? 0).toFixed(2)}</span>
                      {p.compareAtPrice > 0 && <span className="text-sm text-muted-foreground line-through">${p.compareAtPrice.toFixed(2)}</span>}
                      <span className="text-sm text-muted-foreground">★ {p.avgRating || p.rating || 0} ({(p.reviewCount || 0).toLocaleString()})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-background shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-foreground flex items-center gap-2"><Filter className="w-4 h-4" /> {t("prod_filters")}</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Filters />
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-full mt-6 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              {t("prod_apply_filters")} ({filtered.length} {t("prod_results")})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}