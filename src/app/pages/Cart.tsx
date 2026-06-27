import { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useStore } from "../store";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  X,
  Check,
  Truck,
  Shield,
} from "lucide-react";

const VALID_COUPONS: Record<string, { rate: number; label: string }> = {
  SAVE10:    { rate: 0.10, label: "10% off your order" },
  WELCOME20: { rate: 0.20, label: "20% off your order" },
  FLASH15:   { rate: 0.15, label: "15% off your order" },
};

export default function Cart() {
  const { state, dispatch, cartSubtotal, cartTotal, discount, user, products } = useStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");

  const isAuthenticated = !!user;

  const resolvedItems = useMemo(() => {
    const availableProducts = products || [];

    return (state.cart || []).map((item) => {
      const product = availableProducts.find((p: any) => p.id === item.productId);

      const variantsArray = Array.isArray(product?.variants) ? product.variants : [];
      const variant = variantsArray.find(
        (v: any) => v && (v.id === item.variantId || v._id === item.variantId)
      );

      const price = (product?.price ?? 0) + (variant?.priceModifier ?? 0);

      return {
        ...item,
        product,
        variant,
        price,
        // ✅ prefer slug already on the CartItem (set by fetchLiveCart),
        //    fall back to the shaped product from dbProducts
        slug:         item.slug ?? product?.slug ?? null,
        name:         product?.name ?? "Unknown Product",
        image:        product?.image?.url ?? product?.images?.[0] ?? "",
        variantLabel: variant?.label,
      };
    });
  }, [state.cart, products]);

  const afterDiscount = cartSubtotal - discount;
  const shippingFee   = cartSubtotal > 0 && afterDiscount < 75 ? 9.99 : 0;

  function handleApplyCoupon() {
    const code  = couponInput.trim().toUpperCase();
    const match = VALID_COUPONS[code];
    if (match) {
      dispatch({ type: "SET_COUPON", code });
      setCouponError("");
      setCouponInput("");
    } else {
      setCouponError("Invalid coupon code. Try WELCOME20.");
    }
  }

  function handleRemoveCoupon() {
    dispatch({ type: "SET_COUPON", code: null });
    setCouponError("");
  }

  function handleCheckout() {
    if (isAuthenticated) {
      navigate("/checkout");
    } else {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }

  if (resolvedItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <ShoppingCart className="w-9 h-9 text-muted-foreground/50" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-foreground mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Browse our catalog to find what you need.
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
        >
          Shop All Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Shopping Cart
          <span className="ml-3 text-lg font-semibold text-muted-foreground">
            ({(state.cart || []).reduce((t, i) => t + i.quantity, 0)} items)
          </span>
        </h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* ── Cart items ── */}
        <div className="flex flex-col gap-3">

          {/* Free shipping progress */}
          {shippingFee > 0 && (
            <div className="rounded-2xl border border-border bg-card px-5 py-4 mb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  Free delivery at $75
                </span>
                <span className="text-sm font-bold text-primary">
                  ${Math.max(0, 75 - afterDiscount).toFixed(2)} away
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (afterDiscount / 75) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {resolvedItems.map((item) => {
            // ✅ use slug for the link, fall back gracefully
            const productHref = item.slug
              ? `/products/${item.slug}`
              : "/products";

            return (
              <div
                key={`${item.productId}__${item.variantId ?? ""}`}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex gap-4 items-start shadow-sm"
              >
                <Link to={productHref} className="shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted border border-border">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={productHref}
                        className="font-bold text-foreground text-sm hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      {item.variantLabel && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.variantLabel}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "REMOVE_FROM_CART",
                          productId: item.productId,
                          variantId: item.variantId,
                        })
                      }
                      className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 border border-border rounded-xl bg-muted/50 overflow-hidden">
                      <button
                        type="button"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_QUANTITY",
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity - 1,
                          })
                        }
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-foreground tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_QUANTITY",
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity + 1,
                          })
                        }
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-foreground text-base">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mt-2 self-start"
          >
            ← Continue shopping
          </Link>
        </div>

        {/* ── Summary panel ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">

          {/* Coupon */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Coupon Code
            </p>

            {state.coupon ? (
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-widest">
                      {state.coupon}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">
                      {VALID_COUPONS[state.coupon]?.label}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  placeholder="e.g. WELCOME20"
                  className="flex-1 px-3 py-2 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono uppercase border border-transparent"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
          </div>

          {/* Order summary */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 shadow-sm">
            <h2 className="font-black text-foreground text-base">Order Summary</h2>

            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">${cartSubtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({state.coupon})</span>
                  <span className="font-semibold">−${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className={shippingFee === 0 ? "font-semibold text-emerald-600" : "font-semibold text-foreground"}>
                  {shippingFee === 0 ? "Free" : `$${shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-black text-foreground text-base">Total</span>
                <span className="font-black text-foreground text-base">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-all text-sm"
            >
              Proceed to Checkout
            </button>

            <div className="flex items-center justify-center gap-4 pt-1 border-t border-border mt-1">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Shield className="w-3 h-3" /> Secure checkout
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Truck className="w-3 h-3" /> Free over $75
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}