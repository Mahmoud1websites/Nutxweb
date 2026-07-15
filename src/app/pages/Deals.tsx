import {
  ArrowRight,
  Clock,
  Copy,
  Check,
  Flame,
  Sparkles,
  Zap,
  Percent,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import ProductCard from "../components/ProductCard";
import { useStore } from "../store";
import { useLanguage } from "../i18n/LanguageContext";

const coupons = [
  {
    code: "WELCOME20",
    labelKey: "coupon_welcome_label",
    descKey: "coupon_welcome_desc",
    expiryKey: "coupon_welcome_expiry",
    discount: "20%",
    accent: "text-primary bg-primary/10 border-primary/20",
  },
  {
    code: "FLASH15",
    labelKey: "coupon_flash_label",
    descKey: "coupon_flash_desc",
    expiryKey: "coupon_flash_expiry",
    discount: "15%",
    accent: "text-orange-600 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20",
  },
  {
    code: "SAVE10",
    labelKey: "coupon_loyalty_label",
    descKey: "coupon_loyalty_desc",
    expiryKey: "coupon_loyalty_expiry",
    discount: "10%",
    accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  },
] as const;

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
  const { t } = useLanguage();

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
      <div className="border-b border-border bg-card relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-primary" />
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t("deals_limited_time")}
            </p>
          </div>
          <h1
            className="text-4xl sm:text-5xl text-foreground mb-3 tracking-tight"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
          >
            {t("deals_title")}
          </h1>
          <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
            {t("deals_subtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-20">

        {/* Flash deal */}
        {flashProduct && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2
                className="text-xl text-foreground"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
              >
                {t("deals_flash_deal")}
              </h2>
              <span className="ml-1 relative flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
                </span>
                {t("deals_ends_soon")}
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card overflow-hidden grid md:grid-cols-2 shadow-sm">
              {/* Image */}
              <div className="relative aspect-square md:aspect-auto bg-muted overflow-hidden min-h-[280px]">
                {flashProduct.image?.url && (
                  <img
                    src={flashProduct.image.url}
                    alt={flashProduct.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-4 left-4 bg-orange-500 text-white text-sm font-black px-3 py-1.5 rounded-xl shadow-md">
                  {discountPct(flashProduct)}% OFF
                </div>
              </div>

              {/* Info */}
              <div className="p-8 sm:p-10 flex flex-col justify-center gap-6">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-[0.15em] mb-2">
                    {t("deals_flash_of_day")}
                  </p>
                  <h3
                    className="text-2xl sm:text-3xl text-foreground mb-2 leading-tight"
                    style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
                  >
                    {flashProduct.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
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
                  <span className="text-sm font-bold text-emerald-600 mb-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {t("deals_save")} ${(Number(flashProduct.compareAtPrice) - Number(flashProduct.price)).toFixed(2)}
                  </span>
                </div>

                {/* Countdown */}
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {done ? t("deals_deal_ended") : t("deals_deal_ends_in")}
                  </p>
                  <div className="flex items-center gap-2">
                    {[
                      { val: h, label: t("deals_hours") },
                      { val: m, label: t("deals_min") },
                      { val: s, label: t("deals_sec") },
                    ].map(({ val, label }, i) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="bg-foreground text-background rounded-xl px-3 py-2 text-center min-w-[52px] shadow-sm">
                          <span className="text-2xl font-black tabular-nums leading-none">{val}</span>
                          <p className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-1">
                            {label}
                          </p>
                        </div>
                        {i < 2 && (
                          <span className="text-xl font-black text-muted-foreground">:</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/products/${flashProduct.slug}`}
                  className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md"
                >
                  <Zap className="w-4 h-4" />
                  {t("deals_grab_deal")}
                </Link>
              </div>
            </div>
          </section>
        )}

       

        {/* Sale products grid */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-6 bg-primary" />
                <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">{t("deals_on_sale_now")}</p>
              </div>
              <h2
                className="text-3xl text-foreground"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
              >
                {t("deals_discounted_products")}
              </h2>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              {t("deals_all_products")} <ArrowRight className="w-4 h-4" />
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
              <p className="font-bold text-foreground mb-1">{t("deals_no_sale_title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("deals_no_sale_sub")}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}