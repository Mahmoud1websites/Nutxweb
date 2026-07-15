import {
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useStore } from "../store";
import { toast } from "sonner";
import { supabase } from "../config/supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

interface Address {
  id: string;
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_default: boolean;
}

interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  price: string;
  estimated_days_min: number;
  estimated_days_max: number;
}

const STEP_LABELS = ["Shipping", "Payment", "Review"];

const emptyAddress: Omit<Address, "id"> & { [key: string]: any } = {
  full_name: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  country: "Lebanon",
  postal_code: "",
  is_default: false,
};

export default function Checkout() {
  const { state, dispatch, cartSubtotal, cartTotal, discount, user, products } = useStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0=shipping 1=payment 2=review
  const [placing, setPlacing] = useState(false);

  // ── Addresses ──
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Shipping ──
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(true);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);

  // ── Payment ──
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // ── Coupon ──
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // ── Notes ──
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const hasProducts = state.cart && state.cart.length > 0;
    const hasGiftBoxes = state.giftBoxCart && state.giftBoxCart.length > 0;
    if (!hasProducts && !hasGiftBoxes) { navigate("/cart"); return; }
    fetchAddresses();
    fetchShippingMethods();
  }, [user]);

  async function fetchAddresses() {
    setLoadingAddresses(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE_URL}/addresses`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses || []);
        const def = data.addresses?.find((a: Address) => a.is_default);
        if (def) setSelectedAddressId(def.id);
        else if (data.addresses?.length > 0) setSelectedAddressId(data.addresses[0].id);
      } else {
        throw new Error(data.error || "Failed to load addresses");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load addresses");
    } finally {
      setLoadingAddresses(false);
    }
  }

  async function fetchShippingMethods() {
    setLoadingShipping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE_URL}/shipping-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setShippingMethods(data.shippingMethods || []);
        if (data.shippingMethods?.length > 0) {
          setSelectedShippingId(data.shippingMethods[0].id);
        }
      } else {
        throw new Error(data.message || "Failed to load shipping methods");
      }
    } catch (err) {
      console.error("Fetch Shipping Error:", err);
      toast.error("Could not load shipping options");
    } finally {
      setLoadingShipping(false);
    }
  }

  async function handleSaveNewAddress() {
    if (!newAddress.full_name || !newAddress.street || !newAddress.city) {
      toast.error("Please fill in required fields");
      return;
    }

    setSavingAddress(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE_URL}/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAddress),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");

      toast.success("Address saved!");
      setShowNewAddress(false);
      setNewAddress(emptyAddress);
      await fetchAddresses();
      setSelectedAddressId(data.address.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, orderSubtotal: cartSubtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCouponError(data.error || "Invalid coupon");
        return;
      }

      const rate = data.coupon.discountType === "percentage"
        ? data.coupon.discountValue / 100
        : data.coupon.discountValue / cartSubtotal;

      dispatch({ type: "SET_COUPON", code: data.coupon.code, rate, couponId: data.coupon.id });
      setCouponInput("");
      toast.success(`Coupon applied — ${data.coupon.discountType === "percentage"
        ? `${data.coupon.discountValue}% off`
        : `$${data.coupon.discountValue} off`}`);
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    dispatch({ type: "SET_COUPON", code: null, rate: 0, couponId: null });
    setCouponError("");
  }

  const resolvedItems = useMemo(() => {
    const available = products || [];
    return (state.cart || []).map((item) => {
      const product = available.find((p: any) => p.id === item.productId);
      const variant = product?.variants?.find(
        (v: any) => v.id === item.variantId || v._id === item.variantId
      );
      const price = (product?.price ?? 0) + (variant?.priceModifier ?? 0);
      return {
        ...item,
        name: product?.name ?? "Unknown Product",
        image: product?.image?.url ?? product?.images?.[0] ?? "",
        variantLabel: variant?.label,
        price,
      };
    });
  }, [state.cart, products]);

  const resolvedGiftBoxItems = useMemo(() => {
    return (state.giftBoxCart || []).map((box) => ({
      itemId: box.itemId,
      name: box.name,
      image: box.image,
      quantity: box.quantity,
      price: box.basePrice,
      contentsLabel: box.contents.map((c) => `${c.productName ?? "Item"} ×${c.quantity}`).join(", "),
    }));
  }, [state.giftBoxCart]);

  const selectedShipping = shippingMethods.find((m) => m.id === selectedShippingId);
  const shippingCost = selectedShipping ? parseFloat(selectedShipping.price) : 0;
  const orderTotal = cartSubtotal - discount + shippingCost;

  async function handlePlaceOrder() {
    if (!selectedAddressId) { toast.error("Please select a delivery address"); return; }
    if (!selectedShippingId) { toast.error("Please select a shipping method"); return; }

    const hasProducts = state.cart && state.cart.length > 0;
    const hasGiftBoxes = state.giftBoxCart && state.giftBoxCart.length > 0;
    if (!hasProducts && !hasGiftBoxes) {
      toast.error("Your cart is empty. Please add items before checking out.");
      return;
    }

    if (!state.cartId) {
      toast.error("We couldn't find your cart. Please refresh and try again.");
      return;
    }

    setPlacing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      if (!token) throw new Error("You must be logged in to place an order.");

      const res = await fetch(`${API_BASE_URL}/checkout/place-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartId: state.cartId,
          shippingAddressId: selectedAddressId,
          shippingMethodId: selectedShippingId,
          couponId: state.couponId || null,
          paymentMethod,
          paymentIntentId: null,
          notes: notes || null,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Fallback for non-JSON returns
      }

      if (!res.ok || !data?.success) {
        const serverMessage = data?.error || `Order failed (status ${res.status})`;
        console.error("Place order failed:", serverMessage);
        throw new Error(serverMessage);
      }

      dispatch({ type: "CLEAR_CART" });
      toast.success("Order placed successfully!");
      navigate(`/order-success?id=${data.orderId}`);
    } catch (err: any) {
      console.error("Order error:", err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setPlacing(false);
    }
  }

  function canProceedFromStep(s: number) {
    if (s === 0) return !!selectedAddressId && !!selectedShippingId;
    if (s === 1) {
      if (paymentMethod === "cod") return true;
      return cardNumber.length >= 16 && cardExpiry.length >= 5 && cardCvc.length >= 3 && cardName.length > 0;
    }
    return true;
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link to="/cart" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-4">
          ← Back to cart
        </Link>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Checkout</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mt-6">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 text-sm font-semibold transition-colors ${i < step ? "text-primary cursor-pointer" : i === step ? "text-foreground" : "text-muted-foreground cursor-default"
                  }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                    }`}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEP_LABELS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* ── Left: Steps ── */}
        <div className="space-y-6">

          {/* ── STEP 0: SHIPPING ── */}
          {step === 0 && (
            <>
              {/* Address selection */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Delivery Address
                  </h2>
                  {!showNewAddress && (
                    <button
                      onClick={() => setShowNewAddress(true)}
                      className="text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> New
                    </button>
                  )}
                </div>

                {loadingAddresses ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedAddressId === addr.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground text-sm">{addr.full_name}</p>
                              {addr.is_default && (
                                <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            {addr.phone && <p className="text-xs text-muted-foreground">{addr.phone}</p>}
                            <p className="text-sm text-muted-foreground mt-1">
                              {addr.street}, {addr.city}{addr.state ? `, ${addr.state}` : ""} · {addr.country}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${selectedAddressId === addr.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                              }`}
                          >
                            {selectedAddressId === addr.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    ))}

                    {addresses.length === 0 && !showNewAddress && (
                      <div className="text-center py-6">
                        <MapPin className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No addresses saved. Add one below.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* New address form */}
                {showNewAddress && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-semibold text-sm text-foreground">Add New Address</p>
                      <button type="button" onClick={() => setShowNewAddress(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { label: "Full Name *", key: "full_name" },
                        { label: "Phone", key: "phone", type: "tel" },
                        { label: "Street Address *", key: "street", wide: true },
                        { label: "City *", key: "city" },
                        { label: "State / Region", key: "state" },
                        { label: "Country", key: "country" },
                        { label: "Postal Code", key: "postal_code" },
                      ].map(({ label, key, type, wide }) => (
                        <div key={key} className={wide ? "sm:col-span-2" : ""}>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                          <input
                            type={type || "text"}
                            value={newAddress[key] as string}
                            onChange={(e) => setNewAddress({ ...newAddress, [key]: e.target.value })}
                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </div>
                      ))}
                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newAddress.is_default}
                            onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                            className="accent-primary"
                          />
                          <span className="text-sm text-foreground">Set as default</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={handleSaveNewAddress}
                        disabled={savingAddress}
                        className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                      >
                        {savingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewAddress(false)}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping method */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-foreground flex items-center gap-2 mb-5">
                  <Truck className="w-4 h-4 text-primary" /> Shipping Method
                </h2>

                {loadingShipping ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : shippingMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shipping methods available.</p>
                ) : (
                  <div className="space-y-3">
                    {shippingMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedShippingId(method.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedShippingId === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                          }`}
                      >
                        <div>
                          <p className="font-semibold text-foreground text-sm">{method.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {method.carrier && `${method.carrier} · `}
                            {method.estimated_days_min}–{method.estimated_days_max} business days
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-foreground">
                            {parseFloat(method.price) === 0 ? (
                              <span className="text-emerald-600">Free</span>
                            ) : (
                              `$${parseFloat(method.price).toFixed(2)}`
                            )}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedShippingId === method.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                              }`}
                          >
                            {selectedShippingId === method.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-foreground text-sm mb-3">Order Notes (optional)</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions for delivery, installation notes..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={!canProceedFromStep(0)}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue to Payment <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ── STEP 1: PAYMENT ── */}
          {step === 1 && (
            <>
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-foreground flex items-center gap-2 mb-5">
                  <CreditCard className="w-4 h-4 text-primary" /> Payment Method
                </h2>

                <div className="space-y-3">
                  {/* COD */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-xl">💵</div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "cod" ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                      {paymentMethod === "cod" && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>

                  {/* Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Credit / Debit Card</p>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "card" ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                      {paymentMethod === "card" && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                </div>

                {/* Card Form */}
                {paymentMethod === "card" && (
                  <div className="mt-5 space-y-4 pt-5 border-t border-border">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Card Number
                      </label>
                      <input
                        type="text"
                        maxLength={19}
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                          setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                        }}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Expiry
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2);
                            setCardExpiry(v);
                          }}
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          CVC
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="123"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Your card details are encrypted and secure
                    </p>
                  </div>
                )}
              </div>

              {/* Coupon */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-primary" /> Coupon Code
                </h2>

                {state.coupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-widest">
                          {state.coupon}
                        </p>
                        <p className="text-xs text-emerald-600">Applied — saving ${discount.toFixed(2)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-red-500 transition-colors">
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
                      placeholder="Enter coupon code"
                      className="flex-1 px-3 py-2.5 bg-muted rounded-xl text-sm font-mono uppercase border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Apply
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-6 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedFromStep(1)}
                  className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Review Order <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: REVIEW ── */}
          {step === 2 && (
            <>
              {/* Items */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" /> Order Items ({resolvedItems.length})
                  </h2>
                </div>

                <div className="divide-y divide-border">
                  {resolvedItems.map((item) => (
                    <div key={`${item.productId}__${item.variantId}`} className="flex items-center gap-4 p-4">
                      <div className="w-14 h-14 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                        {item.variantLabel && <p className="text-xs text-muted-foreground">{item.variantLabel}</p>}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-foreground text-sm shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {resolvedGiftBoxItems.map((box) => (
                    <div key={box.itemId} className="flex items-center gap-4 p-4">
                      <div className="w-14 h-14 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                        {box.image ? (
                          <img src={box.image} alt={box.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            Gift Box
                          </span>
                          <p className="text-sm font-bold text-foreground truncate">{box.name}</p>
                        </div>
                        {box.contentsLabel && <p className="text-xs text-muted-foreground truncate">{box.contentsLabel}</p>}
                        <p className="text-xs text-muted-foreground">Qty: {box.quantity}</p>
                      </div>
                      <p className="font-bold text-foreground text-sm shrink-0">
                        ${(box.price * box.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping & Payment Summary */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery To</p>
                  {selectedAddress && (
                    <div className="text-sm text-foreground">
                      <p className="font-bold">{selectedAddress.full_name}</p>
                      <p className="text-muted-foreground">
                        {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.country}
                      </p>
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shipping</p>
                  <p className="text-sm font-semibold text-foreground">{selectedShipping?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedShipping?.estimated_days_min}–{selectedShipping?.estimated_days_max} business days
                  </p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment</p>
                  <p className="text-sm font-semibold text-foreground">
                    {paymentMethod === "cod" ? "Cash on Delivery" : "Credit / Debit Card"}
                  </p>
                  {paymentMethod === "card" && cardNumber && (
                    <p className="text-xs text-muted-foreground font-mono">•••• {cardNumber.replace(/\s/g, "").slice(-4)}</p>
                  )}
                </div>
                {notes && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {placing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Placing order...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Place Order</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Order Summary (sticky) ── */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-foreground mb-4">Order Summary</h2>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {resolvedItems.map((item) => (
                <div key={`${item.productId}__${item.variantId}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="flex-1 text-xs text-muted-foreground truncate">
                    {item.name} ×{item.quantity}
                  </p>
                  <p className="text-xs font-bold text-foreground shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              {resolvedGiftBoxItems.map((box) => (
                <div key={box.itemId} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden shrink-0">
                    {box.image && <img src={box.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="flex-1 text-xs text-muted-foreground truncate">
                    {box.name} ×{box.quantity}
                  </p>
                  <p className="text-xs font-bold text-foreground shrink-0">
                    ${(box.price * box.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm pt-4 border-t border-border">
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
                <span className={shippingCost === 0 ? "font-semibold text-emerald-600" : "font-semibold text-foreground"}>
                  {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-black text-foreground">Total</span>
                <span className="font-black text-foreground text-lg">${orderTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> SSL-encrypted checkout
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Truck className="w-3.5 h-3.5 text-primary" /> Free delivery over $75
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}