import { ChevronRight, Heart, Minus, Plus, Share2, ShoppingCart, Star, Truck } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import ProductCard from "../components/ProductCard";
import { useStore } from "../store";
import { supabase } from "../config/supabaseClient";


const API_BASE = "/api";
interface Variant {
  id: string;
  sku: string;
  size?: string | null;
  color?: string | null;
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
  categories?: { id: string; name: string; slug: string };
  product_images: { id: string; url: string; alt_text?: string; is_primary: boolean }[];
  product_variants: Variant[];
  reviews: ReviewT[];
}

export default function ProductDetail() {
  const { slug } = useParams(); // ✅ Grabs 'slug' from the URL instead of 'id'
  const navigate = useNavigate();
  const { dispatch, isInWishlist, products: relatedPool } = useStore();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "reviews" | "specs">("description");



  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/products/${slug}`)
      .then(res => res.json())
      .then(json => {
        if (!json.success || !json.product) { setNotFound(true); return; }
        setProduct(json.product);
        const firstInStockVariant = json.product.product_variants?.find(
          (v: Variant) => (v.inventory?.[0]?.quantity ?? 0) > 0
        ) || json.product.product_variants?.[0];
        setSelectedVariantId(firstInStockVariant?.id ?? "");
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]); // ✅ Re-run effect when the slug changes

  const selectedVariant = useMemo(
    () => product?.product_variants?.find(v => v.id === selectedVariantId),
    [product, selectedVariantId]
  );

  const price = selectedVariant ? parseFloat(selectedVariant.price) : 0;
  const comparePrice = selectedVariant?.compare_at_price ? parseFloat(selectedVariant.compare_at_price) : 0;
  const hasDiscount = comparePrice > price;
  const discount = hasDiscount ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const stockCount = Array.isArray(selectedVariant?.inventory)
    ? (selectedVariant.inventory[0]?.quantity ?? 0)
    : ((selectedVariant?.inventory as any)?.quantity ?? 0);

  const inStock = stockCount > 0;

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

  // ── Early returns ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading product…</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-2xl font-bold text-foreground">Product not found</p>
        <Link to="/products" className="text-primary hover:underline">Back to Products</Link>
      </div>
    );
  }

  // TypeScript now knows `product` is non-null past this point
  const p: ProductDetailData = product;
  const inWishlist = isInWishlist(p.id);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAddToCart() {
    if (!selectedVariantId) {
      toast.error("Please select an option");
      return;
    }
    if (!inStock) {
      toast.error("This item is out of stock");
      return;
    }
    for (let i = 0; i < quantity; i++) {
      dispatch({ type: "ADD_TO_CART", productId: p.id, variantId: selectedVariantId });
    }
    toast.success(`${quantity}× added to cart`, { description: p.name });
  }

  function handleBuyNow() {
    handleAddToCart();
    navigate("/checkout");
  }































  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewRating) { toast.error("Please select a star rating"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) { toast.error("You must be logged in to leave a review"); return; }

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
          title: reviewTitle || undefined,
          comment: reviewComment || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Review submitted!");
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      // Refresh product to show new review
      const updated = await fetch(`/api/products/${slug}`).then(r => r.json());
      if (updated.success) setProduct(updated.product);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }





































  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
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
                {p.reviews.length} reviews
              </button>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inStock ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  }`}
              >
                {inStock ? `In Stock (${stockCount})` : "Out of Stock"}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-foreground">${price.toFixed(2)}</span>
            {hasDiscount && (
              <>
                <span className="text-xl text-muted-foreground line-through">${comparePrice.toFixed(2)}</span>
                <span className="bg-primary/10 text-primary text-sm font-bold px-2 py-0.5 rounded-full">
                  Save ${(comparePrice - price).toFixed(2)}
                </span>
              </>
            )}
          </div>

          {/* Variant selector */}
          {p.product_variants?.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Options</p>
              <div className="flex flex-wrap gap-2">
                {p.product_variants.map((variant) => {
                  const vStock = variant.inventory?.[0]?.quantity ?? 0;
                  const label = [variant.color, variant.size].filter(Boolean).join(" / ") || variant.sku;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      disabled={vStock === 0}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${selectedVariantId === variant.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        } ${vStock === 0 ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Quantity</p>
            <div className="flex items-center">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center bg-muted rounded-l-lg border border-border hover:bg-muted/70 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 h-10 flex items-center justify-center bg-muted border-y border-border font-semibold text-foreground">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(stockCount || 1, quantity + 1))}
                className="w-10 h-10 flex items-center justify-center bg-muted rounded-r-lg border border-border hover:bg-muted/70 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!inStock}
              className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background font-semibold py-3 px-6 rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              Buy Now
            </button>
            <button
              onClick={() => {
                dispatch({ type: "TOGGLE_WISHLIST", productId: p.id });
                toast.success(inWishlist ? "Removed from wishlist" : "Saved to wishlist");
              }}
              className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-colors ${inWishlist
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                }`}
            >
              <Heart className="w-5 h-5" fill={inWishlist ? "currentColor" : "none"} />
            </button>
            <button className="w-12 h-12 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery note */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl text-sm">
            <Truck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">
              Free delivery on orders over $75 · Estimated{" "}
              <strong className="text-foreground">3–5 business days</strong>
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
              {tab}
              {tab === "reviews" && ` (${p.reviews.length})`}
            </button>
          ))}
        </div>

        {activeTab === "description" && (
          <div className="max-w-2xl">
            <p className="text-muted-foreground leading-relaxed">
              {p.description || "No description available."}
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
                <p className="text-sm text-muted-foreground">{p.reviews.length} reviews</p>
              </div>
            </div>

            {/* Submit review form */}
            <div className="mb-8 p-6 bg-card border border-border rounded-2xl">
              <h3 className="font-bold text-foreground text-base mb-4">Write a Review</h3>
              <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
                {/* Star picker */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Your Rating <span className="text-red-500">*</span></p>
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

                {/* Title */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Title</label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={e => setReviewTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Comment</label>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Tell others what you think about this product..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview || !reviewRating}
                  className="self-start px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submittingReview ? "Submitting…" : "Submit Review"}
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
                              {review.profiles?.full_name || "Anonymous"}
                            </span>
                            {review.is_verified && (
                              <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-medium">
                                Verified
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
                        {new Date(review.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>
                    {review.title && (
                      <p className="font-semibold text-foreground text-sm mb-1">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No reviews yet. Be the first to review this product.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "specs" && (
          <div className="max-w-lg">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Brand", p.brand || "—"],
                  ["Category", p.categories?.name || "—"],
                  ["Rating", `${avgRating.toFixed(1)} / 5.0`],
                  ["Total Reviews", p.reviews.length],
                  ["In Stock", inStock ? `Yes (${stockCount} units)` : "No"],
                  ["SKU", selectedVariant?.sku || "—"],
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
          <h2 className="text-2xl font-black text-foreground mb-6">You might also like</h2>
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