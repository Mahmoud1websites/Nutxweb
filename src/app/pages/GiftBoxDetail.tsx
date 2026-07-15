import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../config/supabaseClient";

const API_BASE = "/api";

function getSessionId(): string {
  let id = localStorage.getItem("x-session-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("x-session-id", id);
  }
  return id;
}

interface EligibleProduct {
  id: string; // gift_box_products link id
  default_quantity: number;
  sort_order: number;
  products?: { id: string; name: string; slug: string; product_images?: { url: string; is_primary: boolean }[] };
  product_variants?: {
    id: string; sku: string; price: string; size?: string; color?: string;
    weight_grams?: number | null; stock?: number;
  };
}

interface GiftBoxData {
  id: string; name: string; slug: string; description?: string | null;
  image_url?: string | null; base_price: number; capacity?: number | null;
  is_customizable: boolean;
}

/** One product, with every weight/variant option the admin linked to this box. */
interface ProductGroup {
  productId: string;
  productName: string;
  image?: string;
  sortOrder: number;
  variants: EligibleProduct[];
}

function weightLabel(v?: EligibleProduct["product_variants"]): string {
  if (!v) return "";
  if (v.weight_grams) {
    return v.weight_grams >= 1000 && v.weight_grams % 1000 === 0
      ? `${v.weight_grams / 1000}kg`
      : v.weight_grams >= 1000
      ? `${(v.weight_grams / 1000).toFixed(1)}kg`
      : `${v.weight_grams}g`;
  }
  return v.size || v.sku || "";
}

export default function GiftBoxDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = useState<GiftBoxData | null>(null);
  const [eligible, setEligible] = useState<EligibleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selections, setSelections] = useState<Record<string, number>>({});
  // Which variant (weight) is currently "active" per product, for the weight pills
  const [activeVariant, setActiveVariant] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/gift-boxes/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.giftBox) { setNotFound(true); return; }
        setBox(data.giftBox);
        const items: EligibleProduct[] = data.eligibleProducts || [];
        setEligible(items);

        // Pre-fill selections with default_quantity — for pre-made boxes this
        // IS the final fixed contents; for customizable boxes it's just a
        // starting point the customer can freely adjust.
        const initialSel: Record<string, number> = {};
        const initialActive: Record<string, string> = {};
        for (const e of items) {
          const variantId = e.product_variants?.id;
          const productId = e.products?.id;
          if (!variantId || !productId) continue;
          if (e.default_quantity > 0) {
            initialSel[variantId] = e.default_quantity;
            initialActive[productId] = variantId; // the pre-selected weight wins
          } else if (!(productId in initialActive)) {
            initialActive[productId] = variantId; // otherwise default to first weight seen
          }
        }
        setSelections(initialSel);
        setActiveVariant(initialActive);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  function setQty(variantId: string, qty: number) {
    setSelections((s) => {
      const next = { ...s };
      if (qty <= 0) delete next[variantId];
      else next[variantId] = qty;
      return next;
    });
  }

  // Switching weight moves whatever quantity was on the old variant over to the new one,
  // so the user doesn't lose their selection just by tapping a different weight.
  function selectWeight(productId: string, newVariantId: string) {
    const oldVariantId = activeVariant[productId];
    if (oldVariantId === newVariantId) return;
    setActiveVariant((a) => ({ ...a, [productId]: newVariantId }));
    if (oldVariantId) {
      setSelections((s) => {
        const qty = s[oldVariantId] ?? 0;
        const next = { ...s };
        delete next[oldVariantId];
        if (qty > 0) next[newVariantId] = qty;
        return next;
      });
    }
  }

  const totalItems = useMemo(
    () => Object.values(selections).reduce((sum, q) => sum + q, 0),
    [selections]
  );

  // Group eligible links by product so multiple weight variants of the same
  // product render as one card with weight pills, instead of duplicate cards.
  const groupedProducts = useMemo<ProductGroup[]>(() => {
    const map = new Map<string, ProductGroup>();
    for (const e of eligible) {
      const productId = e.products?.id;
      if (!productId) continue;
      if (!map.has(productId)) {
        const img = e.products?.product_images?.find((i) => i.is_primary) || e.products?.product_images?.[0];
        map.set(productId, {
          productId,
          productName: e.products?.name || "—",
          image: img?.url,
          sortOrder: e.sort_order,
          variants: [],
        });
      }
      const group = map.get(productId)!;
      group.variants.push(e);
      group.sortOrder = Math.min(group.sortOrder, e.sort_order);
    }
    for (const group of map.values()) {
      group.variants.sort((a, b) => {
        const aw = a.product_variants?.weight_grams ?? 0;
        const bw = b.product_variants?.weight_grams ?? 0;
        if (aw !== bw) return aw - bw;
        return a.sort_order - b.sort_order;
      });
    }
    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [eligible]);

  async function handleAddToCart() {
    if (!box) return;
    const contents = Object.entries(selections).map(([variantId, quantity]) => ({ variantId, quantity }));
    if (contents.length === 0) {
      toast.error(box.is_customizable ? "Add at least one item to your box" : "This box has no contents configured");
      return;
    }

    setAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE}/cart/gift-box-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": getSessionId(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ giftBoxId: box.id, quantity: 1, contents }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Gift box added to cart", { description: box.name });
      navigate("/cart");
    } catch (err: any) {
      toast.error(err.message || "Failed to add gift box to cart");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading gift box…</p>
      </div>
    );
  }

  if (notFound || !box) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-2xl font-bold text-foreground">Gift box not found</p>
        <Link to="/gift-boxes" className="text-primary hover:underline">Back to Gift Boxes</Link>
      </div>
    );
  }

  // Non-customizable (pre-made) boxes keep their original fixed, ungrouped listing —
  // contents are exactly what the admin configured, no weight picking needed.
  const sortedEligible = [...eligible].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span>/</span>
        <Link to="/gift-boxes" className="hover:text-primary transition-colors">Gift Boxes</Link>
        <span>/</span>
        <span className="text-foreground">{box.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 mb-12">
        <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
          <img
            src={box.image_url || "https://placehold.co/600x600?text=Gift+Box"}
            alt={box.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-1">
              {box.is_customizable ? "Build your own" : "Ready-made gift box"}
            </p>
            <h1 className="text-3xl font-black text-foreground leading-tight">{box.name}</h1>
            {box.description && <p className="text-muted-foreground mt-3">{box.description}</p>}
          </div>

          <div className="text-4xl font-black text-foreground">${Number(box.base_price).toFixed(2)}</div>

          {box.is_customizable && (
            <p className="text-sm text-muted-foreground">
              {totalItems > 0 ? `${totalItems} item${totalItems !== 1 ? "s" : ""} selected` : "Pick your items below"}
            </p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            {adding ? "Adding…" : "Add to Cart"}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">
          {box.is_customizable ? "Choose your items" : "What's inside"}
        </h2>

        {box.is_customizable ? (
          groupedProducts.length === 0 ? (
            <p className="text-muted-foreground">No products configured for this box yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {groupedProducts.map((group) => {
                const hasWeightChoice = group.variants.length > 1;
                const activeId = activeVariant[group.productId] ?? group.variants[0]?.product_variants?.id;
                const activeEntry = group.variants.find((v) => v.product_variants?.id === activeId) ?? group.variants[0];
                const activeVariantData = activeEntry?.product_variants;
                const qty = activeId ? selections[activeId] ?? 0 : 0;
                const outOfStock = (activeVariantData?.stock ?? 0) <= 0;

                return (
                  <div
                    key={group.productId}
                    className="flex flex-col gap-2 bg-card border border-border rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={group.image || "https://placehold.co/80x80?text=Item"}
                        alt={group.productName}
                        className="w-14 h-14 object-cover rounded-lg bg-muted shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{group.productName}</p>
                        {!hasWeightChoice && (
                          <p className="text-xs text-muted-foreground">
                            {weightLabel(activeVariantData)}
                            {outOfStock && " · Out of stock"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => activeId && setQty(activeId, Math.max(0, qty - 1))}
                          disabled={qty <= 0}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-foreground">{qty}</span>
                        <button
                          onClick={() => activeId && !outOfStock && setQty(activeId, qty + 1)}
                          disabled={outOfStock || !activeId}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {hasWeightChoice && (
                      <div className="flex flex-wrap gap-1.5 pl-[68px]">
                        {group.variants.map((v) => {
                          const vId = v.product_variants?.id;
                          const isActive = vId === activeId;
                          const isOut = (v.product_variants?.stock ?? 0) <= 0;
                          if (!vId) return null;
                          return (
                            <button
                              key={vId}
                              onClick={() => selectWeight(group.productId, vId)}
                              disabled={isOut}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                              }`}
                            >
                              {weightLabel(v.product_variants)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : sortedEligible.length === 0 ? (
          <p className="text-muted-foreground">No products configured for this box yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {sortedEligible.map((e) => {
              const variant = e.product_variants;
              const productName = e.products?.name || "—";
              const img = e.products?.product_images?.find((i) => i.is_primary) || e.products?.product_images?.[0];

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
                >
                  <img
                    src={img?.url || "https://placehold.co/80x80?text=Item"}
                    alt={productName}
                    className="w-14 h-14 object-cover rounded-lg bg-muted shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {weightLabel(variant)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">×{e.default_quantity}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}