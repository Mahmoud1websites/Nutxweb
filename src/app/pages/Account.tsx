import {
  Bell,
  ChevronRight,
  Edit,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  User,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Check,
  X,
  Star,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useStore } from "../store";
import { toast } from "sonner";

const API_BASE_URL = "http://localhost:5000/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  processing: "bg-blue-500/10 text-blue-600 border-blue-200",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-200",
  delivered: "bg-green-500/10 text-green-600 border-green-200",
  cancelled: "bg-red-500/10 text-red-600 border-red-200",
  refunded: "bg-gray-500/10 text-gray-600 border-gray-200",
};

type Tab = "profile" | "orders" | "addresses" | "settings";

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

const emptyAddress: Omit<Address, "id"> = {
  full_name: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  country: "Lebanon",
  postal_code: "",
  is_default: false,
};

// ── Auth/Supabase helpers ────────────────────────────────────────────────────
// Centralized here so Account.tsx (and anything that copies this pattern, e.g.
// Checkout.tsx) reads/writes the session the same way everywhere.

/**
 * Finds the Supabase auth session in localStorage regardless of project ref,
 * and returns the access token. Returns "" if no session is present.
 */
export function getToken(): string {
  try {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    if (!key) return "";

    const raw = localStorage.getItem(key);
    if (!raw) return "";

    const session = JSON.parse(raw);
    return session?.access_token ?? session?.currentSession?.access_token ?? "";
  } catch {
    return "";
  }
}

/**
 * Reads Supabase URL/anon key from Vite env vars, normalizing a trailing
 * slash so endpoint concatenation never produces a double slash.
 * Throws a clear, actionable error if either is missing so failures don't
 * show up as a vague "Failed to fetch".
 */
function getSupabaseConfig(): { url: string; anonKey: string } {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!rawUrl || !anonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to your .env file " +
        "at the project root and restart the dev server (Vite only reads .env on startup)."
    );
  }

  return { url: rawUrl.replace(/\/+$/, ""), anonKey };
}

// ── Supabase password update via REST ────────────────────────────────────────
async function supabaseUpdatePassword(newPassword: string): Promise<void> {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig();

  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ password: newPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error_description || data.msg || "Failed to update password");
  }
}

// ── Account deletion via backend ─────────────────────────────────────────────
async function supabaseDeleteUser(): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete account");
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Account() {
  const { user, signOut, fetchUserOrders, products, state } = useStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("profile");
  const [orders, setOrders] = useState<any[]>([]);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Security
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notification settings (local-only)
  const [notifSettings, setNotifSettings] = useState({
    orderUpdates: true,
    promotions: true,
    restocks: false,
    digest: false,
  });

  // ── On mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetch(`${API_BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.profile) {
          setProfile({
            email: user.email || "",
            name: data.profile.full_name || user.user_metadata?.full_name || "Member",
            phone: data.profile.phone || "",
          });
        } else {
          setProfile({
            email: user.email || "",
            name: user.user_metadata?.full_name || "Member",
            phone: "",
          });
        }
      })
      .catch(() => {
        setProfile({
          email: user.email || "",
          name: user.user_metadata?.full_name || "Member",
          phone: "",
        });
      })
      .finally(() => setLoadingProfile(false));

    fetchUserOrders()
      .then((data: any) => {
        if (Array.isArray(data)) setOrders(data);
        else if (data && Array.isArray(data.orders)) setOrders(data.orders);
        else setOrders([]);
      })
      .catch(() => setOrders([]))
      .finally(() => setFetchingOrders(false));
  }, [user]);

  useEffect(() => {
    if (tab === "addresses") fetchAddresses();
  }, [tab]);

  // ── API helpers ───────────────────────────────────────────────────────────────
  async function fetchAddresses() {
    setLoadingAddresses(true);
    try {
      const res = await fetch(`${API_BASE_URL}/addresses`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setAddresses(data.addresses || []);
      else toast.error(data.error || "Failed to load addresses");
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoadingAddresses(false);
    }
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ full_name: profile.name, phone: profile.phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
      toast.success("Profile updated!");
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  function openAddressForm(addr?: Address) {
    if (addr) {
      setEditingAddress(addr);
      setAddressForm({
        full_name: addr.full_name,
        phone: addr.phone,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        country: addr.country,
        postal_code: addr.postal_code,
        is_default: addr.is_default,
      });
    } else {
      setEditingAddress(null);
      setAddressForm(emptyAddress);
    }
    setShowAddressForm(true);
  }

  const handleSaveAddress = async () => {
    if (!addressForm.full_name || !addressForm.street || !addressForm.city) {
      toast.error("Full name, street, and city are required");
      return;
    }
    setSavingAddress(true);
    try {
      // If editing: delete the old one first, then re-create
      if (editingAddress) {
        await fetch(`${API_BASE_URL}/addresses/${editingAddress.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      }

      const res = await fetch(`${API_BASE_URL}/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(addressForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save address");

      toast.success(editingAddress ? "Address updated!" : "Address saved!");
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm(emptyAddress);
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    setDeletingAddressId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to remove");
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Address removed");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    if (addr.is_default) return;
    setSettingDefaultId(addr.id);
    try {
      await fetch(`${API_BASE_URL}/addresses/${addr.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const res = await fetch(`${API_BASE_URL}/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...addr, is_default: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to set default");
      toast.success("Default address updated");
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.next || pwForm.next.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPw(true);
    try {
      await supabaseUpdatePassword(pwForm.next);
      toast.success("Password updated! You may need to sign in again.");
      setShowPasswordForm(false);
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSavingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    setDeletingAccount(true);
    try {
      await supabaseDeleteUser();
      toast.success("Account deleted");
      await signOut();
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  if (!user) return null;

  const totalSpent = Array.isArray(orders)
    ? orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    : 0;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "orders", label: "Orders", icon: Package },
    { key: "addresses", label: "Addresses", icon: MapPin },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  const addressFields: {
    label: string;
    key: keyof Omit<Address, "id" | "is_default">;
    type?: string;
    wide?: boolean;
  }[] = [
    { label: "Full Name *", key: "full_name" },
    { label: "Phone", key: "phone", type: "tel" },
    { label: "Street Address *", key: "street", wide: true },
    { label: "City *", key: "city" },
    { label: "State / Region", key: "state" },
    { label: "Country", key: "country" },
    { label: "Postal Code", key: "postal_code" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black text-foreground mb-8 tracking-tight">My Account</h1>

      <div className="grid md:grid-cols-4 gap-8">
        {/* ── Sidebar ── */}
        <aside className="md:col-span-1">
          <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-24">
            <div className="p-6 text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
              <div className="w-16 h-16 bg-primary text-primary-foreground font-black text-xl rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                {profile.name
                  ? profile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "U"}
              </div>
              <p className="font-bold text-foreground truncate text-sm">{profile.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
            </div>
            <nav className="p-2">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    tab === key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              ))}
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="md:col-span-3 space-y-4">

          {/* ══ PROFILE TAB ══ */}
          {tab === "profile" && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">Profile Information</h2>
                <button
                  onClick={() => setEditing(!editing)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {editing ? <X className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />}
                  {editing ? "Cancel" : "Edit"}
                </button>
              </div>

              {loadingProfile ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {(
                    [
                      { label: "Full Name", key: "name" as const, type: "text", editable: true },
                      { label: "Email Address", key: "email" as const, type: "email", editable: false },
                      { label: "Phone Number", key: "phone" as const, type: "tel", editable: true },
                    ] as const
                  ).map(({ label, key, type, editable }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {label}
                      </label>
                      {editing && editable ? (
                        <input
                          type={type}
                          value={profile[key]}
                          onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                          className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      ) : (
                        <div>
                          <p className="text-foreground text-sm py-2.5 font-medium">
                            {profile[key] || (
                              <span className="text-muted-foreground italic">Not set</span>
                            )}
                          </p>
                          {!editable && (
                            <p className="text-xs text-muted-foreground -mt-1">
                              Change via Security Settings
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {editing && (
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="mt-6 flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
                {[
                  { label: "Orders", value: orders.length },
                  { label: "Total Spent", value: `$${totalSpent.toFixed(2)}` },
                  { label: "Saved Items", value: state.wishlist?.length || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-4 bg-muted/60 rounded-2xl">
                    <p className="text-2xl font-black text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ORDERS TAB ══ */}
          {tab === "orders" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Order History</h2>
              </div>
              {fetchingOrders ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No orders yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your order history will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {orders.map((order) => (
                    <div key={order.id} className="p-5 space-y-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground select-all bg-muted px-2 py-0.5 rounded">
                              #{order.id?.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                STATUS_COLORS[order.status] || "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {new Date(order.created_at).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-foreground">${Number(order.total_amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{order.order_items?.length || 0} item(s)</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {order.order_items?.map((item: any, i: number) => {
                          const matched = products.find((p: any) => p.id === item.product_id);
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5 border border-border/40"
                            >
                              {matched?.image && (
                                <img
                                  src={typeof matched.image === "string" ? matched.image : matched.image?.url}
                                  alt=""
                                  className="w-7 h-7 object-cover rounded-lg shrink-0"
                                />
                              )}
                              <div>
                                <p className="text-xs font-bold text-foreground max-w-[130px] truncate">
                                  {item.product_name || matched?.name || "Product"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {order.shipping_address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.shipping_address.street}, {order.shipping_address.city}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ ADDRESSES TAB ══ */}
          {tab === "addresses" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Saved Addresses</h2>
                {!showAddressForm && (
                  <button
                    onClick={() => openAddressForm()}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Address
                  </button>
                )}
              </div>

              {/* Address form */}
              {showAddressForm && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-foreground">
                      {editingAddress ? "Edit Address" : "New Address"}
                    </h3>
                    <button
                      onClick={() => { setShowAddressForm(false); setEditingAddress(null); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {addressFields.map(({ label, key, type, wide }) => (
                      <div key={key} className={wide ? "sm:col-span-2" : ""}>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {label}
                        </label>
                        <input
                          type={type || "text"}
                          value={addressForm[key] as string}
                          onChange={(e) => setAddressForm({ ...addressForm, [key]: e.target.value })}
                          className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={addressForm.is_default}
                          onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm font-medium text-foreground">Set as default address</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={handleSaveAddress}
                      disabled={savingAddress}
                      className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
                    >
                      {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {editingAddress ? "Update Address" : "Save Address"}
                    </button>
                    <button
                      onClick={() => { setShowAddressForm(false); setEditingAddress(null); }}
                      className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Address list */}
              {loadingAddresses ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : addresses.length === 0 && !showAddressForm ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <MapPin className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No addresses saved yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add an address to speed up checkout</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`bg-card border rounded-2xl p-5 relative transition-all ${
                        addr.is_default ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                      }`}
                    >
                      {addr.is_default && (
                        <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                      <p className="font-bold text-foreground text-sm pr-16">{addr.full_name}</p>
                      {addr.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">{addr.phone}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {addr.street}
                        <br />
                        {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postal_code}
                        <br />
                        {addr.country}
                      </p>
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
                        <button
                          onClick={() => openAddressForm(addr)}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        {!addr.is_default && (
                          <button
                            onClick={() => handleSetDefault(addr)}
                            disabled={settingDefaultId === addr.id}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                          >
                            {settingDefaultId === addr.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Star className="w-3.5 h-3.5" />
                            )}
                            Set as default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          disabled={deletingAddressId === addr.id}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40 ml-auto"
                        >
                          {deletingAddressId === addr.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ SETTINGS TAB ══ */}
          {tab === "settings" && (
            <div className="space-y-4">
              {/* Notifications */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Notifications
                </h2>
                <div className="space-y-1">
                  {(
                    [
                      { label: "Order updates", sub: "Shipping and delivery notifications", key: "orderUpdates" },
                      { label: "Promotions & deals", sub: "Sales, new arrivals, exclusive offers", key: "promotions" },
                      { label: "Product restocks", sub: "Notify when wishlist items are back in stock", key: "restocks" },
                      { label: "Weekly digest", sub: "Summary of your orders and recommendations", key: "digest" },
                    ] as const
                  ).map(({ label, sub, key }) => (
                    <div key={key} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                      </div>
                      <button
                        onClick={() => setNotifSettings((s) => ({ ...s, [key]: !s[key] }))}
                        className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${
                          notifSettings[key] ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            notifSettings[key] ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Security
                </h2>

                <div className="space-y-2">
                  <button
                    onClick={() => setShowPasswordForm((v) => !v)}
                    className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/70 transition-colors group"
                  >
                    <span className="text-sm font-semibold text-foreground">Change Password</span>
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        showPasswordForm ? "rotate-90" : "group-hover:translate-x-0.5"
                      }`}
                    />
                  </button>

                  {showPasswordForm && (
                    <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Enter a new password. It must be at least 6 characters.
                      </p>
                      {(
                        [
                          { label: "New Password", key: "next" as const },
                          { label: "Confirm New Password", key: "confirm" as const },
                        ]
                      ).map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            {label}
                          </label>
                          <div className="relative">
                            <input
                              type={showPw[key] ? "text" : "password"}
                              value={pwForm[key]}
                              onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                              placeholder="••••••••"
                              className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={handleChangePassword}
                          disabled={savingPw}
                          className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
                        >
                          {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Update Password
                        </button>
                        <button
                          onClick={() => { setShowPasswordForm(false); setPwForm({ current: "", next: "", confirm: "" }); }}
                          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center justify-between p-4 bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-colors group"
                  >
                    <span className="text-sm font-semibold text-destructive">Delete Account</span>
                    <ChevronRight className="w-4 h-4 text-destructive group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Delete Account Modal ══ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Delete Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This is permanent. All your orders, addresses, and data will be erased and cannot be recovered.
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Type <span className="text-destructive font-black">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== "DELETE"}
                className="flex-1 flex items-center justify-center gap-2 bg-destructive text-white font-bold px-5 py-2.5 rounded-xl hover:bg-destructive/90 transition-colors text-sm disabled:opacity-40"
              >
                {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete My Account
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}