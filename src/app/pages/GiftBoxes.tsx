import { useEffect, useState } from "react";
import { Link } from "react-router";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

interface GiftBox {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  base_price: number;
  capacity?: number | null;
  is_customizable: boolean;
  is_active: boolean;
}

export default function GiftBoxes() {
  const [boxes, setBoxes] = useState<GiftBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/gift-boxes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBoxes(data.giftBoxes || []);
        else setErrorMsg(data.error || "Failed to load gift boxes.");
      })
      .catch(() => setErrorMsg("Network error connecting to backend API."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-1">Gift Boxes</p>
        <h1 className="text-3xl font-black text-foreground">Give the gift of great taste</h1>
        <p className="text-muted-foreground mt-1">
          Choose a ready-made box, or build your own from our best products.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground animate-pulse text-sm font-medium">
          Loading gift boxes…
        </div>
      ) : errorMsg ? (
        <div className="text-center py-12 text-destructive font-medium">{errorMsg}</div>
      ) : boxes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="text-5xl">🎁</div>
          <h3 className="text-xl font-bold text-foreground">No gift boxes available yet</h3>
          <p className="text-muted-foreground">Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {boxes.map((box) => (
            <Link
              key={box.id}
              to={`/gift-boxes/${box.slug}`}
              className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                <img
                  src={box.image_url || "https://placehold.co/500x375?text=Gift+Box"}
                  alt={box.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm text-foreground">
                  {box.is_customizable ? "Build your own" : "Ready-made"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 p-5">
                <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                  {box.name}
                </h3>
                {box.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{box.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-black text-foreground text-xl">${Number(box.base_price).toFixed(2)}</span>
                  <span className="text-sm font-semibold text-primary group-hover:underline">
                    {box.is_customizable ? "Customize" : "View box"} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}