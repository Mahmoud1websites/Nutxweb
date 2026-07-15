import { CheckCircle, Package, ArrowRight, MapPin, Truck, CreditCard, Banknote, Loader2, AlertCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

function getToken(): string {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token =
          parsed?.access_token ??
          parsed?.session?.access_token ??
          null;
        if (token) return token;
      } catch {
        // skip malformed
      }
    }
  }
  return localStorage.getItem("sb-access-token") || "";
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  processing: "bg-blue-500/10 text-blue-600 border-blue-200",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-200",
  delivered: "bg-green-500/10 text-green-600 border-green-200",
  cancelled: "bg-red-500/10 text-red-600 border-red-200",
  refunded: "bg-gray-500/10 text-gray-600 border-gray-200",
};

interface OrderDetail {
  id: string;
  status: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  created_at: string;
  notes?: string;
  order_items: {
    id: string;
    product_name: string;
    variant_sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_variants?: { size?: string; color?: string };
  }[];
  payments: {
    method: string;
    status: string;
    amount: number;
  }[];
  shipping_methods?: {
    name: string;
    carrier?: string;
    estimated_days_min?: number;
    estimated_days_max?: number;
  };
  user_addresses?: {
    full_name: string;
    street: string;
    city: string;
    state?: string;
    country: string;
    postal_code?: string;
  };
  shipments?: {
    tracking_number?: string;
    carrier?: string;
    status?: string;
  }[];
}

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("id");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load order");
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const payment = order?.payments?.[0];
  const address = order?.user_addresses;
  const shipping = order?.shipping_methods;
  const shipment = order?.shipments?.[0];

  const paymentIcon = payment?.method === "cod" ? (
    <Banknote className="w-4 h-4 text-muted-foreground" />
  ) : (
    <CreditCard className="w-4 h-4 text-muted-foreground" />
  );

  const paymentLabel =
    payment?.method === "cod"
      ? "Cash on Delivery"
      : payment?.method === "card"
      ? "Credit / Debit Card"
      : payment?.method ?? "—";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Thank you for your purchase. We'll notify you when your order is on its way.
        </p>
        {orderId && (
          <p className="mt-3 text-xs font-mono bg-muted px-3 py-1.5 rounded-lg inline-block text-muted-foreground select-all">
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      )}

      {/* Error — non-fatal, still show the CTA buttons */}
      {!loading && error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Order Details Card */}
      {!loading && order && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {/* Status bar */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Order Status</span>
            <span
              className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground border-border"
              }`}
            >
              {order.status}
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {order.order_items.map((item) => (
              <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.product_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.product_variants?.size && (
                      <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                        Size: {item.product_variants.size}
                      </span>
                    )}
                    {item.product_variants?.color && (
                      <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                        Color: {item.product_variants.color}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">SKU: {item.variant_sku}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">${Number(item.total_price).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order totals */}
          <div className="px-5 py-4 bg-muted/40 border-t border-border space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>${Number(order.subtotal).toFixed(2)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>−${Number(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>
                {Number(order.shipping_amount) === 0
                  ? "Free"
                  : `$${Number(order.shipping_amount).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-foreground pt-2 border-t border-border">
              <span>Total</span>
              <span>${Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info cards: shipping + payment */}
      {!loading && order && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Shipping address */}
          {address && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Shipping To
              </h3>
              <p className="text-sm font-semibold text-foreground">{address.full_name}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {address.street}<br />
                {address.city}{address.state ? `, ${address.state}` : ""}{" "}
                {address.postal_code}<br />
                {address.country}
              </p>
            </div>
          )}

          {/* Shipping method + payment */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            {shipping && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Delivery
                </h3>
                <p className="text-sm font-semibold text-foreground">{shipping.name}</p>
                {shipping.carrier && (
                  <p className="text-xs text-muted-foreground mt-0.5">{shipping.carrier}</p>
                )}
                {shipping.estimated_days_min != null && shipping.estimated_days_max != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Est. {shipping.estimated_days_min}–{shipping.estimated_days_max} business days
                  </p>
                )}
                {shipment?.tracking_number && (
                  <p className="text-xs font-mono mt-1 text-primary">
                    Tracking: {shipment.tracking_number}
                  </p>
                )}
              </div>
            )}

            {payment && (
              <div className={shipping ? "border-t border-border pt-4" : ""}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  {paymentIcon} Payment
                </h3>
                <p className="text-sm font-semibold text-foreground">{paymentLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  Status: {payment.status}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/account"
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
        >
          <Package className="w-4 h-4" /> View My Orders
        </Link>
        <Link
          to="/products"
          className="inline-flex items-center justify-center gap-2 border border-border text-foreground font-semibold px-6 py-3 rounded-xl hover:bg-muted transition-colors text-sm"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}