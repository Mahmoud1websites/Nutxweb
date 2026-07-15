import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useStore } from "../store";
import { useLanguage } from "../i18n/LanguageContext";

export default function Wishlist() {
  const { state, dispatch, products } = useStore();
  const { t } = useLanguage();

  // ✅ resolve from the live store products, not a local data file
  const wishlistProducts = (products || []).filter((p: any) =>
    state.wishlist.includes(p.id)
  );

  function handleMoveToCart(productId: string, variantId?: string) {
    dispatch({ type: "ADD_TO_CART", productId, variantId });
    dispatch({ type: "TOGGLE_WISHLIST", productId });
    toast.success(t("wishlist_moved_to_cart"));
  }

  function handleRemove(productId: string) {
    dispatch({ type: "TOGGLE_WISHLIST", productId });
    toast.success(t("wishlist_removed"));
  }

  if (wishlistProducts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">{t("wishlist_title")}</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <Heart className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">{t("wishlist_empty_title")}</h2>
            <p className="text-muted-foreground mt-1">
              {t("wishlist_empty_sub")}
            </p>
          </div>
          <Link
            to="/products"
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            {t("wishlist_discover")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground">
          {t("wishlist_title")}
          <span className="ml-3 text-muted-foreground font-normal text-xl">
            ({wishlistProducts.length})
          </span>
        </h1>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {wishlistProducts.map((product: any) => {
          const hasDiscount =
            product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
          const discount = hasDiscount
            ? Math.round(
                ((Number(product.compareAtPrice) - Number(product.price)) /
                  Number(product.compareAtPrice)) *
                  100
              )
            : 0;

          const productHref = `/products/${product.slug}`;

          return (
            <div
              key={product.id}
              className="group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-300"
            >
              {hasDiscount && (
                <span className="absolute top-3 left-3 z-10 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  -{discount}%
                </span>
              )}

              <button
                onClick={() => handleRemove(product.id)}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={t("wishlist_remove_aria")}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <Link to={productHref} className="aspect-square overflow-hidden bg-muted block">
                <img
                  src={product.image?.url || "https://placehold.co/400x400?text=No+Image"}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>

              <div className="flex flex-col gap-2 p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {product.category?.name || product.brand || ""}
                </p>
                <Link to={productHref}>
                  <h3 className="font-semibold text-foreground text-sm leading-tight hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${Number(product.compareAtPrice).toFixed(2)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleMoveToCart(product.id, product.defaultVariantId)}
                  className="mt-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {t("wishlist_add_to_cart")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => {
            wishlistProducts.forEach((p: any) => {
              dispatch({ type: "ADD_TO_CART", productId: p.id, variantId: p.defaultVariantId });
              dispatch({ type: "TOGGLE_WISHLIST", productId: p.id });
            });
            toast.success(t("wishlist_all_moved"));
          }}
          className="flex items-center gap-2 bg-foreground text-background font-bold px-6 py-3 rounded-xl hover:bg-foreground/90 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {t("wishlist_add_all")}
        </button>
      </div>
    </div>
  );
}