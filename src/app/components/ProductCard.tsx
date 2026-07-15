import { Heart, ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useStore } from "../store";
import { useLanguage } from "../i18n/LanguageContext";

// Shape returned by GET /api/products (see shapeProduct() in server.ts)
interface DbProduct {
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  slug: string;
  brand: string;
  category?: { id: string; name: string; name_en?: string; name_ar?: string; slug: string };
  image?: { url: string; alt_text?: string; is_primary?: boolean };
  price: number;
  compareAtPrice?: number;
  avgRating: number;
  reviewCount: number;
  defaultVariantId: string | null;
  variantCount: number;
}

interface Props {
  product: DbProduct;
}

export default function ProductCard({ product }: Props) {

  const { dispatch, isInWishlist, syncAddToCart } = useStore();
  const { t, lang } = useLanguage();
  const inWishlist = isInWishlist(product.id);

  // Pick the localized name/category, falling back to the base fields
  // in case a product hasn't been translated yet.
  const displayName =
    (lang === "ar" ? product.name_ar : product.name_en) || product.name;
  const displayCategory =
    (lang === "ar" ? product.category?.name_ar : product.category?.name_en) ||
    product.category?.name;

  const hasDiscount =
    !!product.compareAtPrice && product.compareAtPrice > product.price;
  const discount = hasDiscount
    ? Math.round(
      ((product.compareAtPrice! - product.price) / product.compareAtPrice!) *
      100
    )
    : 0;

  const isMultiVariant = product.variantCount > 1;


  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (isMultiVariant) return;
    syncAddToCart(product.id, product.defaultVariantId ?? undefined);
    toast.success(t("card_added_to_cart"), { description: displayName });
  }

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    dispatch({ type: "TOGGLE_WISHLIST", productId: product.id });
    toast.success(inWishlist ? t("card_removed_wishlist") : t("card_saved_wishlist"));
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Badge */}
      {hasDiscount && (
        <span className="absolute top-3 left-3 z-10 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
          -{discount}%
        </span>
      )}

      {/* Wishlist button */}
      <button
        onClick={handleToggleWishlist}
        className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${inWishlist
          ? "bg-primary text-white"
          : "bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-primary hover:bg-background"
          }`}
      >
        <Heart className="w-4 h-4" fill={inWishlist ? "currentColor" : "none"} />
      </button>

      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        <img
          src={product.image?.url || "https://placehold.co/400x400?text=No+Image"}
          alt={product.image?.alt_text || displayName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Quick add / View options overlay */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          {isMultiVariant ? (
            <div className="w-full py-3 bg-foreground/90 text-background font-semibold flex items-center justify-center gap-2 text-sm">
              <ShoppingCart className="w-4 h-4" />
              {t("card_view_options")}
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 text-sm hover:bg-primary/90 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {t("card_quick_add")}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4">
        <p className="text-xs font-medium text-primary uppercase tracking-wider">
          {displayCategory || product.brand || ""}
        </p>
        <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {displayName}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="w-3 h-3"
                fill={star <= Math.round(product.avgRating) ? "#f97316" : "none"}
                stroke={
                  star <= Math.round(product.avgRating)
                    ? "#f97316"
                    : "currentColor"
                }
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount.toLocaleString()})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <span className="font-bold text-foreground">
            ${product.price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              ${product.compareAtPrice!.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}