import { ChevronRight, Heart, Minus, Plus, Share2, ShoppingCart, Star, Truck } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import ProductCard from "../components/ProductCard";
import { useStore } from "../store";
import { supabase } from "../config/supabaseClient";
import { useLanguage } from "../i18n/LanguageContext";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// Turns a raw gram count into a friendly label: 250 -> "250g", 1000 -> "1kg", 1500 -> "1.5kg"
function formatWeight(grams: number): string {
  if (!grams) return "";
  if (grams < 1000) return `${grams}g`;
  const kg = grams / 1000;
  return `${kg % 1 === 0 ? kg : kg.toFixed(2)}kg`;
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5 14.4c-.3-.1-1.7-.9-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3Z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-3-1.3-4.6 0-4.5 3.7-8.2 8.2-8.2s8.2 3.7 8.2 8.2-3.6 8.3-8.2 8.3Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 12.06C22 6.5 17.5 2 12 2S2 6.5 2 12.06c0 5 3.7 9.1 8.4 9.9v-7H7.9v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7c4.7-.8 8.4-4.9 8.4-9.9Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.7 10.6 20.3 3h-1.6l-5.7 6.6L8.5 3H3l6.9 10-6.9 8h1.6l6-7 4.8 7H21l-7.3-10.4Zm-2.1 2.5-.7-1L5.4 4.2h2.5l4.5 6.4.7 1 5.8 8.3h-2.5l-4.8-6.8Z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.42 1.41" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-2.83 2.83a5 5 0 0 0 7.07 7.07l1.41-1.41" />
    </svg>
  );
}
interface Variant {
  id: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  weight_grams?: number | null;
  price: string;
  compare_at_price?: string | null;
  inventory?: { quantity: number; low_stock_threshold: number }[];
}

interface ReviewT {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  created_at: string;
  is_verified: boolean;
  profiles?: { full_name: string; avatar_url?: string };
}

interface ProductDetailData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  sold_by_weight?: boolean;
  categories?: { id: string; name: string; slug: string };
  product_images: { id: string; url: string; alt_text?: string; is_primary: boolean }[];
  product_variants: Variant[];
  reviews: ReviewT[];
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { dispatch, isInWishlist, products: relatedPool, syncAddToCart } = useStore();
  const { t, lang } = useLanguage();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);

  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "reviews" | "specs">("description");
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/products/${slug}`)
      .then(res => res.json())
      .then(json => {
        if (!json.success || !json.product) { setNotFound(true); return; }
        const prod: ProductDetailData = json.product;
        setProduct(prod);

        const variants = prod.product_variants || [];
        const ordered = prod.sold_by_weight
          ? [...variants].sort((a, b) => (a.weight_grams ?? 0) - (b.weight_grams ?? 0))
          : variants;

        const getQty = (v: any) =>
          Array.isArray(v.inventory) ? (v.inventory[0]?.quantity ?? 0) : (v.inventory?.quantity ?? 0);
        const firstInStock =
          ordered.find(v => getQty(v) > 0) || ordered[0];
        setSelectedVariantId(firstInStock?.id ?? "");
        setQuantity(1);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const weightVariants = useMemo(() => {
    if (!product?.sold_by_weight) return [];
    return [...(product.product_variants || [])].sort(
      (a, b) => (a.weight_grams ?? 0) - (b.weight_grams ?? 0)
    );
  }, [product]);

  const selectedVariant = useMemo(
    () => product?.product_variants?.find(v => v.id === selectedVariantId),
    [product, selectedVariantId]
  );

  const price = selectedVariant ? parseFloat(selectedVariant.price) : 0;
  const comparePrice = selectedVariant?.compare_at_price ? parseFloat(selectedVariant.compare_at_price) : 0;
  const hasDiscount = comparePrice > price;
  const discount = hasDiscount ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  const stock = Array.isArray(selectedVariant?.inventory)
    ? (selectedVariant.inventory[0]?.quantity ?? 0)
    : ((selectedVariant as any)?.inventory?.quantity ?? 0);

  const inStock = stock > 0;
  const quantityAvailable = quantity > 0 && quantity <= stock;

  const pricePerKg =
    product?.sold_by_weight && selectedVariant?.weight_grams
      ? price / (selectedVariant.weight_grams / 1000)
      : null;

  const avgRating = useMemo(() => {
    if (!product?.reviews?.length) return 0;
    return product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
  }, [product]);

  const images = product?.product_images?.length
    ? [...product.product_images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    : [];

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return (relatedPool || [])
      .filter((p: any) => p.category?.id === product.categories?.id && p.id !== product.id)
      .slice(0, 4);
  }, [relatedPool, product]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t("pd_loading")}</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-2xl font-bold text-foreground">{t("pd_not_found")}</p>
        <Link to="/products" className="text-primary hover:underline">{t("pd_back_to_products")}</Link>
      </div>
    );
  }

  const p: ProductDetailData = product;
  const inWishlist = isInWishlist(p.id);

  function handleAddToCart() {
    if (!selectedVariantId) {
      toast.error(t("pd_select_option"));
      return;
    }
    if (!inStock || !quantityAvailable) {
      toast.error(t("pd_not_available_qty"));
      return;
    }
    const weightLabel =
      p.sold_by_weight && selectedVariant?.weight_grams
        ? formatWeight(selectedVariant.weight_grams)
        : undefined;

    syncAddToCart(p.id, selectedVariantId); // ← now actually persists to the backend
    toast.success(`${weightLabel ? weightLabel + " " : ""}${t("pd_added_to_cart")}`, { description: p.name });
  }
  function handleBuyNow() {
    handleAddToCart();
    navigate("/checkout");
  }

  function getShareUrl() {
    return window.location.href;
  }

  async function handleNativeShare() {
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: p.name, text: p.name, url });
      } catch {
        // user cancelled — no-op
      }
    } else {
      setShareOpen((v) => !v);
    }
  }

  function shareToWhatsApp() {
    const url = getShareUrl();
    const text = `${p.name} — ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  }

  function shareToFacebook() {
    const url = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  }

  function shareToX() {
    const url = getShareUrl();
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.name)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShareOpen(false);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success(t("pd_link_copied"));
    } catch {
      toast.error(t("pd_link_copy_failed"));
    }
    setShareOpen(false);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewRating) { toast.error(t("pd_select_rating")); return; }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) { toast.error(t("pd_login_to_review")); return; }

    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: p.id,
          rating: reviewRating,
          comment: reviewComment || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(t("pd_review_submitted"));
      setReviewRating(0);
      setReviewComment("");



      const updated = await fetch(`/api/products/${slug}`).then(r => r.json());
      if (updated.success) setProduct(updated.product);
    } catch (err: any) {
      toast.error(err.message || t("pd_review_failed"));
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary transition-colors">{t("pd_home")}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/products" className="hover:text-primary transition-colors">{t("pd_products")}</Link>
        {p.categories && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link
              to={`/products?category=${encodeURIComponent(p.categories.slug)}`}
              className="hover:text-primary transition-colors"
            >
              {p.categories.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground truncate max-w-[200px]">{p.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 mb-16">

        {/* Images */}
        <div className="flex flex-col gap-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted relative">
            <img
              src={images[selectedImage]?.url || "https://placehold.co/600x600?text=No+Image"}
              alt={images[selectedImage]?.alt_text || p.name}
              className="w-full h-full object-cover"
            />
            {hasDiscount && (
              <span className="absolute top-4 left-4 text-xs font-bold px-2.5 py-1 rounded-full bg-primary text-white">
                -{discount}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt_text || `${p.name} view ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-1">
              {p.categories?.name || p.brand}
            </p>
            <h1 className="text-3xl font-black text-foreground leading-tight">{p.name}</h1>

            {/* Rating row */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-4 h-4"
                    fill={star <= Math.round(avgRating) ? "#f97316" : "none"}
                    stroke={star <= Math.round(avgRating) ? "#f97316" : "currentColor"}
                  />
                ))}
              </div>
              <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
              <button
                onClick={() => setActiveTab("reviews")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {p.reviews.length} {t("pd_reviews_count")}
              </button>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inStock ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  }`}
              >
                {inStock ? `${t("pd_in_stock")} (${stock} ${t("pd_available")})` : t("pd_out_of_stock")}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl font-black text-foreground">${price.toFixed(2)}</span>
            {hasDiscount && (
              <>
                <span className="text-xl text-muted-foreground line-through">${comparePrice.toFixed(2)}</span>
                <span className="bg-primary/10 text-primary text-sm font-bold px-2 py-0.5 rounded-full">
                  {t("pd_save")} ${(comparePrice - price).toFixed(2)}
                </span>
              </>
            )}
            {pricePerKg !== null && (
              <span className="text-sm text-muted-foreground">
                (${pricePerKg.toFixed(2)} {t("pd_per_kg")})
              </span>
            )}
          </div>

          {/* Weight selector */}
          {p.sold_by_weight && weightVariants.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">{t("pd_weight")}</p>
              <div className="flex flex-wrap gap-2">
                {weightVariants.map((v) => {
                  const vStock = Array.isArray(v.inventory) ? (v.inventory[0]?.quantity ?? 0) : ((v as any).inventory?.quantity ?? 0);
                  const disabled = vStock <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariantId(v.id); setQuantity(1); }}
                      disabled={disabled}
                      className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${selectedVariantId === v.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        } ${disabled ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                    >
                      {formatWeight(v.weight_grams || 0)}
                    </button>
                  );
                })}
              </div>
              {!inStock && (
                <p className="text-xs text-red-500 mt-2">{t("pd_weight_out_of_stock")}</p>
              )}
            </div>
          )}

          {/* Quantity stepper */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">{t("pd_quantity")}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold text-foreground">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(stock, q + 1))}
                disabled={quantity >= stock}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {inStock && !quantityAvailable && (
              <p className="text-xs text-red-500 mt-2">{t("pd_only_left").replace("{n}", String(stock))}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!inStock || !quantityAvailable}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              {t("pd_add_to_cart")}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!inStock || !quantityAvailable}
              className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background font-semibold py-3 px-6 rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {t("pd_buy_now")}
            </button>
            <button
              onClick={() => {
                dispatch({ type: "TOGGLE_WISHLIST", productId: p.id });
                toast.success(inWishlist ? t("card_removed_wishlist") : t("card_saved_wishlist"));
              }}
              className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-colors ${inWishlist
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                }`}
            >
              <Heart className="w-5 h-5" fill={inWishlist ? "currentColor" : "none"} />
            </button>
            <div className="relative" ref={shareRef}>
              <button
                onClick={handleNativeShare}
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                aria-label={t("pd_share")}
              >
                <Share2 className="w-5 h-5" />
              </button>

              {shareOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <button
                    onClick={shareToWhatsApp}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                    {t("pd_share_whatsapp")}
                  </button>
                  <button
                    onClick={shareToFacebook}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
                    {t("pd_share_facebook")}
                  </button>
                  <button
                    onClick={shareToX}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <XIcon className="w-4 h-4 text-foreground" />
                    {t("pd_share_x")}
                  </button>
                  <div className="border-t border-border" />
                  <button
                    onClick={copyShareLink}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    {t("pd_share_copy_link")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Delivery note */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl text-sm">
            <Truck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">
              {t("pd_delivery_note")}{" "}
              <strong className="text-foreground">{t("pd_business_days")}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-16">
        <div className="flex gap-1 border-b border-border mb-8">
          {(["description", "reviews", "specs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab === "description" ? t("pd_tab_description") : tab === "reviews" ? t("pd_tab_reviews") : t("pd_tab_specs")}
              {tab === "reviews" && ` (${p.reviews.length})`}
            </button>
          ))}
        </div>

        {activeTab === "description" && (
          <div className="max-w-2xl">
            <p className="text-muted-foreground leading-relaxed">
              {p.description || t("pd_no_description")}
            </p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            {/* Rating summary */}
            <div className="flex items-center gap-6 mb-8 p-6 bg-card border border-border rounded-2xl">
              <div className="text-center">
                <div className="text-5xl font-black text-foreground">{avgRating.toFixed(1)}</div>
                <div className="flex justify-center my-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-4 h-4"
                      fill={s <= Math.round(avgRating) ? "#f97316" : "none"}
                      stroke={s <= Math.round(avgRating) ? "#f97316" : "currentColor"}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{p.reviews.length} {t("pd_reviews_count")}</p>
              </div>
            </div>

            {/* Submit review form */}
            <div className="mb-8 p-6 bg-card border border-border rounded-2xl">
              <h3 className="font-bold text-foreground text-base mb-4">{t("pd_write_review")}</h3>
              <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">{t("pd_your_rating")} <span className="text-red-500">*</span></p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHover(star)}
                        onMouseLeave={() => setReviewHover(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className="w-7 h-7"
                          fill={(reviewHover || reviewRating) >= star ? "#f97316" : "none"}
                          stroke={(reviewHover || reviewRating) >= star ? "#f97316" : "currentColor"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

             

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">{t("pd_review_comment_label")}</label>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder={t("pd_review_comment_placeholder")}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview || !reviewRating}
                  className="self-start px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submittingReview ? t("pd_submitting") : t("pd_submit_review")}
                </button>
              </form>
            </div>

            {/* Review list */}
            {p.reviews.length > 0 ? (
              <div className="space-y-4">
                {p.reviews.map((review) => (
                  <div key={review.id} className="p-5 bg-card border border-border rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/20 text-primary font-bold rounded-full flex items-center justify-center text-sm">
                          {review.profiles?.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {review.profiles?.full_name || t("pd_anonymous")}
                            </span>
                            {review.is_verified && (
                              <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-medium">
                                {t("pd_verified")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className="w-3 h-3"
                                fill={s <= review.rating ? "#f97316" : "none"}
                                stroke={s <= review.rating ? "#f97316" : "currentColor"}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString(lang === "ar" ? "ar-LB" : "en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>
                   
                    {review.comment && (
                      <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t("pd_no_reviews")}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "specs" && (
          <div className="max-w-lg">
            <table className="w-full text-sm">
              <tbody>
                {[
                  [t("pd_spec_brand"), p.brand || "—"],
                  [t("pd_spec_category"), p.categories?.name || "—"],
                  [t("pd_spec_rating"), `${avgRating.toFixed(1)} / 5.0`],
                  [t("pd_spec_total_reviews"), p.reviews.length],
                  [t("pd_spec_in_stock"), inStock ? `${t("pd_yes")} (${stock} ${t("pd_available")})` : t("pd_no")],
                  ...(p.sold_by_weight && selectedVariant?.weight_grams
                    ? [[t("pd_spec_weight"), formatWeight(selectedVariant.weight_grams)]]
                    : []),
                  ...(pricePerKg !== null ? [[t("pd_spec_price_per_kg"), `$${pricePerKg.toFixed(2)}`]] : []),
                  [t("pd_spec_sku"), selectedVariant?.sku || "—"],
                ].map(([key, val]) => (
                  <tr key={String(key)} className="border-b border-border">
                    <td className="py-3 pr-4 font-semibold text-foreground w-36">{key}</td>
                    <td className="py-3 text-muted-foreground">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-black text-foreground mb-6">{t("pd_related_products")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.map((rp: any) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}