import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Package,
  Settings2,
  Shield,
  Star,
  Truck,
  Wrench,
  Leaf,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { useMemo, useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { useStore } from "../store";
import { useLanguage } from "../i18n/LanguageContext";

const image = new URL("../../assets/back2.jpg.png", import.meta.url).href;
const images = new URL("../../assets/whychoose2.png", import.meta.url).href;

const brands = [
  "Lindt", "Ferrero", "Godiva", "Nutella", "Blue Diamond",
  "Planters", "Lindor", "Toblerone", "Kinder", "Ritter Sport",
  "Cadbury", "Milka", "Wonderful Pistachios", "Hershey's", "Anna's",
];

export default function Home() {
  const { t } = useLanguage();

  const trustItems = [
    { icon: Package, label: t("trust_freshly_packed_label"), sub: t("trust_freshly_packed_sub") },
    { icon: Truck, label: t("trust_fast_delivery_label"), sub: t("trust_fast_delivery_sub") },
    { icon: Leaf, label: t("trust_premium_quality_label"), sub: t("trust_premium_quality_sub") },
    { icon: Shield, label: t("trust_guarantee_label"), sub: t("trust_guarantee_sub") },
    { icon: Star, label: t("trust_rated_label"), sub: t("trust_rated_sub") },
    { icon: Award, label: t("trust_award_label"), sub: t("trust_award_sub") },
  ];

  const whyUs = [
    { icon: Award, title: t("why_quality_title"), body: t("why_quality_body") },
    { icon: Settings2, title: t("why_roasted_title"), body: t("why_roasted_body") },
    { icon: Zap, title: t("why_chocolate_title"), body: t("why_chocolate_body") },
  ];

  const checklist = [
    t("checklist_happy_customers"),
    t("checklist_products"),
    t("checklist_freshly_roasted"),
    t("checklist_support"),
    t("checklist_satisfaction"),
    t("checklist_delivery"),
  ];

  // Also fetch directly from API to get is_featured / is_best_seller flags
  // (store context may not include those fields depending on implementation)
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/products?limit=100")
      .then(r => r.json())
      .then(d => setApiProducts(d.products || []));

    fetch("/api/categories")
      .then(r => r.json())
      .then(d => setCategories(d.categories || []));
  }, []);

  // Prefer API products (have is_featured/is_best_seller), fall back to store
  const liveProducts = apiProducts;

  const featuredProducts = useMemo(() => {
    const featured = liveProducts.filter((p: any) => p.is_featured);
    // If no featured products are set yet, show first 8 products as fallback
    return featured.length > 0 ? featured.slice(0, 8) : liveProducts.slice(0, 8);
  }, [liveProducts]);

  const bestSellers = useMemo(() => {
    const bs = liveProducts.filter((p: any) => p.is_best_seller);
    // If no best sellers are set yet, show top rated or first 4 as fallback
    if (bs.length > 0) return bs.slice(0, 4);
    return [...liveProducts]
      .sort((a: any, b: any) => (b.avgRating || 0) - (a.avgRating || 0))
      .slice(0, 4);
  }, [liveProducts]);

  return (
    <div className="overflow-x-hidden">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes trust-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-marquee       { animation: marquee       28s linear infinite; }
        .animate-trust-scroll  { animation: trust-scroll  22s linear infinite; }
        .animate-trust-scroll:hover { animation-play-state: paused; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center bg-card overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={image}
            alt="Premium car — NUTX"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 w-full">
          <div className="max-w-2xl flex flex-col gap-7">
            <div className="flex items-center gap-3">
              <div className="h-px w-10 bg-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-[0.2em]">
                {t("hero_kicker")}
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-none tracking-tight">
              {t("hero_title_line1")}
              <br />
              <span className="text-primary">{t("hero_title_line2")}</span>
              <br />
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
              {t("hero_description")}
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-7 py-3.5 rounded-xl hover:bg-primary/90 transition-all hover:gap-3 text-sm"
              >
                {t("hero_cta_shop_all")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
               to="/products?category=Nuts+%26+Mixes"
                className="inline-flex items-center gap-2 bg-transparent text-foreground font-semibold px-7 py-3.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm"
              >
                {t("hero_cta_nuts_mixes")}
              </Link>
            </div>


          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ─────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-5 overflow-hidden">
        <div className="flex animate-trust-scroll w-max">
          {[...trustItems, ...trustItems].map(({ icon: Icon, label, sub }, i) => (
            <div key={i} className="flex items-center gap-3 px-10 border-r border-border/40 shrink-0">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground whitespace-nowrap">{label}</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHOP BY CATEGORY ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-6 bg-primary" />
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">{t("section_browse_kicker")}</p>
            </div>
            <h2 className="text-3xl font-black text-foreground">{t("section_shop_by_category")}</h2>
          </div>
          <Link
            to="/products"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            {t("section_all_products")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 sm:pb-0 sm:grid sm:grid-cols-4 lg:grid-cols-7 snap-x snap-mandatory sm:snap-none">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${encodeURIComponent(cat.slug)}`}
              className="group relative rounded-2xl overflow-hidden shrink-0 w-44 sm:w-auto aspect-[3/4] bg-muted snap-start"
            >
              <img
                src={cat.image_url || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=750&fit=crop"}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-3.5">
                <h3 className="text-white font-bold text-xs leading-snug">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ─────────────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-6 bg-primary" />
                <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">{t("section_handpicked_kicker")}</p>
              </div>
              <h2 className="text-3xl font-black text-foreground">{t("section_featured_products")}</h2>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              {t("section_view_all")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── PROMO BANNER ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="relative rounded-3xl overflow-hidden bg-primary">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -left-8 -bottom-8 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute right-32 bottom-0 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 px-8 sm:px-12 py-12">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-foreground/60" />
                <p className="text-primary-foreground/60 text-xs font-semibold uppercase tracking-wider">
                  {t("promo_limited_offer")}
                </p>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-primary-foreground leading-tight">
                {t("promo_new_customer")}
                <br />
                {t("promo_get_20_off")}
              </h3>
              <p className="text-primary-foreground/75 text-sm">
                {t("promo_use_code")}{" "}
                <strong className="bg-white/20 px-2 py-0.5 rounded font-mono text-white">
                  NUTX20
                </strong>{" "}
                {t("promo_at_checkout")}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 shrink-0">
              <Link
                to="/products"
                className="bg-white text-primary font-bold px-10 py-3.5 rounded-xl hover:bg-white/90 transition-colors text-sm whitespace-nowrap"
              >
                {t("promo_shop_now")}
              </Link>
              <p className="text-primary-foreground/50 text-xs">{t("promo_no_minimum")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY NUTX ─────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-6 bg-primary" />
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">{t("why_kicker")}</p>
            </div>
            <h2 className="text-3xl font-black text-foreground">{t("why_title")}</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-full min-h-[420px]">
              <img
              src={images}
                alt="NUTX store — premium nuts and chocolate"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            </div>

            <div className="flex flex-col gap-8">
              {whyUs.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-5">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-1.5">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">
                  {t("why_everything_count_on")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {checklist.map((point) => (
                    <div key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BEST SELLERS ─────────────────────────────────────────────────── */}
      {bestSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-6 bg-primary" />
                <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">{t("section_top_rated_kicker")}</p>
              </div>
              <h2 className="text-3xl font-black text-foreground">{t("section_best_sellers")}</h2>
            </div>
            <Link
              to="/products?sort=popular"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              {t("section_view_all")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {bestSellers.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}