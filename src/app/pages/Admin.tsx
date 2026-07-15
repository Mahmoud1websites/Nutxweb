import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { supabase } from "../config/supabaseClient";
import { toast } from "sonner";

/* ─── API helper ─────────────────────────────────────────────────────────── */

const API = "/api";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success && json.error) throw new Error(json.error);
  return json;
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
type View = "dashboard" | "products" | "categories" | "orders" | "inventory" | "coupons" | "shipping" | "customers" | "reviews" | "brands" | "giftboxes";
interface Category { id: string; name: string; slug: string; parent_id: string | null; image_url: string | null; }
interface Product { id: string; name: string; slug: string; brand: string; is_active: boolean; sold_by_weight?: boolean; categories?: { id: string; name: string }; product_variants?: Variant[]; }
interface Variant { id: string; sku: string; price: string; compare_at_price: string; color: string; size: string; weight_grams?: number | null; inventory?: { id: string; quantity: number; low_stock_threshold: number }[]; }



interface Order { id: string; status: string; total_amount: string; created_at: string; profiles?: { full_name: string }; payments?: { method: string; status: string }[]; }
interface InvItem { id: string; quantity: number; low_stock_threshold: number; product_variants?: { id: string; sku: string; color: string; size: string; products?: { name: string } }; }
interface Coupon { id: string; code: string; description: string; discount_type: "percentage" | "fixed"; discount_value: number; minimum_order_amount: number | null; usage_limit: number | null; used_count: number; expiry_date: string | null; is_active: boolean; }
interface Customer { id: string; full_name: string; phone: string; avatar_url: string | null; created_at: string; is_admin?: boolean; }
interface Review { id: string; rating: number; title: string; comment: string; is_verified: boolean; created_at: string; products?: { name: string }; profiles?: { full_name: string }; }
interface Brand {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  is_featured: boolean;
}
interface GiftBox {
  id: string; name: string; slug: string; description: string | null; image_url: string | null;
  base_price: number; capacity: number | null; is_customizable: boolean; is_active: boolean;
}
interface GiftBoxProductLink {
  id: string; default_quantity: number; sort_order: number; product_id: string; variant_id: string;
  products?: { id: string; name: string };
  product_variants?: { id: string; sku: string; price: string; size?: string; color?: string; weight_grams?: number | null };
}
/* ─── Design tokens ──────────────────────────────────────────────────────── */

const T = {
  bg: "var(--color-background-primary)",
  bg2: "var(--color-background-secondary)",
  bg3: "var(--color-background-tertiary)",
  text: "var(--color-text-primary)",
  muted: "var(--color-text-secondary)",
  hint: "var(--color-text-tertiary)",
  border: "var(--color-border-tertiary)",
  border2: "var(--color-border-secondary)",
  success: "var(--color-background-success)",
  successText: "var(--color-text-success)",
  warning: "var(--color-background-warning)",
  warningText: "var(--color-text-warning)",
  danger: "var(--color-background-danger)",
  dangerText: "var(--color-text-danger)",
  info: "var(--color-background-info)",
  infoText: "var(--color-text-info)",
  radius: "var(--border-radius-md)",
  radiusLg: "var(--border-radius-lg)",
};

/* ─── Shared micro components ────────────────────────────────────────────── */

function Badge({ label, variant = "gray" }: { label: string; variant?: "green" | "amber" | "red" | "gray" | "blue" }) {
  const styles: Record<string, [string, string]> = {
    green: [T.success, T.successText],
    amber: [T.warning, T.warningText],
    red: [T.danger, T.dangerText],
    blue: [T.info, T.infoText],
    gray: [T.bg2, T.muted],
  };
  const [bg, color] = styles[variant];
  return (
    <span style={{ background: bg, color, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}
function BrandsPanel() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Brand | "new" | null>(null);
  const [confirm, setConfirm] = useState<Brand | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/admin/brands");
      setBrands(d.brands || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doDelete(b: Brand) {
    try {
      await apiFetch(`/admin/brands/${b.id}`, { method: "DELETE" });
      toast.success("Brand deleted");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setConfirm(null); }
  }

  return (
    <div>
      <PageHeader title="Brands" subtitle={`${brands.length} brand${brands.length !== 1 ? "s" : ""}`}>
        <Btn variant="primary" onClick={() => setModal("new")}>
          <i className="ti ti-plus" aria-hidden /> Add brand
        </Btn>
      </PageHeader>
      <Card noPad>
        {loading ? <Spinner /> : brands.length === 0 ? <Empty>No brands yet.</Empty> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><Th>Image</Th><Th>Name</Th><Th>Description</Th><Th>Featured</Th><Th w="80px" /></tr>
            </thead>
            <tbody>
              {brands.map(b => (
                <tr key={b.id} className="adm-tr">
                  <Td>
                    {b.image_url
                      ? <img src={b.image_url} alt={b.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: T.radius, border: `0.5px solid ${T.border}` }} />
                      : <div style={{ width: 48, height: 48, borderRadius: T.radius, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="ti ti-photo" style={{ color: T.hint, fontSize: 18 }} />
                      </div>
                    }
                  </Td>
                  <Td bold>{b.name}</Td>
                  <Td muted>{b.description || "—"}</Td>
                  <Td><Badge label={b.is_featured ? "Featured" : "No"} variant={b.is_featured ? "green" : "gray"} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconBtn icon="ti-edit" onClick={() => setModal(b)} label="Edit brand" />
                      <IconBtn icon="ti-trash" onClick={() => setConfirm(b)} label="Delete brand" danger />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal !== null && (
        <BrandModal
          brand={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); toast.success(modal === "new" ? "Brand created" : "Brand updated"); }}
        />
      )}
      {confirm && (
        <Confirm
          msg={`Delete "${confirm.name}"?`}
          onConfirm={() => doDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function BrandModal({ brand, onClose, onSaved }: { brand: Brand | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: brand?.name || "",
    description: brand?.description || "",
    image_url: brand?.image_url || "",
    is_featured: brand?.is_featured ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const d = await apiFetch("/admin/brands/upload-image", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileBase64: base64 }),
      });
      setF("image_url", d.url);
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (brand) {
        await apiFetch(`/admin/brands/${brand.id}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await apiFetch("/admin/brands", { method: "POST", body: JSON.stringify(form) });
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={brand ? `Edit — ${brand.name}` : "New brand"}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : brand ? "Save" : "Create"}
          </Btn>
        </>
      }
    >
      <FG label="Brand name">
        <input style={inputStyle} value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Pioneer" />
      </FG>
      <FG label="Description">
        <input style={inputStyle} value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Optional description…" />
      </FG>
      <FG label="Image">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.image_url && (
            <img src={form.image_url} alt="preview" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: T.radius, border: `0.5px solid ${T.border}` }} />
          )}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <Btn size="sm" disabled={uploading} onClick={() => { }}>
              <i className="ti ti-upload" aria-hidden />
              {uploading ? "Uploading…" : "Upload from device"}
            </Btn>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted, fontSize: 11 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} /> or <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>
          <input style={inputStyle} value={form.image_url} onChange={e => setF("image_url", e.target.value)} placeholder="https://… paste image URL" />
        </div>
      </FG>
      <FG label="Featured">
        <select style={inputStyle} value={form.is_featured ? "1" : "0"} onChange={e => setF("is_featured", e.target.value === "1")}>
          <option value="0">No</option>
          <option value="1">Yes — show in featured section</option>
        </select>
      </FG>
    </Modal>
  );
}
/* ══════════════════════════════════════════════════════════════════════════ */
/*  GIFT BOXES                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */

function GiftBoxesPanel() {
  const [boxes, setBoxes] = useState<GiftBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<GiftBox | "new" | null>(null);
  const [confirm, setConfirm] = useState<GiftBox | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/admin/gift-boxes"); setBoxes(d.giftBoxes || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doDelete(b: GiftBox) {
    try { await apiFetch(`/admin/gift-boxes/${b.id}`, { method: "DELETE" }); toast.success("Gift box deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setConfirm(null); }
  }

  return (
    <div>
      <PageHeader title="Gift Boxes" subtitle={`${boxes.length} box${boxes.length !== 1 ? "es" : ""}`}>
        <Btn variant="primary" onClick={() => setModal("new")}><i className="ti ti-plus" aria-hidden /> Add gift box</Btn>
      </PageHeader>
      <Card noPad>
        {loading ? <Spinner /> : boxes.length === 0 ? <Empty>No gift boxes yet.</Empty> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Image</Th><Th>Name</Th><Th>Price</Th><Th>Type</Th><Th>Status</Th><Th w="80px" /></tr></thead>
            <tbody>
              {boxes.map(b => (
                <tr key={b.id} className="adm-tr">
                  <Td>
                    {b.image_url
                      ? <img src={b.image_url} alt={b.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: T.radius, border: `0.5px solid ${T.border}` }} />
                      : <div style={{ width: 44, height: 44, borderRadius: T.radius, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="ti ti-gift" style={{ color: T.hint, fontSize: 16 }} aria-hidden />
                      </div>}
                  </Td>
                  <Td bold>{b.name}</Td>
                  <Td>${Number(b.base_price).toFixed(2)}</Td>
                  <Td><Badge label={b.is_customizable ? "Build your own" : "Pre-made"} variant={b.is_customizable ? "blue" : "gray"} /></Td>
                  <Td><Badge label={b.is_active ? "Active" : "Inactive"} variant={b.is_active ? "green" : "gray"} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconBtn icon="ti-edit" onClick={() => setModal(b)} label="Edit gift box" />
                      <IconBtn icon="ti-trash" onClick={() => setConfirm(b)} label="Delete gift box" danger />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal !== null && (
        <GiftBoxModal
          box={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); toast.success(modal === "new" ? "Gift box created" : "Gift box updated"); }}
        />
      )}
      {confirm && (
        <Confirm msg={`Delete "${confirm.name}"? This cannot be undone.`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function GiftBoxModal({ box, onClose, onSaved }: { box: GiftBox | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: box?.name || "",
    slug: box?.slug || "",
    description: box?.description || "",
    image_url: box?.image_url || "",
    base_price: box?.base_price != null ? String(box.base_price) : "",
    capacity: box?.capacity != null ? String(box.capacity) : "",
    is_customizable: box ? box.is_customizable : true,
    is_active: box ? box.is_active : true,
  });
  const [saving, setSaving] = useState(false);
  const slugTouched = useRef(false);

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function autoSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  async function save() {
    if (!form.name.trim() || !form.slug.trim() || !form.base_price) { toast.error("Name, slug, and price are required"); return; }
    setSaving(true);
    const body = {
      ...form,
      base_price: parseFloat(form.base_price) || 0,
      capacity: form.capacity ? parseInt(form.capacity) : null,
    };
    try {
      if (box) await apiFetch(`/admin/gift-boxes/${box.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/admin/gift-boxes", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={box ? `Edit — ${box.name}` : "New gift box"}
      onClose={onClose}
      width={600}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : box ? "Save changes" : "Create gift box"}</Btn></>}
    >
      <FRow>
        <FG label="Box name" half>
          <input style={inputStyle} value={form.name} onChange={e => {
            setF("name", e.target.value);
            if (!slugTouched.current) setF("slug", autoSlug(e.target.value));
          }} placeholder="Deluxe Nut Collection" />
        </FG>
        <FG label="Slug" half>
          <input style={inputStyle} value={form.slug} onChange={e => { slugTouched.current = true; setF("slug", e.target.value); }} />
        </FG>
      </FRow>
      <FG label="Description">
        <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={form.description} onChange={e => setF("description", e.target.value)} />
      </FG>
      <FG label="Image URL">
        <input style={inputStyle} value={form.image_url} onChange={e => setF("image_url", e.target.value)} placeholder="https://…" />
      </FG>
      <FRow>
        <FG label="Price ($)" half>
          <input style={inputStyle} type="number" step="0.01" value={form.base_price} onChange={e => setF("base_price", e.target.value)} />
        </FG>
        <FG label="Capacity (optional label, e.g. items)" half>
          <input style={inputStyle} type="number" value={form.capacity} onChange={e => setF("capacity", e.target.value)} placeholder="Optional" />
        </FG>
      </FRow>
      <FRow>
        <FG label="Box type" half>
          <select style={inputStyle} value={form.is_customizable ? "1" : "0"} onChange={e => setF("is_customizable", e.target.value === "1")}>
            <option value="1">Build your own — customer picks contents</option>
            <option value="0">Pre-made — fixed contents, add as-is</option>
          </select>
        </FG>
        <FG label="Status" half>
          <select style={inputStyle} value={form.is_active ? "1" : "0"} onChange={e => setF("is_active", e.target.value === "1")}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </FG>
      </FRow>

      {box && <GiftBoxProductsSection boxId={box.id} />}
      {!box && (
        <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
          Save the box first, then reopen it to add eligible products.
        </div>
      )}
    </Modal>
  );
}

function GiftBoxProductsSection({ boxId }: { boxId: string }) {
  const [links, setLinks] = useState<GiftBoxProductLink[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selProductId, setSelProductId] = useState("");
  const [selVariantId, setSelVariantId] = useState("");
  const [defaultQty, setDefaultQty] = useState("1");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [linksD, productsD] = await Promise.all([
        apiFetch(`/admin/gift-boxes/${boxId}/products`),
        apiFetch("/admin/products?limit=200"),
      ]);
      setLinks(linksD.products || []);
      setAllProducts(productsD.products || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [boxId]);

  useEffect(() => { load(); }, [load]);

  const selectedProduct = allProducts.find(p => p.id === selProductId);

  async function addLink() {
    if (!selProductId || !selVariantId) { toast.error("Choose a product and variant"); return; }
    setAdding(true);
    try {
      await apiFetch(`/admin/gift-boxes/${boxId}/products`, {
        method: "POST",
        body: JSON.stringify({ product_id: selProductId, variant_id: selVariantId, default_quantity: parseInt(defaultQty) || 0 }),
      });
      setSelProductId(""); setSelVariantId(""); setDefaultQty("1");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  }

  async function updateQty(link: GiftBoxProductLink, qty: number) {
    try { await apiFetch(`/admin/gift-boxes/${boxId}/products/${link.id}`, { method: "PATCH", body: JSON.stringify({ default_quantity: qty, sort_order: link.sort_order }) }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function removeLink(link: GiftBoxProductLink) {
    try { await apiFetch(`/admin/gift-boxes/${boxId}/products/${link.id}`, { method: "DELETE" }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
        Eligible products
      </div>

      {loading ? <Spinner /> : links.length === 0 ? <Empty>No products added yet.</Empty> : (
        links.map(l => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `0.5px solid ${T.border}`, borderRadius: T.radius, padding: "8px 12px", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{l.products?.name || "—"}</div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {l.product_variants?.sku} · ${parseFloat(l.product_variants?.price || "0").toFixed(2)}
                {l.product_variants?.weight_grams ? ` · ${l.product_variants.weight_grams}g` : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: T.muted }}>Default qty</span>
              <input
                type="number"
                style={{ ...inputStyle, width: 56, padding: "4px 6px" }}
                value={l.default_quantity}
                onChange={e => updateQty(l, parseInt(e.target.value) || 0)}
              />
              <IconBtn icon="ti-trash" onClick={() => removeLink(l)} label="Remove" danger />
            </div>
          </div>
        ))
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <select style={{ ...inputStyle, flex: "1 1 160px" }} value={selProductId} onChange={e => { setSelProductId(e.target.value); setSelVariantId(""); }}>
          <option value="">— select product —</option>
          {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ ...inputStyle, flex: "1 1 140px" }} value={selVariantId} onChange={e => setSelVariantId(e.target.value)} disabled={!selectedProduct}>
          <option value="">— select variant —</option>
          {selectedProduct?.product_variants?.map((v: any) => (
            <option key={v.id} value={v.id}>{v.sku} — ${parseFloat(v.price).toFixed(2)}</option>
          ))}
        </select>
        <input type="number" style={{ ...inputStyle, width: 80 }} value={defaultQty} onChange={e => setDefaultQty(e.target.value)} placeholder="Qty" />
        <Btn size="sm" onClick={addLink} disabled={adding || !selProductId || !selVariantId}>
          <i className="ti ti-plus" aria-hidden /> {adding ? "Adding…" : "Add"}
        </Btn>
      </div>
    </div>
  );
}
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${T.border2}`, borderTopColor: T.text, borderRadius: "50%", animation: "adm-spin .6s linear infinite" }} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted, fontSize: 13 }}>{children}</div>;
}

function Card({ children, noPad, style }: { children: React.ReactNode; noPad?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.bg, border: `0.5px solid ${T.border}`, borderRadius: T.radiusLg, padding: noPad ? 0 : "16px 20px", overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{ background: T.bg2, borderRadius: T.radius, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: T.muted }} aria-hidden />
        <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: T.text }}>{value}</div>
    </div>
  );
}



function Th({ children, w }: { children?: React.ReactNode; w?: string }) {
  return <th style={{ textAlign: "left", padding: "9px 14px", color: T.muted, fontWeight: 500, fontSize: 11, borderBottom: `0.5px solid ${T.border}`, whiteSpace: "nowrap", width: w }}>{children}</th>;
}

function Td({ children, mono, muted, bold }: { children?: React.ReactNode; mono?: boolean; muted?: boolean; bold?: boolean }) {
  return <td style={{ padding: "10px 14px", color: muted ? T.muted : T.text, fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: mono ? 11 : 13, fontWeight: bold ? 500 : 400, verticalAlign: "middle" }}>{children}</td>;
}

function Btn({ children, onClick, variant = "default", size = "md", disabled, type = "button", style }: {
  children: React.ReactNode; onClick?: () => void; variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md"; disabled?: boolean; type?: "button" | "submit"; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: T.radius, fontWeight: 400, opacity: disabled ? 0.55 : 1,
    padding: size === "sm" ? "4px 9px" : "6px 13px",
    fontSize: size === "sm" ? 12 : 13, border: "none", transition: "opacity .15s",
  };
  const variants: Record<string, React.CSSProperties> = {
    default: { background: T.bg, border: `0.5px solid ${T.border2}`, color: T.text },
    primary: { background: T.text, color: T.bg, border: "none" },
    danger: { background: T.danger, color: T.dangerText, border: `0.5px solid ${T.dangerText}20` },
    ghost: { background: "transparent", border: "none", color: T.muted },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function IconBtn({ icon, onClick, label, danger, style }: { icon: string; onClick: () => void; label: string; danger?: boolean; style?: React.CSSProperties }) {
  return (
    <button aria-label={label} onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: T.radius, cursor: "pointer", border: "none",
      background: danger ? T.danger : T.bg2, color: danger ? T.dangerText : T.muted, transition: "opacity .15s",
      ...style,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14 }} aria-hidden />
    </button>
  );
}

/* ─── Modal shell — portalled to document.body so position:fixed works ───── */

function Modal({ title, onClose, children, footer, width = 520 }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: number;
}) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,          // above everything, including any sticky headers
        padding: 16,
      }}
    >
      <div style={{
        background: T.bg, borderRadius: T.radiusLg, border: `0.5px solid ${T.border}`,
        width: "100%", maxWidth: width, maxHeight: "88vh",
        overflowY: "auto", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,.6)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `0.5px solid ${T.border}`, flexShrink: 0 }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: T.text }}>{title}</span>
          <IconBtn icon="ti-x" onClick={onClose} label="Close" />
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: "12px 20px", borderTop: `0.5px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.getElementById("admin-panel-root") || document.body
  );
}

/* ─── Form helpers ───────────────────────────────────────────────────────── */

function FG({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ marginBottom: 12, flex: half ? "1 1 calc(50% - 6px)" : "1 1 100%", minWidth: 0 }}>
      <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function FRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{children}</div>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: T.radius,
  border: `0.5px solid ${T.border2}`, background: T.bg, color: T.text,
  fontSize: 13, outline: "none", fontFamily: "var(--font-sans)",
};

/* ─── Confirm dialog (also portalled) ───────────────────────────────────── */

function Confirm({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
      <div style={{ background: T.bg, borderRadius: T.radiusLg, border: `0.5px solid ${T.border}`, padding: 24, maxWidth: 360, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,.18)" }}>
        <p style={{ color: T.text, fontSize: 14, marginBottom: 20 }}>{msg}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm}>Confirm</Btn>
        </div>
      </div>
    </div>,
    document.getElementById("admin-panel-root") || document.body
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ROOT                                                                       */
/* ══════════════════════════════════════════════════════════════════════════ */

export default function Admin() {
  const [view, setView] = useState<View>("dashboard");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    apiFetch("/admin/orders/count-pending").then(d => setPendingCount(d.count ?? 0)).catch(() => { });
  }, []);

  const nav: { key: View; label: string; icon: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
    { key: "products", label: "Products", icon: "ti-package" },
    { key: "categories", label: "Categories", icon: "ti-category" },
    { key: "orders", label: "Orders", icon: "ti-receipt" },
    { key: "inventory", label: "Inventory", icon: "ti-box" },
    { key: "coupons", label: "Coupons", icon: "ti-tag" },
    { key: "customers", label: "Customers", icon: "ti-users" },
    { key: "brands", label: "Brands", icon: "ti-award" },
    { key: "giftboxes", label: "Gift Boxes", icon: "ti-gift" },
    { key: "reviews", label: "Reviews", icon: "ti-star" },

  ];

  return (
    <>
      <style>{`
        @keyframes adm-spin { to { transform: rotate(360deg) } }
        .adm-tr:hover td { background: var(--color-background-secondary) }
        .adm-nav-btn:hover { background: var(--color-background-secondary) !important }
      `}</style>
      <div className="admin-panel" id="admin-panel-root" style={{ display: "flex", minHeight: "calc(100vh - 60px)", fontFamily: "var(--font-sans)", fontSize: 13, color: T.text, background: T.bg3 }}>
        {/* Sidebar */}
        <aside style={{ width: 192, flexShrink: 0, background: T.bg, borderRight: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `0.5px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-settings" style={{ fontSize: 16, color: T.muted }} aria-hidden />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Admin panel</span>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "8px 8px" }}>
            {nav.map(n => (
              <button key={n.key} className="adm-nav-btn" onClick={() => setView(n.key)} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px",
                borderRadius: T.radius, border: "none", cursor: "pointer", textAlign: "left", fontSize: 13,
                background: view === n.key ? T.bg2 : "transparent",
                color: view === n.key ? T.text : T.muted,
                fontWeight: view === n.key ? 500 : 400, marginBottom: 2,
              }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: 15, flexShrink: 0 }} aria-hidden />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.key === "orders" && pendingCount > 0 && (
                  <span style={{ background: T.text, color: T.bg, borderRadius: 20, fontSize: 10, padding: "1px 6px", fontWeight: 500 }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div style={{ padding: "8px 8px 12px", borderTop: `0.5px solid ${T.border}` }}>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", color: T.muted, textDecoration: "none", borderRadius: T.radius, fontSize: 13 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden />
              Back to store
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: 24, overflow: "auto", minWidth: 0 }}>
          {view === "dashboard" && <DashboardPanel />}
          {view === "products" && <ProductsPanel />}
          {view === "categories" && <CategoriesPanel />}
          {view === "orders" && <OrdersPanel onCountChange={setPendingCount} />}
          {view === "inventory" && <InventoryPanel />}
          {view === "coupons" && <CouponsPanel />}
          {view === "customers" && <CustomersPanel />}
          {view === "reviews" && <ReviewsPanel />}
          {view === "brands" && <BrandsPanel />}
          {view === "giftboxes" && <GiftBoxesPanel />}

        </main>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  DASHBOARD                                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */

function DashboardPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/dashboard-summary")
      .then(d => setData(d))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <Empty>Could not load dashboard.</Empty>;

  const { stats, recentOrders = [], revenueData = [] } = data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Stat label="Revenue" value={`$${Number(stats?.revenue?.value || 0).toLocaleString()}`} icon="ti-currency-dollar" />
        <Stat label="Orders" value={(stats?.orders?.value || 0).toLocaleString()} icon="ti-receipt" />
        <Stat label="Customers" value={(stats?.customers?.value || 0).toLocaleString()} icon="ti-users" />
        <Stat label="Products" value={(stats?.products?.value || 0).toLocaleString()} icon="ti-package" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Revenue — last 7 days</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {revenueData.map((d: any, i: number) => {
              const max = Math.max(...revenueData.map((x: any) => x.revenue), 1);
              const h = Math.max(4, Math.round((d.revenue / max) * 72));
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: h, background: T.bg2, borderRadius: 3, border: `0.5px solid ${T.border}` }} title={`$${d.revenue}`} />
                  <span style={{ fontSize: 10, color: T.hint }}>{d.date?.split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Recent orders</div>
          {recentOrders.slice(0, 5).map((o: any) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `0.5px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{o.customer_name || "Guest"}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge label={o.status} variant={statusVariant(o.status)} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>${Number(o.total_amount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  PRODUCTS                                                                   */
/* ══════════════════════════════════════════════════════════════════════════ */

function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Product | "new" | null>(null);
  const [confirm, setConfirm] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/admin/products?limit=200"); setProducts(d.products || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || "").toLowerCase().includes(search.toLowerCase())
  );

  async function doDelete(p: Product) {
    try { await apiFetch(`/admin/products/${p.id}`, { method: "DELETE" }); toast.success("Product deactivated"); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setConfirm(null); }
  }

  return (
    <div>
      <PageHeader title="Products" subtitle={`${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}>
        <Btn variant="primary" onClick={() => setModal("new")}><i className="ti ti-plus" aria-hidden /> Add product</Btn>
      </PageHeader>
      <div style={{ marginBottom: 14 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name or brand…" />
      </div>
      <Card noPad>
        {loading ? <Spinner /> : filtered.length === 0 ? <Empty>No products found.</Empty> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><Th>Product</Th><Th>Brand</Th><Th>Category</Th><Th>Variants</Th><Th>Status</Th><Th w="80px" /></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="adm-tr">
                    <Td bold>{p.name}</Td>
                    <Td muted>{p.brand || "—"}</Td>
                    <Td muted>{p.categories?.name || "—"}</Td>
                    <Td muted>{p.product_variants?.length ?? 0}</Td>
                    <Td><Badge label={p.is_active ? "Active" : "Inactive"} variant={p.is_active ? "green" : "gray"} /></Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <IconBtn icon="ti-edit" onClick={() => setModal(p)} label="Edit product" />
                        <IconBtn icon="ti-trash" onClick={() => setConfirm(p)} label="Delete product" danger />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal !== null && (
        <ProductModal
          product={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); toast.success(modal === "new" ? "Product created" : "Product updated"); }}
        />
      )}
      {confirm && (
        <Confirm
          msg={`Delete "${confirm.name}"? This will permanently delete the category AND all its products.`}
          onConfirm={() => doDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ProductImagesSection({ productId }: { productId: string }) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch(`/admin/products/${productId}/images`); setImages(d.images || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  async function addImage() {
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      await apiFetch(`/admin/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({ url: newUrl.trim(), is_primary: images.length === 0 }),
      });
      setNewUrl("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  }

  async function setPrimary(imageId: string) {
    try { await apiFetch(`/admin/products/${productId}/images/${imageId}`, { method: "PATCH", body: JSON.stringify({ is_primary: true }) }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function removeImage(imageId: string) {
    try { await apiFetch(`/admin/products/${productId}/images/${imageId}`, { method: "DELETE" }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Images</div>
      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {images.length === 0 && <span style={{ fontSize: 12, color: T.muted }}>No images yet.</span>}
          {images.map(img => (
            <div key={img.id} style={{ position: "relative", width: 84, border: `0.5px solid ${img.is_primary ? T.text : T.border}`, borderRadius: T.radius, overflow: "hidden" }}>
              <img src={img.url} alt={img.alt_text || ""} style={{ width: "100%", height: 64, objectFit: "cover", display: "block" }} />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 4px", background: T.bg2 }}>
                <button onClick={() => setPrimary(img.id)} title="Set as primary" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: img.is_primary ? T.text : T.hint }}>
                  <i className={`ti ${img.is_primary ? "ti-star-filled" : "ti-star"}`} style={{ fontSize: 13 }} aria-hidden />
                </button>
                <button onClick={() => removeImage(img.id)} title="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: T.dangerText }}>
                  <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input style={inputStyle} value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://… new image URL" />
        <Btn size="sm" onClick={addImage} disabled={adding || !newUrl.trim()}>{adding ? "Adding…" : "Add"}</Btn>
      </div>
    </div>
  );
}

function VariantsSection({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [soldByWeight, setSoldByWeight] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Variant | "new" | null>(null);
  const [confirm, setConfirm] = useState<Variant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/admin/products/${productId}`);
      setVariants(d.product?.product_variants || []);
      setSoldByWeight(!!d.product?.sold_by_weight);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  async function doDelete(v: Variant) {
    try {
      await apiFetch(`/admin/products/${productId}/variants/${v.id}`, { method: "DELETE" });
      toast.success("Variant deleted");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setConfirm(null); }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Variants</div>
        <Btn size="sm" onClick={() => setEditing("new")}><i className="ti ti-plus" aria-hidden /> Add variant</Btn>
      </div>

      {loading ? <Spinner /> : variants.length === 0 ? <Empty>No variants yet.</Empty> : (
        variants.map(v => (
          <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `0.5px solid ${T.border}`, borderRadius: T.radius, padding: "8px 12px", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>
                {v.sku}{[v.color, v.size].filter(Boolean).length ? ` — ${[v.color, v.size].filter(Boolean).join(" / ")}` : ""}
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>
                ${parseFloat(v.price).toFixed(2)}{v.weight_grams ? ` · ${v.weight_grams}g` : ""} · stock {v.inventory?.[0]?.quantity ?? 0}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <IconBtn icon="ti-edit" onClick={() => setEditing(v)} label="Edit variant" />
              <IconBtn icon="ti-trash" onClick={() => setConfirm(v)} label="Delete variant" danger />
            </div>
          </div>
        ))
      )}

      {editing !== null && (
        <VariantModal
          productId={productId}
          variant={editing === "new" ? null : editing}
          soldByWeight={soldByWeight}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            toast.success(editing === "new" ? "Variant added" : "Variant updated");
          }}
        />
      )}
      {confirm && (
        <Confirm
          msg={`Delete variant "${confirm.sku}"? This cannot be undone.`}
          onConfirm={() => doDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/**
 * Single-variant editor. When `soldByWeight` is true, shows a small
 * "$/kg" helper that auto-fills Price from Weight × rate — still fully
 * editable afterward. This is what stops admins from hand-typing the
 * same flat price into every weight tier.
 */
function VariantModal({ productId, variant, soldByWeight, onClose, onSaved }: { productId: string; variant: Variant | null; soldByWeight?: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    sku: variant?.sku || "",
    price: variant?.price ? String(variant.price) : "",
    compare_at_price: variant?.compare_at_price ? String(variant.compare_at_price) : "",
    color: variant?.color || "",
    size: variant?.size || "",
    weight_grams: variant?.weight_grams != null ? String(variant.weight_grams) : "",
    stock: String(variant?.inventory?.[0]?.quantity ?? 10),
    low_stock_threshold: String(variant?.inventory?.[0]?.low_stock_threshold ?? 5),
  });
  const [pricePerKg, setPricePerKg] = useState("");
  const [saving, setSaving] = useState(false);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function applyRate(rate: string, weightStr = form.weight_grams) {
    const w = parseFloat(weightStr);
    const r = parseFloat(rate);
    if (!w || !r) return;
    setF("price", ((r * w) / 1000).toFixed(2));
  }

  async function save() {
    if (!form.sku.trim() || !form.price) { toast.error("SKU and price are required"); return; }
    setSaving(true);
    const body = {
      sku: form.sku,
      price: parseFloat(form.price) || 0,
      compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
      color: form.color || null,
      size: form.size || null,
      weight_grams: form.weight_grams ? parseInt(form.weight_grams) : null,
      stock: parseInt(form.stock) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
    };
    try {
      if (variant) await apiFetch(`/admin/products/${productId}/variants/${variant.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch(`/admin/products/${productId}/variants`, { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={variant ? `Edit variant — ${variant.sku}` : "New variant"}
      onClose={onClose}
      width={480}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : variant ? "Save" : "Add variant"}</Btn></>}
    >
      <FRow>
        <FG label="SKU" half><input style={inputStyle} value={form.sku} onChange={e => setF("sku", e.target.value)} placeholder="SKU-001" /></FG>
        <FG label="Weight (grams)" half>
          <input
            style={inputStyle}
            type="number"
            value={form.weight_grams}
            onChange={e => {
              setF("weight_grams", e.target.value);
              if (pricePerKg) applyRate(pricePerKg, e.target.value);
            }}
            placeholder="e.g. 500"
            disabled={!soldByWeight}
          />
        </FG>
      </FRow>

      {soldByWeight && (
        <FG label="Quick calc from $/kg (optional)">
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              value={pricePerKg}
              onChange={e => { setPricePerKg(e.target.value); applyRate(e.target.value); }}
              placeholder="e.g. 110 for $110/kg"
            />
            <Btn size="sm" onClick={() => applyRate(pricePerKg)} disabled={!pricePerKg || !form.weight_grams}>Apply</Btn>
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
            Fills Price below using rate × weight above. Price stays editable after.
          </div>
        </FG>
      )}

      <FRow>
        <FG label="Price ($)" half><input style={inputStyle} type="number" step="0.01" value={form.price} onChange={e => setF("price", e.target.value)} /></FG>
        <FG label="Compare price ($)" half><input style={inputStyle} type="number" step="0.01" value={form.compare_at_price} onChange={e => setF("compare_at_price", e.target.value)} /></FG>
      </FRow>
      <FRow>
        <FG label="Stock qty" half><input style={inputStyle} type="number" value={form.stock} onChange={e => setF("stock", e.target.value)} /></FG>
        <FG label="Low stock threshold" half><input style={inputStyle} type="number" value={form.low_stock_threshold} onChange={e => setF("low_stock_threshold", e.target.value)} /></FG>
      </FRow>
      <FRow>
        <FG label="Color" half><input style={inputStyle} value={form.color} onChange={e => setF("color", e.target.value)} placeholder="Black" /></FG>
        <FG label="Size" half><input style={inputStyle} value={form.size} onChange={e => setF("size", e.target.value)} placeholder="—" /></FG>
      </FRow>
    </Modal>
  );
}

/**
 * New-product form. When "Sold by weight" is Yes, shows a "Price per kg"
 * shortcut above the variant list — entering it (or editing any variant's
 * weight) fills price = rate × weight for every row, still editable per row.
 */
function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [variants, setVariants] = useState<any[]>(
    product?.product_variants?.length
      ? product.product_variants.map(v => ({ ...v, stock: v.inventory?.[0]?.quantity ?? 0 }))
      : [{ sku: "", price: "", compare_at_price: "", color: "", size: "", weight_grams: "", stock: 10 }]
  );
  const [form, setForm] = useState({
    name: product?.name || "",
    name_ar: (product as any)?.name_ar || "",
    slug: product?.slug || "",
    brand: product?.brand || "",
    description: (product as any)?.description || "",
    description_ar: (product as any)?.description_ar || "",
    category_id: product?.categories?.id || "",
    image_url: "",
    is_active: product ? product.is_active : true,
    is_featured: (product as any)?.is_featured ?? false,
    is_best_seller: (product as any)?.is_best_seller ?? false,
    sold_by_weight: (product as any)?.sold_by_weight ?? false,
  });
  const [pricePerKg, setPricePerKg] = useState("");
  const slugTouched = useRef(false);

  useEffect(() => {
    apiFetch("/categories").then(d => setCats(d.categories || [])).catch(() => { });
  }, []);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function updateVariant(i: number, k: string, v: string) {
    setVariants(vs => vs.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  }

  function applyPricePerKgToAll(rate: string) {
    const r = parseFloat(rate);
    if (!r) return;
    setVariants(vs => vs.map(v => {
      const w = parseFloat(v.weight_grams);
      if (!w) return v;
      return { ...v, price: ((r * w) / 1000).toFixed(2) };
    }));
  }

  async function save() {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Name and slug are required"); return; }

    const invalidVariant = variants.find(v => !v.sku?.trim() || !v.price);
    if (invalidVariant) {
      toast.error("Every variant needs a SKU and a price.");
      return;
    }

    setSaving(true);
    const body = {
      ...form,
      variants: variants.map(v => ({
        sku: v.sku,
        price: parseFloat(v.price) || 0,
        compare_at_price: parseFloat(v.compare_at_price) || 0,
        stock: parseInt(v.stock) || 0,
        color: v.color || null,
        size: v.size || null,
        weight_grams: v.weight_grams ? parseInt(v.weight_grams) : null,
      })),
      images: form.image_url
        ? [{ url: form.image_url, alt_text: form.name, is_primary: true, sort_order: 0 }]
        : [],
    };
    try {
      if (product) await apiFetch(`/admin/products/${product.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/admin/products", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={product ? `Edit — ${product.name}` : "New product"}
      onClose={onClose}
      width={600}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : product ? "Save changes" : "Create product"}
          </Btn>
        </>
      }
    >
      <FRow>
        <FG label="Product name (English)" half>
          <input style={inputStyle} value={form.name} onChange={e => {
            setField("name", e.target.value);
            if (!slugTouched.current) setField("slug", autoSlug(e.target.value));
          }} />
        </FG>
        <FG label="Product name (Arabic)" half>
          <input style={{ ...inputStyle, direction: "rtl", textAlign: "right" }} value={form.name_ar} onChange={e => setField("name_ar", e.target.value)} placeholder="اسم المنتج بالعربي" />
        </FG>
      </FRow>
      <FRow>
        <FG label="Brand" half>
          <input style={inputStyle} value={form.brand} onChange={e => setField("brand", e.target.value)} />
        </FG>
        <FG label="Category" half>
          <select style={inputStyle} value={form.category_id} onChange={e => setField("category_id", e.target.value)}>
            <option value="">— select —</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FG>
      </FRow>
      <FG label="Slug">
        <input style={inputStyle} value={form.slug} onChange={e => {
          slugTouched.current = true;
          setField("slug", e.target.value);
        }} />
      </FG>
      <FG label="Description (English)">
        <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={form.description} onChange={e => setField("description", e.target.value)} />
      </FG>
      <FG label="Description (Arabic)">
        <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical", direction: "rtl", textAlign: "right" }} value={form.description_ar} onChange={e => setField("description_ar", e.target.value)} placeholder="وصف المنتج بالعربي" />
      </FG>
      <FG label="Image URL">
        <input style={inputStyle} value={form.image_url} onChange={e => setField("image_url", e.target.value)} placeholder="https://…" />
      </FG>
      <FG label="Status">
        <select style={inputStyle} value={form.is_active ? "1" : "0"} onChange={e => setField("is_active", e.target.value === "1")}>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </FG>
      <FG label="Featured on home page">
        <select style={inputStyle} value={form.is_featured ? "1" : "0"} onChange={e => setField("is_featured", e.target.value === "1")}>
          <option value="0">No</option>
          <option value="1">Yes — show in Featured Products</option>
        </select>
      </FG>
      <FG label="Best Seller">
        <select style={inputStyle} value={form.is_best_seller ? "1" : "0"} onChange={e => setField("is_best_seller", e.target.value === "1")}>
          <option value="0">No</option>
          <option value="1">Yes — show in Best Sellers</option>
        </select>
      </FG>

      <FG label="Sold by weight">
        <select style={inputStyle} value={form.sold_by_weight ? "1" : "0"} onChange={e => setField("sold_by_weight", e.target.value === "1")}>
          <option value="0">No — sold as fixed units</option>
          <option value="1">Yes — customer picks a weight (e.g. 250g / 500g / 1kg)</option>
        </select>
      </FG>

      {form.sold_by_weight && !product && (
        <FG label="Price per kg ($) — optional shortcut">
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              value={pricePerKg}
              onChange={e => { setPricePerKg(e.target.value); applyPricePerKgToAll(e.target.value); }}
              placeholder="e.g. 110 for $110/kg"
            />
            <Btn size="sm" onClick={() => applyPricePerKgToAll(pricePerKg)} disabled={!pricePerKg}>
              Apply to all variants
            </Btn>
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
            Set each variant's weight below, then apply — this fills price = rate × weight. Still editable per-variant after.
          </div>
        </FG>
      )}

      {product && <ProductImagesSection productId={product.id} />}

      {product ? (
        <VariantsSection productId={product.id} />
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", margin: "16px 0 8px" }}>Variants</div>
          {variants.map((v, i) => (
            <div key={i} style={{ border: `0.5px solid ${T.border}`, borderRadius: T.radius, padding: 12, marginBottom: 10, position: "relative" }}>
              {variants.length > 1 && (
                <IconBtn icon="ti-x" onClick={() => setVariants(vs => vs.filter((_, idx) => idx !== i))} label="Remove variant" style={{ position: "absolute", top: 8, right: 8 }} />
              )}
              <FRow>
                <FG label="SKU" half><input style={inputStyle} value={v.sku} onChange={e => updateVariant(i, "sku", e.target.value)} placeholder="SKU-001" /></FG>
                <FG label="Price ($)" half><input style={inputStyle} type="number" step="0.01" value={v.price} onChange={e => updateVariant(i, "price", e.target.value)} /></FG>
              </FRow>
              <FRow>
                <FG label="Compare price ($)" half><input style={inputStyle} type="number" step="0.01" value={v.compare_at_price} onChange={e => updateVariant(i, "compare_at_price", e.target.value)} /></FG>
                <FG label="Stock qty" half><input style={inputStyle} type="number" value={v.stock} onChange={e => updateVariant(i, "stock", e.target.value)} /></FG>
              </FRow>
              <FRow>
                <FG label="Color" half><input style={inputStyle} value={v.color || ""} onChange={e => updateVariant(i, "color", e.target.value)} placeholder="Black" /></FG>
                <FG label="Size" half><input style={inputStyle} value={v.size || ""} onChange={e => updateVariant(i, "size", e.target.value)} placeholder="—" /></FG>
              </FRow>
              {form.sold_by_weight && (
                <FG label="Weight (grams)">
                  <input
                    style={inputStyle}
                    type="number"
                    value={v.weight_grams || ""}
                    onChange={e => {
                      updateVariant(i, "weight_grams", e.target.value);
                      if (pricePerKg) {
                        const w = parseFloat(e.target.value);
                        const r = parseFloat(pricePerKg);
                        if (w && r) updateVariant(i, "price", ((r * w) / 1000).toFixed(2));
                      }
                    }}
                    placeholder="e.g. 500"
                  />
                </FG>
              )}
            </div>
          ))}
          <Btn size="sm" onClick={() => setVariants(vs => [...vs, { sku: "", price: "", compare_at_price: "", color: "", size: "", weight_grams: "", stock: 10 }])}>
            <i className="ti ti-plus" aria-hidden /> Add variant
          </Btn>
        </>
      )}
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  CATEGORIES                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */

function CategoriesPanel() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Category | "new" | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/categories"); setCats(d.categories || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doDelete(c: Category) {
    try {
      // 1. Fetch products in this category
      const d = await apiFetch(`/admin/products?limit=200`);
      const inCat = (d.products || []).filter((p: any) => p.categories?.id === c.id || p.category_id === c.id);

      // 2. Delete each product
      for (const p of inCat) {
        await apiFetch(`/admin/products/${p.id}`, { method: "DELETE" });
      }

      // 3. Delete the category
      await apiFetch(`/admin/categories/${c.id}`, { method: "DELETE" });
      toast.success("Category and its products deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirm(null);
    }
  }

  return (
    <div>
      <PageHeader title="Categories" subtitle={`${cats.length} categor${cats.length !== 1 ? "ies" : "y"}`}>
        <Btn variant="primary" onClick={() => setModal("new")}><i className="ti ti-plus" aria-hidden /> Add category</Btn>
      </PageHeader>
      <Card noPad>
        {loading ? <Spinner /> : cats.length === 0 ? <Empty>No categories yet.</Empty> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Name</Th><Th>Slug</Th><Th>Parent</Th><Th w="80px" /></tr></thead>
            <tbody>
              {cats.map(c => (
                <tr key={c.id} className="adm-tr">
                  <Td bold>{c.name}</Td>
                  <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.muted }}>{c.slug}</span></Td>
                  <Td muted>{cats.find(p => p.id === c.parent_id)?.name || "—"}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconBtn icon="ti-edit" onClick={() => setModal(c)} label="Edit" />
                      <IconBtn icon="ti-trash" onClick={() => setConfirm(c)} label="Delete" danger />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal !== null && (
        <CategoryModal
          all={cats}
          category={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); toast.success(modal === "new" ? "Category created" : "Category updated"); }}
        />
      )}
      {confirm && (
        <Confirm
          msg={`Delete "${confirm.name}"? This will permanently delete the category AND all its products.`}
          onConfirm={() => doDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function CategoryModal({ category, all, onClose, onSaved }: { category: Category | null; all: Category[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    parent_id: category?.parent_id || "",
    image_url: category?.image_url || "",
  });
  const [saving, setSaving] = useState(false);
  const touched = useRef(false);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Name and slug required"); return; }
    setSaving(true);
    const body = { ...form, parent_id: form.parent_id || null, image_url: form.image_url || null };
    try {
      if (category) await apiFetch(`/admin/categories/${category.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/admin/categories", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={category ? `Edit — ${category.name}` : "New category"}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : category ? "Save" : "Create"}</Btn>
        </>
      }
    >
      <FG label="Name">
        <input style={inputStyle} value={form.name} onChange={e => {
          setF("name", e.target.value);
          if (!touched.current) setF("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
        }} />
      </FG>
      <FG label="Slug">
        <input style={inputStyle} value={form.slug} onChange={e => { touched.current = true; setF("slug", e.target.value); }} />
      </FG>
      <FG label="Parent category">
        <select style={inputStyle} value={form.parent_id} onChange={e => setF("parent_id", e.target.value)}>
          <option value="">None</option>
          {all.filter(c => c.id !== category?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </FG>
      <FG label="Image URL">
        <input style={inputStyle} value={form.image_url} onChange={e => setF("image_url", e.target.value)} placeholder="https://…" />
      </FG>




    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ORDERS                                                                     */
/* ══════════════════════════════════════════════════════════════════════════ */

const ORDER_STATUSES = ["", "pending", "processing", "shipped", "delivered", "cancelled"] as const;

function OrdersPanel({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState<Order | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  const load = useCallback(async (status = filter) => {
    setLoading(true);
    try {
      const d = await apiFetch(`/admin/orders?limit=100${status ? `&status=${status}` : ""}`);
      setOrders(d.orders || []);
      if (!status) {
        const pending = (d.orders || []).filter((o: Order) => o.status === "pending").length;
        onCountChange?.(pending);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function openOrder(o: Order) {
    try { const d = await apiFetch(`/orders/${o.id}`); setDetail(d.order); }
    catch { setDetail(o); }
    setModal(o);
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} order${orders.length !== 1 ? "s" : ""}`} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {ORDER_STATUSES.map(s => (
          <Btn key={s} size="sm" variant={filter === s ? "primary" : "default"} onClick={() => { setFilter(s); load(s); }}>
            {s || "All"}
          </Btn>
        ))}
      </div>
      <Card noPad>
        {loading ? <Spinner /> : orders.length === 0 ? <Empty>No orders{filter ? ` with status "${filter}"` : ""}.</Empty> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <Th w="120px">Order ID</Th><Th>Customer</Th><Th w="90px">Date</Th>
                  <Th w="90px">Payment</Th><Th w="90px">Status</Th><Th w="80px">Total</Th><Th w="70px" />
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="adm-tr">
                    <Td mono>{o.id.slice(0, 8)}…</Td>
                    <Td>{o.profiles?.full_name || "Guest"}</Td>
                    <Td muted>{new Date(o.created_at).toLocaleDateString()}</Td>
                    <Td><Badge label={o.payments?.[0]?.method || "—"} variant={o.payments?.[0]?.status === "paid" ? "green" : "amber"} /></Td>
                    <Td><Badge label={o.status} variant={statusVariant(o.status)} /></Td>
                    <Td bold>${parseFloat(o.total_amount).toFixed(2)}</Td>
                    <Td><Btn size="sm" onClick={() => openOrder(o)}>Manage</Btn></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <OrderModal
          order={modal}
          detail={detail}
          onClose={() => { setModal(null); setDetail(null); }}
          onSaved={() => { setModal(null); setDetail(null); load(); toast.success("Order updated"); }}
        />
      )}
    </div>
  );
}

function OrderModal({ order, detail, onClose, onSaved }: { order: Order; detail: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ status: order.status, note: "", trackingNumber: "", carrier: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await apiFetch(`/admin/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify(form) }); onSaved(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <Modal
      title={`Order ${order.id.slice(0, 8)}…`}
      onClose={onClose}
      width={540}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Update order"}</Btn>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: T.bg2, borderRadius: T.radius, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Customer</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{order.profiles?.full_name || "Guest"}</div>
        </div>
        <div style={{ background: T.bg2, borderRadius: T.radius, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Total</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>${parseFloat(order.total_amount).toFixed(2)}</div>
        </div>
      </div>

      {detail?.order_items?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 500, marginBottom: 6 }}>Items</div>
          {detail.order_items.map((item: any) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `0.5px solid ${T.border}`, fontSize: 12 }}>
              <span>{item.product_name} ×{item.quantity}</span>
              <span style={{ color: T.muted }}>${parseFloat(item.total_price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <FG label="Update status">
        <select style={inputStyle} value={form.status} onChange={e => setF("status", e.target.value)}>
          {["pending", "processing", "shipped", "delivered", "cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </FG>

      <FG label="Internal note">
        <input style={inputStyle} value={form.note} onChange={e => setF("note", e.target.value)} placeholder="Optional note…" />
      </FG>
      <FRow>
        <FG label="Tracking number" half>
          <input style={inputStyle} value={form.trackingNumber} onChange={e => setF("trackingNumber", e.target.value)} placeholder="TRK123456" />
        </FG>
        <FG label="Carrier" half>
          <input style={inputStyle} value={form.carrier} onChange={e => setF("carrier", e.target.value)} placeholder="Aramex" />
        </FG>
      </FRow>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  INVENTORY                                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */

function InventoryPanel() {
  const [inv, setInv] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);
  const [modal, setModal] = useState<InvItem | null>(null);

  const load = useCallback(async (low = lowOnly) => {
    setLoading(true);
    try { const d = await apiFetch(`/admin/inventory${low ? "?lowStock=true" : ""}`); setInv(d.inventory || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [lowOnly]);

  useEffect(() => { load(); }, [load]);

  const lowCount = inv.filter(i => i.quantity <= i.low_stock_threshold).length;

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${inv.length} SKUs${lowCount > 0 ? ` · ${lowCount} low stock` : ""}`}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: T.muted }}>
          <input type="checkbox" checked={lowOnly} onChange={e => { setLowOnly(e.target.checked); load(e.target.checked); }} />
          Low stock only
        </label>
      </PageHeader>
      <Card noPad>
        {loading ? <Spinner /> : inv.length === 0 ? <Empty>{lowOnly ? "No low-stock items." : "No inventory records."}</Empty> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Product</Th><Th>SKU</Th><Th>Variant</Th><Th>Qty</Th><Th>Threshold</Th><Th w="70px" /></tr></thead>
              <tbody>
                {inv.map(i => {
                  const pv = i.product_variants;
                  const isLow = i.quantity <= i.low_stock_threshold;
                  return (
                    <tr key={i.id} className="adm-tr">
                      <Td bold>{pv?.products?.name || "—"}</Td>
                      <Td mono>{pv?.sku || "—"}</Td>
                      <Td muted>{[pv?.color, pv?.size].filter(Boolean).join(" / ") || "—"}</Td>
                      <Td><Badge label={String(i.quantity)} variant={i.quantity === 0 ? "red" : isLow ? "amber" : "green"} /></Td>
                      <Td muted>{i.low_stock_threshold}</Td>
                      <Td><IconBtn icon="ti-edit" onClick={() => setModal(i)} label="Edit stock" /></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <InventoryModal
          item={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); toast.success("Stock updated"); }}
        />
      )}
    </div>
  );
}

function InventoryModal({ item, onClose, onSaved }: { item: InvItem; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(String(item.quantity));
  const [thresh, setThresh] = useState(String(item.low_stock_threshold));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/admin/inventory/${item.id}`, { method: "PATCH", body: JSON.stringify({ quantity: parseInt(qty), low_stock_threshold: parseInt(thresh) }) });
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={`Edit stock — ${item.product_variants?.products?.name || "item"}`}
      onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn></>}
    >
      <FRow>
        <FG label="Quantity" half><input style={inputStyle} type="number" value={qty} onChange={e => setQty(e.target.value)} /></FG>
        <FG label="Low stock threshold" half><input style={inputStyle} type="number" value={thresh} onChange={e => setThresh(e.target.value)} /></FG>
      </FRow>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  COUPONS                                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */

function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Coupon | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/admin/coupons"); setCoupons(d.coupons || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(c: Coupon) {
    try {
      await apiFetch(`/admin/coupons/${c.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !c.is_active }) });
      toast.success(`Coupon ${c.is_active ? "deactivated" : "activated"}`);
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <PageHeader title="Coupons" subtitle={`${coupons.length} coupon${coupons.length !== 1 ? "s" : ""}`}>
        <Btn variant="primary" onClick={() => setModal("new")}><i className="ti ti-plus" aria-hidden /> Create coupon</Btn>
      </PageHeader>
      <Card noPad>
        {loading ? <Spinner /> : coupons.length === 0 ? <Empty>No coupons yet.</Empty> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Code</Th><Th>Discount</Th><Th>Min order</Th><Th>Used</Th><Th>Expires</Th><Th>Status</Th><Th w="90px" /></tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="adm-tr">
                  <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500 }}>{c.code}</span></Td>
                  <Td>{c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`}</Td>
                  <Td muted>{c.minimum_order_amount ? `$${c.minimum_order_amount}` : "—"}</Td>
                  <Td muted>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</Td>
                  <Td muted>{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : "—"}</Td>
                  <Td><Badge label={c.is_active ? "Active" : "Inactive"} variant={c.is_active ? "green" : "gray"} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconBtn icon="ti-edit" onClick={() => setModal(c)} label="Edit coupon" />
                      <IconBtn icon={c.is_active ? "ti-player-pause" : "ti-player-play"} onClick={() => toggleActive(c)} label={c.is_active ? "Deactivate" : "Activate"} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal !== null && (
        <CouponModal
          coupon={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); toast.success(modal === "new" ? "Coupon created" : "Coupon updated"); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SHIPPING METHODS                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */

interface ShippingMethod { id: string; name: string; carrier: string | null; price: number; estimated_days_min: number | null; estimated_days_max: number | null; is_active: boolean; }

function ShippingMethodsPanel() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ShippingMethod | "new" | null>(null);
  const [confirm, setConfirm] = useState<ShippingMethod | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/admin/shipping-methods"); setMethods(d.shippingMethods || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doDeactivate(m: ShippingMethod) {
    try { await apiFetch(`/admin/shipping-methods/${m.id}`, { method: "DELETE" }); toast.success("Shipping method deactivated"); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setConfirm(null); }
  }

  return (
    <div>
      <PageHeader title="Shipping methods" subtitle={`${methods.length} method${methods.length !== 1 ? "s" : ""}`}>
        <Btn variant="primary" onClick={() => setModal("new")}><i className="ti ti-plus" aria-hidden /> Add method</Btn>
      </PageHeader>
      <Card noPad>
        {loading ? <Spinner /> : methods.length === 0 ? <Empty>No shipping methods yet.</Empty> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Name</Th><Th>Carrier</Th><Th>Price</Th><Th>Est. days</Th><Th>Status</Th><Th w="80px" /></tr></thead>
            <tbody>
              {methods.map(m => (
                <tr key={m.id} className="adm-tr">
                  <Td bold>{m.name}</Td>
                  <Td muted>{m.carrier || "—"}</Td>
                  <Td>${Number(m.price).toFixed(2)}</Td>
                  <Td muted>{m.estimated_days_min != null ? `${m.estimated_days_min}-${m.estimated_days_max ?? m.estimated_days_min}d` : "—"}</Td>
                  <Td><Badge label={m.is_active ? "Active" : "Inactive"} variant={m.is_active ? "green" : "gray"} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconBtn icon="ti-edit" onClick={() => setModal(m)} label="Edit" />
                      <IconBtn icon="ti-trash" onClick={() => setConfirm(m)} label="Deactivate" danger />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal !== null && (
        <ShippingMethodModal
          method={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); toast.success(modal === "new" ? "Method created" : "Method updated"); }}
        />
      )}
      {confirm && (
        <Confirm
          msg={`Deactivate "${confirm.name}"? It will no longer be offered at checkout.`}
          onConfirm={() => doDeactivate(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ShippingMethodModal({ method, onClose, onSaved }: { method: ShippingMethod | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: method?.name || "",
    carrier: method?.carrier || "",
    price: String(method?.price ?? ""),
    estimated_days_min: String(method?.estimated_days_min ?? ""),
    estimated_days_max: String(method?.estimated_days_max ?? ""),
    is_active: method ? method.is_active : true,
  });
  const [saving, setSaving] = useState(false);

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    const body = {
      ...form,
      price: parseFloat(form.price),
      estimated_days_min: form.estimated_days_min ? parseInt(form.estimated_days_min) : null,
      estimated_days_max: form.estimated_days_max ? parseInt(form.estimated_days_max) : null,
    };
    try {
      if (method) await apiFetch(`/admin/shipping-methods/${method.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/admin/shipping-methods", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={method ? `Edit — ${method.name}` : "New shipping method"}
      onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : method ? "Save" : "Create"}</Btn></>}
    >
      <FRow>
        <FG label="Name" half><input style={inputStyle} value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Standard shipping" /></FG>
        <FG label="Carrier" half><input style={inputStyle} value={form.carrier} onChange={e => setF("carrier", e.target.value)} placeholder="Aramex" /></FG>
      </FRow>
      <FRow>
        <FG label="Price ($)" half><input style={inputStyle} type="number" step="0.01" value={form.price} onChange={e => setF("price", e.target.value)} /></FG>
        <FG label="Status" half>
          <select style={inputStyle} value={form.is_active ? "1" : "0"} onChange={e => setF("is_active", e.target.value === "1")}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </FG>
      </FRow>
      <FRow>
        <FG label="Min delivery days" half><input style={inputStyle} type="number" value={form.estimated_days_min} onChange={e => setF("estimated_days_min", e.target.value)} /></FG>
        <FG label="Max delivery days" half><input style={inputStyle} type="number" value={form.estimated_days_max} onChange={e => setF("estimated_days_max", e.target.value)} /></FG>
      </FRow>
    </Modal>
  );
}

function CouponModal({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: coupon?.code || "",
    description: coupon?.description || "",
    discount_type: coupon?.discount_type || "percentage",
    discount_value: String(coupon?.discount_value || ""),
    minimum_order_amount: String(coupon?.minimum_order_amount || ""),
    usage_limit: String(coupon?.usage_limit || ""),
    expiry_date: coupon?.expiry_date?.split("T")[0] || "",
    is_active: coupon ? coupon.is_active : true,
  });
  const [saving, setSaving] = useState(false);

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.code.trim() || !form.discount_value) { toast.error("Code and discount value required"); return; }
    setSaving(true);
    const body = {
      ...form,
      discount_value: parseFloat(form.discount_value),
      minimum_order_amount: form.minimum_order_amount ? parseFloat(form.minimum_order_amount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      expiry_date: form.expiry_date || null,
    };
    try {
      if (coupon) await apiFetch(`/admin/coupons/${coupon.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      title={coupon ? `Edit — ${coupon.code}` : "New coupon"}
      onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : coupon ? "Save" : "Create"}</Btn></>}
    >
      <FRow>
        <FG label="Coupon code" half>
          <input style={{ ...inputStyle, textTransform: "uppercase" }} value={form.code} onChange={e => setF("code", e.target.value.toUpperCase())} placeholder="SUMMER20" />
        </FG>
        <FG label="Discount type" half>
          <select style={inputStyle} value={form.discount_type} onChange={e => setF("discount_type", e.target.value)}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed ($)</option>
          </select>
        </FG>
      </FRow>
      <FRow>
        <FG label="Discount value" half>
          <input style={inputStyle} type="number" step="0.01" value={form.discount_value} onChange={e => setF("discount_value", e.target.value)} />
        </FG>
        <FG label="Minimum order ($)" half>
          <input style={inputStyle} type="number" step="0.01" value={form.minimum_order_amount} onChange={e => setF("minimum_order_amount", e.target.value)} placeholder="0.00" />
        </FG>
      </FRow>
      <FRow>
        <FG label="Usage limit" half>
          <input style={inputStyle} type="number" value={form.usage_limit} onChange={e => setF("usage_limit", e.target.value)} placeholder="Unlimited" />
        </FG>
        <FG label="Expiry date" half>
          <input style={inputStyle} type="date" value={form.expiry_date} onChange={e => setF("expiry_date", e.target.value)} />
        </FG>
      </FRow>
      <FG label="Description">
        <input style={inputStyle} value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Optional description…" />
      </FG>
      <FG label="Status">
        <select style={inputStyle} value={form.is_active ? "1" : "0"} onChange={e => setF("is_active", e.target.value === "1")}>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </FG>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  CUSTOMERS                                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */

function CustomersPanel() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<Customer | null>(null);

  async function toggleAdmin(c: Customer) {
    try {
      await apiFetch(`/admin/customers/${c.id}/admin-status`, { method: "PATCH", body: JSON.stringify({ is_admin: !c.is_admin }) });
      toast.success(c.is_admin ? "Admin access removed" : "Admin access granted");
      setCustomers(cs => cs.map(x => x.id === c.id ? { ...x, is_admin: !c.is_admin } : x));
      setDetail((d: any) => d ? { ...d, customer: { ...d.customer, is_admin: !c.is_admin } } : d);
    } catch (e: any) { toast.error(e.message); }
    finally { setConfirmAdmin(null); }
  }

  useEffect(() => {
    apiFetch("/admin/customers")
      .then(d => setCustomers(d.customers || []))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    (c.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  async function loadDetail(c: Customer) {
    try { const d = await apiFetch(`/admin/customers/${c.id}`); setDetail(d); }
    catch { setDetail({ customer: c }); }
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} registered`} />
      <div style={{ marginBottom: 14 }}><SearchBox value={search} onChange={setSearch} placeholder="Search by name…" /></div>
      <Card noPad>
        {loading ? <Spinner /> : filtered.length === 0 ? <Empty>No customers found.</Empty> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Customer</Th><Th>Phone</Th><Th>Registered</Th><Th w="70px" /></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="adm-tr">
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                        {(c.full_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{c.full_name || "Anonymous"}</span>
                    </div>
                  </Td>
                  <Td muted>{c.phone || "—"}</Td>
                  <Td muted>{new Date(c.created_at).toLocaleDateString()}</Td>
                  <Td><IconBtn icon="ti-eye" onClick={() => loadDetail(c)} label="View customer" /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {detail && (
        <Modal
          title={`Customer — ${detail.customer?.full_name || "detail"}`}
          onClose={() => setDetail(null)}
          footer={<Btn onClick={() => setDetail(null)}>Close</Btn>}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ background: T.bg2, borderRadius: T.radius, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Total spent</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>${Number(detail.totalSpent || 0).toFixed(2)}</div>
            </div>
            <div style={{ background: T.bg2, borderRadius: T.radius, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Orders</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{detail.orders?.length || 0}</div>
            </div>
          </div>
          {detail.orders?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 500, marginBottom: 6 }}>Order history</div>
              {detail.orders.slice(0, 8).map((o: any) => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `0.5px solid ${T.border}`, fontSize: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: T.muted }}>{o.id.slice(0, 8)}…</span>
                  <Badge label={o.status} variant={statusVariant(o.status)} />
                  <span style={{ fontWeight: 500 }}>${parseFloat(o.total_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  REVIEWS                                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */

function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/admin/reviews"); setReviews(d.reviews || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleVerified(r: Review) {
    try { await apiFetch(`/admin/reviews/${r.id}`, { method: "PATCH", body: JSON.stringify({ is_verified: !r.is_verified }) }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function doDelete(r: Review) {
    try { await apiFetch(`/admin/reviews/${r.id}`, { method: "DELETE" }); toast.success("Review deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setConfirm(null); }
  }

  return (
    <div>
      <PageHeader title="Reviews" subtitle={`${reviews.length} review${reviews.length !== 1 ? "s" : ""}`} />
      <Card noPad>
        {loading ? <Spinner /> : reviews.length === 0 ? <Empty>No reviews yet.</Empty> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Product</Th><Th>Customer</Th><Th>Rating</Th><Th>Comment</Th><Th>Verified</Th><Th w="80px" /></tr></thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id} className="adm-tr">
                  <Td bold>{r.products?.name || "—"}</Td>
                  <Td muted>{r.profiles?.full_name || "—"}</Td>
                  <Td>{"★".repeat(r.rating)}<span style={{ color: T.hint }}>{"★".repeat(5 - r.rating)}</span></Td>
                  <Td>
                    <span style={{ display: "block", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.muted, fontSize: 12 }}>
                      {r.comment || r.title || "—"}
                    </span>
                  </Td>
                  <Td><Badge label={r.is_verified ? "Verified" : "Pending"} variant={r.is_verified ? "green" : "amber"} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconBtn icon={r.is_verified ? "ti-x" : "ti-check"} onClick={() => toggleVerified(r)} label={r.is_verified ? "Unverify" : "Verify"} />
                      <IconBtn icon="ti-trash" onClick={() => setConfirm(r)} label="Delete review" danger />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {confirm && (
        <Confirm
          msg="Delete this review? This cannot be undone."
          onConfirm={() => doDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SHARED LAYOUT COMPONENTS                                                   */
/* ══════════════════════════════════════════════════════════════════════════ */

function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{children}</div>}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", display: "inline-block", width: 280 }}>
      <i className="ti ti-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.hint, pointerEvents: "none" }} aria-hidden />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingLeft: 30, width: "100%", boxSizing: "border-box" }}
      />
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function statusVariant(status: string): "green" | "amber" | "red" | "gray" | "blue" {
  const map: Record<string, any> = { delivered: "green", shipped: "blue", processing: "amber", pending: "amber", cancelled: "red" };
  return map[status] || "gray";
}