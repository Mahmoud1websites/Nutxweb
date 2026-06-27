import {
  ArrowRight,
  Clock,
  Copy,
  Check,
  Flame,
  Tag,
  Zap,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import ProductCard from "../components/ProductCard";
import { useStore } from "../store";

const coupons = [
  {
    code: "WELCOME20",
    label: "New Customers",
    description: "20% off your entire order. No minimum required.",
    discount: "20% OFF",
    color: "bg-primary",
    expiry: "Expires end of month",
  },
  {
    code: "FLASH15",
    label: "Flash Sale",
    description: "15% off sitewide — limited time flash deal.",
    discount: "15% OFF",
    color: "bg-orange-500",
    expiry: "Valid this week only",
  },
  {
    code: "SAVE10",
    label: "Loyalty Discount",
    description: "10% off for returning customers.",
    discount: "10% OFF",
    color: "bg-emerald-600",
    expiry: "No expiry date",
  },
];

function useCountdown(hoursFromNow = 23, minutesFromNow = 47) {
  const target = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(d.getMinutes() + minutesFromNow);
    return d.getTime();
  }, [hoursFromNow, minutesFromNow]);

  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);

  return {
    h:    String(Math.floor(left / 3_600_000)).padStart(2, "0"),
    m:    String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0"),
    s:    String(Math.floor((left % 60_000) / 1_000)).padStart(2, "0"),
    done: left === 0,
  };
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }
  return { copied, copy };
}

export default function Deals() {
  const { h, m, s, done } = useCountdown();
  const { copied, copy }  = useCopy();

  const { products: globalProducts } = useStore();
  const activeProducts = globalProducts || [];

  // Products that have a compareAtPrice higher than price
  const saleProducts = useMemo(() => {
    return activeProducts.filter(
      (p: any) => p && p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price)
    );
  }, [activeProducts]);

  // Flash deal = highest absolute saving
  const flashProduct = useMemo(() => {
    if (saleProducts.length === 0) return null;
    return [...saleProducts].sort((a: any, b: any) => {
      const savingsB = Number(b.compareAtPrice) - Number(b.price);
      const savingsA = Number(a.compareAtPrice) - Number(a.price);
      return savingsB - savingsA;
    })[0] ?? null;
  }, [saleProducts]);

  const otherSaleProducts = useMemo(() => {
    return saleProducts.filter((p: any) => p.id !== flashProduct?.id);
  }, [saleProducts, flashProduct]);

  function discountPct(p: any) {
    if (!p?.compareAtPrice || !p?.price) return 0;
    return Math.round(
      ((Number(p.compareAtPrice) - Number(p.price)) / Number(p.compareAtPrice)) * 100
    );
  }

  return (
    <div className="min-h-screen">

      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-6 bg-primary" />
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">Limited Time</p>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground mb-3">
            Deals & Offers 🔥
          </h1>
          <p className="text-muted-foreground text-base max-w-xl">
            Great products at reduced prices — flash deals, coupon codes, and sale
            stock updated regularly.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-20">

        {/* Flash deal */}
        {flashProduct && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-black text-foreground">Flash Deal</h2>
              <span className="ml-2 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/20">
                Ends soon
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card overflow-hidden grid md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square md:aspect-auto bg-muted overflow-hidden min-h-[280px]">
                {flashProduct.image?.url && (
                  <img
                    src={flashProduct.image.url}
                    alt={flashProduct.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-4 left-4 bg-orange-500 text-white text-sm font-black px-3 py-1.5 rounded-xl">
                  {discountPct(flashProduct)}% OFF
                </div>
              </div>

              {/* Info */}
              <div className="p-8 sm:p-10 flex flex-col justify-center gap-6">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-[0.15em] mb-2">
                    Flash Deal of the Day
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-2 leading-tight">
                    {flashProduct.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {flashProduct.description}
                  </p>
                </div>

                {/* Pricing */}
                <div className="flex items-end gap-3 flex-wrap">
                  <span className="text-4xl font-black text-foreground">
                    ${Number(flashProduct.price).toFixed(2)}
                  </span>
                  <span className="text-lg text-muted-foreground line-through mb-1">
                    ${Number(flashProduct.compareAtPrice).toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 mb-1">
                    Save ${(Number(flashProduct.compareAtPrice) - Number(flashProduct.price)).toFixed(2)}
                  </span>
                </div>

                {/* Countdown */}
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {done ? "Deal has ended" : "Deal ends in"}
                  </p>
                  <div className="flex items-center gap-2">
                    {[{ val: h, label: "Hours" }, { val: m, label: "Min" }, { val: s, label: "Sec" }].map(
                      ({ val, label }, i) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="bg-foreground text-background rounded-xl px-3 py-2 text-center min-w-[52px]">
                            <span className="text-2xl font-black tabular-nums leading-none">{val}</span>
                            <p className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-1">
                              {label}
                            </p>
                          </div>
                          {i < 2 && (
                            <span className="text-xl font-black text-muted-foreground">:</span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* ✅ use slug, not id */}
                <Link
                  to={`/products/${flashProduct.slug}`}
                  className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
                >
                  <Zap className="w-4 h-4" />
                  Grab This Deal
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Coupon codes */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black text-foreground">Coupon Codes</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div
                key={c.code}
                className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col"
              >
                <div className={`${c.color} px-5 py-4 flex items-center justify-between`}>
                  <div>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      {c.label}
                    </p>
                    <p className="text-white font-black text-2xl">{c.discount}</p>
                  </div>
                  <Tag className="w-8 h-8 text-white/20" />
                </div>

                <div className="p-5 flex flex-col gap-4 flex-1">
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
                    <span className="font-mono font-black text-sm text-foreground flex-1 tracking-widest">
                      {c.code}
                    </span>
                    <button
                      onClick={() => copy(c.code)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Copy code"
                    >
                      {copied === c.code
                        ? <Check className="w-4 h-4 text-emerald-500" />
                        : <Copy className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{c.expiry}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sale products grid */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-6 bg-primary" />
                <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">On Sale Now</p>
              </div>
              <h2 className="text-3xl font-black text-foreground">Discounted Products</h2>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              All products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {otherSaleProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherSaleProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/30 py-20 text-center">
              <Flame className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-foreground mb-1">No sale items right now</p>
              <p className="text-sm text-muted-foreground">
                Check back soon — new deals drop every week.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}