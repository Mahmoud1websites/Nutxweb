import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Search, Loader2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  is_featured: boolean;
}

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/brands")
      .then(r => r.json())
      .then(d => setBrands(d.brands || []))
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading brands…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-2">Our Partners</p>
          <h1 className="text-4xl font-black text-foreground mb-3">Brands We Carry</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            Authorized dealer for {brands.length}+ international brands — genuine parts, guaranteed.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="relative max-w-sm mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No brands found{search ? ` for "${search}"` : ""}.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(brand => (
              <Link
                key={brand.id}
                to={`/products?brand=${encodeURIComponent(brand.name)}`}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
              >
                {brand.image_url ? (
                  <img
                    src={brand.image_url}
                    alt={brand.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                    <span className="text-xs font-black text-muted-foreground">{brand.name[0]}</span>
                  </div>
                )}
                <span className="text-sm font-bold text-center text-muted-foreground group-hover:text-primary transition-colors">
                  {brand.name}
                </span>
                {brand.description && (
                  <span className="text-xs text-center text-muted-foreground/60 line-clamp-2">
                    {brand.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}