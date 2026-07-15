import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

/* ─── APP SETUP ──────────────────────────────────────────────────────────── */

const app = express();
const PORT = process.env.PORT || 5000;

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

/* ─── SUPABASE CLIENTS ───────────────────────────────────────────────────── */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

// Admin client — server-side only, never exposed to frontend
export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Used to verify user JWTs from incoming requests
const supabasePublic: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/* ─── STRIPE ─────────────────────────────────────────────────────────────── */


/* ─── TYPES ──────────────────────────────────────────────────────────────── */

interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
  isAdmin?: boolean;
}

/* ─── MIDDLEWARE ─────────────────────────────────────────────────────────── */

/**
 * Verifies Supabase JWT from Authorization header.
 * Attaches userId and userEmail to request.
 */
async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing or invalid authorization header." });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabasePublic.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }

  req.userId = user.id;
  req.userEmail = user.email;
  next();
}

/**
 * Must come after requireAuth.
 * Checks profiles.is_admin for admin-only routes.
 */
async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", req.userId)
    .single();

  if (!profile?.is_admin) {
    return res.status(403).json({ success: false, error: "Admin access required." });
  }

  req.isAdmin = true;
  next();
}



// Ensure your backend is querying all active methods
const { data, error } = await supabaseAdmin
  .from('shipping_methods')
  .select('*')
  .eq('is_active', true); // This will now return the 3 rows you just inserted

/* ─── PRODUCTS ───────────────────────────────────────────────────────────── */
/**
 * GET /api/products
 * Public. Returns active products with their primary image, cheapest variant price,
 * average rating, and category name.
 * Supports: ?category=slug, ?brand=, ?search=, ?sort=, ?page=, ?limit=
 */








app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const { category, brand, search, sort = "newest", page = "1", limit = "12" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabaseAdmin
      .from("products")
      .select(
        `
        id, name, name_ar, slug, description, description_ar, brand, is_active,
        is_featured, is_best_seller, sold_by_weight,
        categories (id, name, name_ar, slug),
        product_images (url, alt_text, is_primary),
        product_variants (
          id, sku, size, color, price, compare_at_price,
          weight_grams,
          inventory (id, quantity, low_stock_threshold)
        ),
        reviews (rating)
        `,
        { count: "exact" }
      )
      .eq("is_active", true);

    if (search) query = query.ilike("name", `%${search}%`);
    if (brand) query = query.eq("brand", brand);
    if (category) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", category)
        .single();
      if (cat) query = query.eq("category_id", cat.id);
    }

    const { data, error, count } = await query.range(offset, offset + parseInt(limit as string) - 1);
    if (error) throw error;

    const products = (data || []).map(shapeProduct);
    sortProducts(products, sort as string);

    res.json({ success: true, products, total: count, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});






























/**
 * GET /api/products/:slug
 * Public. Full product detail including all variants, images, reviews, inventory.
 */
app.get("/api/products/:slug", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        `
        id, name, name_ar, slug, description, description_ar, brand, is_active, category_id,
        is_featured, is_best_seller, sold_by_weight,
        categories (id, name, name_ar, slug),
        product_images (id, url, alt_text, is_primary, sort_order),
        product_variants (
          id, sku, size, color, price, compare_at_price,
          weight_grams,
          inventory (quantity, low_stock_threshold)
        ),
        reviews (
          id, rating, title, comment, created_at, is_verified,
          profiles (full_name, avatar_url),
          review_images (url)
        )
        `
      )
      .eq("slug", req.params.slug)
      .eq("is_active", true)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "Product not found." });

    res.json({ success: true, product: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
/* ─── CATEGORIES ─────────────────────────────────────────────────────────── */

/**
 * GET /api/categories
 * Public. Returns all categories with optional parent nesting.
 */
// Replace /api/brands with:
app.get("/api/brands", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("brands")
      .select("name, image_url, description, is_featured")
      .order("name");
    if (error) throw error;
    res.json({ success: true, brands: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET all brands
app.get("/api/admin/brands", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("brands")
      .select("*")
      .order("name");
    if (error) throw error;
    res.json({ success: true, brands: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE brand
app.post("/api/admin/brands", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, image_url, description, is_featured } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required." });
    const { data, error } = await supabaseAdmin
      .from("brands")
      .insert({ name, image_url: image_url || null, description: description || null, is_featured: !!is_featured })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, brand: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE brand
app.patch("/api/admin/brands/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, image_url, description, is_featured } = req.body;
    const { error } = await supabaseAdmin
      .from("brands")
      .update({ name, image_url, description, is_featured })
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE brand
app.delete("/api/admin/brands/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("brands")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload brand image to Supabase Storage
app.post("/api/admin/brands/upload-image", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fileName, fileType, fileBase64 } = req.body;
    if (!fileName || !fileBase64) {
      return res.status(400).json({ success: false, error: "fileName and fileBase64 required." });
    }
    const buffer = Buffer.from(fileBase64, "base64");
    const path = `${Date.now()}-${fileName}`;
    const { error } = await supabaseAdmin.storage
      .from("brands")
      .upload(path, buffer, { contentType: fileType || "image/jpeg", upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabaseAdmin.storage.from("brands").getPublicUrl(path);
    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, name, name_ar, slug, image_url, parent_id")
      .order("name");

    if (error) throw error;
    res.json({ success: true, categories: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Add these to server.ts BEFORE app.listen()

// Dashboard summary (called by DashboardView)
app.get("/api/admin/dashboard-summary", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [paymentsRes, ordersRes, customersRes, productsRes] = await Promise.all([
      supabaseAdmin.from("payments").select("amount, created_at").eq("status", "paid"),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const totalRevenue = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

    // Recent orders
    const { data: recentOrders } = await supabaseAdmin
      .from("orders")
      .select("id, status, total_amount, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(5);

    // Revenue last 7 days
    const revenueData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayRevenue = (paymentsRes.data || [])
        .filter((p: any) => p.created_at?.startsWith(dateStr))
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      revenueData.push({ date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: dayRevenue });
    }

    res.json({
      success: true,
      stats: {
        revenue: { value: parseFloat(totalRevenue.toFixed(2)), change: 0 },
        orders: { value: ordersRes.count ?? 0, change: 0 },
        customers: { value: customersRes.count ?? 0, change: 0 },
        products: { value: productsRes.count ?? 0, change: 0 },
      },
      recentOrders: (recentOrders || []).map((o: any) => ({
        ...o,
        customer_name: o.profiles?.full_name || "Guest",
      })),
      revenueData,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pending orders count (called by sidebar badge)
app.get("/api/admin/orders/count-pending", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    res.json({ success: true, count: count ?? 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ─── CART ───────────────────────────────────────────────────────────────── */

/**
 * GET /api/cart
 * Auth optional. Fetches cart by user_id (logged in) or session_id (guest).
 */
app.get("/api/cart", async (req: AuthedRequest, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user } } = await supabasePublic.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const cartQuery = supabaseAdmin
      .from("carts")
      .select("id")
      .limit(1);

    const cartResult = userId
      ? await cartQuery.eq("user_id", userId).single()
      : await cartQuery.eq("session_id", sessionId).single();



























    if (!cartResult.data) return res.json({ success: true, items: [], giftBoxItems: [] });

    const { data: items, error } = await supabaseAdmin
      .from("cart_items")
      .select(
        `
        id, quantity,
        product_variants (
          id, sku, price, compare_at_price, size, color,
          products (id, name, slug, sold_by_weight, product_images (url, alt_text, is_primary))
        )
        `
      )
      .eq("cart_id", cartResult.data.id);

    if (error) throw error;

    const { data: giftBoxItems, error: gbError } = await supabaseAdmin
      .from("cart_gift_box_items")
      .select(
        `
        id, quantity,
        gift_boxes ( id, name, slug, base_price, image_url ),
        cart_gift_box_item_contents (
          id, quantity,
          product_variants ( id, sku, size, color, products(id, name) )
        )
        `
      )
      .eq("cart_id", cartResult.data.id);

    if (gbError) throw gbError;

    res.json({ success: true, cartId: cartResult.data.id, items, giftBoxItems: giftBoxItems || [] });












  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cart/items
 * Adds an item. Creates cart row if it doesn't exist yet.
 *
 * `quantity` means different things depending on the product:
 *  - unit-sold products  -> number of units
 *  - weight-sold products -> number of GRAMS (variant.price is $/gram for these)
 * The frontend is responsible for sending the right number; this route just
 * checks it against inventory.quantity, which uses the same unit.
 */
app.post("/api/cart/items", async (req: AuthedRequest, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user } } = await supabasePublic.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { variantId, quantity = 1 } = req.body;
    if (!variantId) return res.status(400).json({ success: false, error: "variantId is required." });

    // Check stock
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("quantity")
      .eq("variant_id", variantId)
      .single();

    if (!inv || inv.quantity < quantity) {
      return res.status(400).json({ success: false, error: "Insufficient stock." });
    }

    // Get or create cart
    let cartId: string;
    const cartMatch = userId
      ? await supabaseAdmin.from("carts").select("id").eq("user_id", userId).single()
      : await supabaseAdmin.from("carts").select("id").eq("session_id", sessionId).single();

    if (cartMatch.data) {
      cartId = cartMatch.data.id;
    } else {
      const { data: newCart, error: cartErr } = await supabaseAdmin
        .from("carts")
        .insert(userId ? { user_id: userId } : { session_id: sessionId })
        .select("id")
        .single();
      if (cartErr) throw cartErr;
      cartId = newCart.id;
    }

    // Upsert cart item (increment if already exists)
    const { data: existing } = await supabaseAdmin
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("variant_id", variantId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("cart_items").insert({ cart_id: cartId, variant_id: variantId, quantity });
    }

    res.json({ success: true, message: "Item added to cart." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/cart/items/:itemId
 * Update quantity of a specific cart item.
 */
app.patch("/api/cart/items/:itemId", async (req: Request, res: Response) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: "Quantity must be at least 1." });
    }

    const { error } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity })
      .eq("id", req.params.itemId);

    if (error) throw error;
    res.json({ success: true, message: "Quantity updated." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/cart/items/:itemId
 * Remove a single cart item.
 */
app.delete("/api/cart/items/:itemId", async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from("cart_items").delete().eq("id", req.params.itemId);
    if (error) throw error;
    res.json({ success: true, message: "Item removed." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cart/merge
 * Merges a guest cart (session_id) into the authenticated user's cart on login.
 */
app.post("/api/cart/merge", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, error: "sessionId required." });

    // Find guest cart
    const { data: guestCart } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("session_id", sessionId)
      .single();

    if (!guestCart) return res.json({ success: true, message: "No guest cart to merge." });

    // Get or create user cart
    let userCartId: string;
    const { data: userCart } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("user_id", req.userId)
      .single();

    if (userCart) {
      userCartId = userCart.id;
    } else {
      const { data: newCart } = await supabaseAdmin
        .from("carts")
        .insert({ user_id: req.userId })
        .select("id")
        .single();
      userCartId = newCart!.id;
    }

    // Fetch guest items
    const { data: guestItems } = await supabaseAdmin
      .from("cart_items")
      .select("variant_id, quantity")
      .eq("cart_id", guestCart.id);

    for (const item of guestItems || []) {
      const { data: existing } = await supabaseAdmin
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", userCartId)
        .eq("variant_id", item.variant_id)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("cart_items").insert({
          cart_id: userCartId,
          variant_id: item.variant_id,
          quantity: item.quantity,
        });
      }
    }

    // Delete guest cart
    await supabaseAdmin.from("carts").delete().eq("id", guestCart.id);

    res.json({ success: true, message: "Cart merged successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── COUPONS ────────────────────────────────────────────────────────────── */

/**
 * POST /api/coupons/validate
 * Auth required. Validates a coupon code against the coupons table.
 * Returns discount details for the frontend to apply.
 */











app.post("/api/coupons/validate", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { code, orderSubtotal } = req.body;
    if (!code) return res.status(400).json({ success: false, error: "Coupon code is required." });

    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !coupon) return res.status(404).json({ success: false, error: "Coupon not found or inactive." });

    // Expiry check
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return res.status(400).json({ success: false, error: "This coupon has expired." });
    }

    // Usage limit check
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ success: false, error: "This coupon has reached its usage limit." });
    }

    // Minimum order check
    if (coupon.minimum_order_amount && orderSubtotal < coupon.minimum_order_amount) {
      return res.status(400).json({
        success: false,
        error: `Minimum order of $${coupon.minimum_order_amount.toFixed(2)} required for this coupon.`,
      });
    }

    // Per-user usage check
    const { data: usageRecord } = await supabaseAdmin
      .from("coupon_usage")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("user_id", req.userId)
      .single();

    if (usageRecord) {
      return res.status(400).json({ success: false, error: "You have already used this coupon." });
    }

    // ← HERE — first-order-only check (with cancelled/refunded excluded)
    if (coupon.first_order_only) {
      const { count: pastOrderCount } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.userId)
        .not("status", "in", "(cancelled,refunded)");

      if ((pastOrderCount ?? 0) > 0) {
        return res.status(400).json({ success: false, error: "This coupon is only valid on your first order." });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === "percentage") {
      discountAmount = (orderSubtotal * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }
    discountAmount = Math.min(discountAmount, orderSubtotal);

    res.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});





























/* ─── CHECKOUT ───────────────────────────────────────────────────────────── */

/**
 * POST /api/checkout/place-order
 * Auth required. Called after successful Stripe payment OR for cash-on-delivery.
 * Creates order, order_items, payment record, decrements inventory, clears cart.
 */
app.post("/api/checkout/place-order", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const {
      cartId,
      shippingAddressId,
      shippingMethodId,
      couponId,
      paymentIntentId, // null for COD
      paymentMethod,   // "card" | "cod"
      notes,
    } = req.body;

    if (!shippingAddressId || !shippingMethodId) {
      return res.status(400).json({ success: false, error: "Shipping address and method are required." });
    }











    // Fetch cart items
    const { data: cartItems, error: cartErr } = await supabaseAdmin
      .from("cart_items")
      .select(
        `
        id, quantity,
        product_variants (
          id, sku, price, compare_at_price,
          products (id, name),
          inventory (id, quantity)
        )
        `
      )
      .eq("cart_id", cartId);

    if (cartErr) throw cartErr;

    // Fetch gift box items
    const { data: giftBoxCartItems, error: gbCartErr } = await supabaseAdmin
      .from("cart_gift_box_items")
      .select(
        `
        id, quantity,
        gift_boxes ( id, name, base_price ),
        cart_gift_box_item_contents (
          id, quantity, variant_id,
          product_variants ( id, sku, price, products(name), inventory(id, quantity) )
        )
        `
      )
      .eq("cart_id", cartId);

    if (gbCartErr) throw gbCartErr;

    if (!cartItems?.length && !giftBoxCartItems?.length) {
      return res.status(400).json({ success: false, error: "Cart is empty." });
    }












    // Validate stock and build line items
    let subtotal = 0;
    const orderItemsToInsert: any[] = [];
    const inventoryUpdates: { id: string; newQty: number }[] = [];

    for (const item of cartItems) {
      const variant = item.product_variants as any;
      const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;

      if (!inv || inv.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${variant.products.name}. Only ${inv?.quantity ?? 0} left.`,
        });
      }

      const unitPrice = parseFloat(variant.price);
      const totalPrice = parseFloat((unitPrice * item.quantity).toFixed(2));
      subtotal += totalPrice;

      orderItemsToInsert.push({
        variant_id: variant.id,
        product_name: variant.products.name, // Snapshot
        variant_sku: variant.sku,            // Snapshot
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });

      inventoryUpdates.push({ id: inv.id, newQty: inv.quantity - item.quantity });
    }

    // Validate stock and build gift box line items
    const giftBoxItemsToInsert: any[] = [];
    for (const gb of giftBoxCartItems || []) {
      const box = gb.gift_boxes as any;
      const contents = gb.cart_gift_box_item_contents as any[];

      const contentSnapshots: any[] = [];
      for (const c of contents) {
        const variant = c.product_variants as any;
        const invRow = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
        const neededQty = c.quantity * gb.quantity;

        if (!invRow || invRow.quantity < neededQty) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for ${variant.products?.name || "an item"} in your gift box. Only ${invRow?.quantity ?? 0} left.`,
          });
        }

        contentSnapshots.push({
          variant_id: variant.id,
          product_name: variant.products?.name || "",
          variant_sku: variant.sku,
          quantity: c.quantity,
          unit_price: parseFloat(variant.price) || 0,
        });

        inventoryUpdates.push({ id: invRow.id, newQty: invRow.quantity - neededQty });
      }

      const unitPrice = parseFloat(box.base_price) || 0;
      const totalPrice = parseFloat((unitPrice * gb.quantity).toFixed(2));
      subtotal += totalPrice;

      giftBoxItemsToInsert.push({
        gift_box_id: box.id,
        gift_box_name: box.name,
        quantity: gb.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        contents: contentSnapshots,
      });
    }

    // Shipping cost

    // Shipping cost
    const { data: shippingMethod } = await supabaseAdmin
      .from("shipping_methods")
      .select("price")
      .eq("id", shippingMethodId)
      .single();
    const shippingAmount = parseFloat(shippingMethod?.price || "0");

    // Discount
    let discountAmount = 0;
    if (couponId) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("id", couponId)
        .single();
      if (coupon) {
        discountAmount = coupon.discount_type === "percentage"
          ? (subtotal * coupon.discount_value) / 100
          : coupon.discount_value;
        discountAmount = parseFloat(Math.min(discountAmount, subtotal).toFixed(2));
      }
    }

    const total = parseFloat((subtotal - discountAmount + shippingAmount).toFixed(2));

    // Create order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: req.userId,
        status: "pending",
        shipping_address_id: shippingAddressId,
        shipping_method_id: shippingMethodId,
        coupon_id: couponId || null,
        subtotal,
        discount_amount: discountAmount,
        shipping_amount: shippingAmount,
        total_amount: total,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;

    // Insert order items
    // Insert order items
    const finalItems = orderItemsToInsert.map((i) => ({ ...i, order_id: order.id }));
    if (finalItems.length) {
      const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(finalItems);
      if (itemsErr) throw itemsErr;
    }

    // Insert gift box order items + their content snapshots
    for (const gb of giftBoxItemsToInsert) {
      const { contents, ...gbRow } = gb;
      const { data: insertedGb, error: gbErr } = await supabaseAdmin
        .from("order_gift_box_items")
        .insert({ ...gbRow, order_id: order.id })
        .select("id")
        .single();
      if (gbErr) throw gbErr;

      const contentRows = contents.map((c: any) => ({ ...c, order_gift_box_item_id: insertedGb.id }));
      if (contentRows.length) {
        const { error: cErr } = await supabaseAdmin.from("order_gift_box_item_contents").insert(contentRows);
        if (cErr) throw cErr;
      }
    }

    // Initial status history
    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      status: "pending",
      note: "Order placed",
      changed_by: req.userId,
    });

    // Payment record
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      amount: total,
      currency: "usd",
      method: paymentMethod,
      status: paymentMethod === "cod" ? "pending" : "paid",
      transaction_id: paymentIntentId || null,
      paid_at: paymentMethod === "card" ? new Date().toISOString() : null,
    });

    // Decrement inventory atomically (row by row — Supabase doesn't support batch atomic updates via REST)
    for (const inv of inventoryUpdates) {
      await supabaseAdmin.from("inventory").update({ quantity: inv.newQty }).eq("id", inv.id);
    }

    // Mark coupon used
    if (couponId) {
      await supabaseAdmin.from("coupon_usage").insert({ coupon_id: couponId, user_id: req.userId });
      await supabaseAdmin.rpc("increment_coupon_usage", { coupon_id_input: couponId });
    }

    // Clear cart
    // Clear cart
    await supabaseAdmin.from("cart_items").delete().eq("cart_id", cartId);
    const { data: gbCartRows } = await supabaseAdmin.from("cart_gift_box_items").select("id").eq("cart_id", cartId);
    for (const row of gbCartRows || []) {
      await supabaseAdmin.from("cart_gift_box_item_contents").delete().eq("cart_gift_box_item_id", row.id);
    }
    await supabaseAdmin.from("cart_gift_box_items").delete().eq("cart_id", cartId);
    await supabaseAdmin.from("carts").delete().eq("id", cartId);

    res.json({ success: true, orderId: order.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ORDERS ─────────────────────────────────────────────────────────────── */

/**
 * GET /api/orders
 * Auth required. Returns the logged-in user's order history.
 */
app.get("/api/orders", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id, status, total_amount, created_at,
        order_items (id, product_name, quantity, unit_price),
        shipping_methods (name),
        payments (status, method)
        `
      )
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, orders: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders/:id
 * Auth required. Returns a single order detail for the current user.
 */
app.get("/api/orders/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (*, product_variants (size, color)),
        order_status_history (status, note, changed_at),
        payments (*),
        shipments (*),
        shipping_methods (name, carrier, estimated_days_min, estimated_days_max),
        user_addresses (full_name, street, city, state, country, postal_code)
        `
      )
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "Order not found." });
    res.json({ success: true, order: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── SHIPPING METHODS ───────────────────────────────────────────────────── */

app.get("/api/shipping-methods", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("shipping_methods")
      .select("*")
      .eq("is_active", true)
      .order("price");

    if (error) throw error;
    res.json({ success: true, shippingMethods: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});










/* ─── GIFT BOXES (public) ─────────────────────────────────────────────────
   is_customizable = true  -> "build your own": fixed base_price, customer
     picks quantities freely from the eligible product list, no cap.
   is_customizable = false -> "pre-made": fixed contents from
     gift_box_products.default_quantity, customer just adds to cart as-is.
   Either way the box charges base_price — individual product prices inside
   are informational only, never summed into the total.
───────────────────────────────────────────────────────────────────────── */

app.get("/api/gift-boxes", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("gift_boxes")
      .select("*")
      .eq("is_active", true)
      .order("base_price");
    if (error) throw error;
    res.json({ success: true, giftBoxes: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/gift-boxes/:slug", async (req: Request, res: Response) => {
  try {
    const { data: box, error } = await supabaseAdmin
      .from("gift_boxes")
      .select("*")
      .eq("slug", req.params.slug)
      .eq("is_active", true)
      .single();

    if (error || !box) return res.status(404).json({ success: false, error: "Gift box not found." });

    const { data: eligible, error: prodErr } = await supabaseAdmin
      .from("gift_box_products")
      .select(
        `
        id, default_quantity, sort_order,
        products (id, name, slug, product_images(url, is_primary)),
        product_variants (id, sku, price, size, color, weight_grams, inventory(quantity))
        `
      )
      .eq("gift_box_id", box.id)
      .order("sort_order");

    if (prodErr) throw prodErr;

    // Normalize inventory (one-to-one relations come back as an object, not an array)
    const shaped = (eligible || []).map((e: any) => {
      const inv = e.product_variants?.inventory;
      const qty = Array.isArray(inv) ? (inv[0]?.quantity ?? 0) : (inv?.quantity ?? 0);
      return { ...e, product_variants: { ...e.product_variants, stock: qty } };
    });

    res.json({ success: true, giftBox: box, eligibleProducts: shaped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── CART: GIFT BOX ITEMS ────────────────────────────────────────────────
   body: { giftBoxId, quantity, contents: [{ variantId, quantity }] }
   `contents` is required even for pre-made boxes — the frontend sends the
   box's own default_quantity rows so contents are always explicit and
   snapshot-able at checkout time.
───────────────────────────────────────────────────────────────────────── */

app.post("/api/cart/gift-box-items", async (req: AuthedRequest, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabasePublic.auth.getUser(authHeader.split(" ")[1]);
      userId = user?.id ?? null;
    }

    const { giftBoxId, quantity = 1, contents } = req.body;
    if (!giftBoxId || !Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ success: false, error: "giftBoxId and at least one content item are required." });
    }

    const { data: box } = await supabaseAdmin
      .from("gift_boxes")
      .select("id, is_active")
      .eq("id", giftBoxId)
      .single();
    if (!box || !box.is_active) return res.status(404).json({ success: false, error: "Gift box not found." });

    let cartId: string;
    const cartMatch = userId
      ? await supabaseAdmin.from("carts").select("id").eq("user_id", userId).single()
      : await supabaseAdmin.from("carts").select("id").eq("session_id", sessionId).single();

    if (cartMatch.data) {
      cartId = cartMatch.data.id;
    } else {
      const { data: newCart, error: cartErr } = await supabaseAdmin
        .from("carts")
        .insert(userId ? { user_id: userId } : { session_id: sessionId })
        .select("id")
        .single();
      if (cartErr) throw cartErr;
      cartId = newCart.id;
    }

    const { data: cartGiftBoxItem, error: itemErr } = await supabaseAdmin
      .from("cart_gift_box_items")
      .insert({ cart_id: cartId, gift_box_id: giftBoxId, quantity })
      .select("id")
      .single();
    if (itemErr) throw itemErr;

    const contentRows = contents.map((c: any) => ({
      cart_gift_box_item_id: cartGiftBoxItem.id,
      variant_id: c.variantId,
      quantity: c.quantity ?? 1,
    }));
    const { error: contentErr } = await supabaseAdmin.from("cart_gift_box_item_contents").insert(contentRows);
    if (contentErr) throw contentErr;

    res.json({ success: true, cartGiftBoxItemId: cartGiftBoxItem.id, message: "Gift box added to cart." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/cart/gift-box-items/:itemId", async (req: Request, res: Response) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ success: false, error: "Quantity must be at least 1." });
    const { error } = await supabaseAdmin.from("cart_gift_box_items").update({ quantity }).eq("id", req.params.itemId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/cart/gift-box-items/:itemId", async (req: Request, res: Response) => {
  try {
    await supabaseAdmin.from("cart_gift_box_item_contents").delete().eq("cart_gift_box_item_id", req.params.itemId);
    await supabaseAdmin.from("cart_gift_box_items").delete().eq("id", req.params.itemId);
    res.json({ success: true, message: "Gift box removed." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});







/* ─── REVIEWS ────────────────────────────────────────────────────────────── */

/**
 * POST /api/reviews
 * Auth required. Only users who ordered and received the product can review it.
 */
app.post("/api/reviews", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ success: false, error: "productId and rating are required." });
    }

    // Confirm the product actually exists (still worth checking — otherwise a
    // bad productId silently creates an orphaned review row).
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }

    // One review per user per product, regardless of purchase history.
    const { data: existing } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", req.userId!)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ success: false, error: "You have already reviewed this product." });
    }

    const { data: review, error } = await supabaseAdmin
      .from("reviews")
      .insert({
        product_id: productId,
        user_id: req.userId!,
        order_id: orderId || null,
        rating,
        title: null, // titles removed — comment-only reviews now
        comment: comment || null,
        is_verified: false,
      })
      .select("id")
      .single();

    if (error) throw error;
    res.json({ success: true, reviewId: review.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});























/* ─── WISHLIST ───────────────────────────────────────────────────────────── */

app.get("/api/wishlist", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { data: wishlist } = await supabaseAdmin
      .from("wishlists")
      .select("id")
      .eq("user_id", req.userId)
      .single();

    if (!wishlist) return res.json({ success: true, items: [] });

    const { data: items, error } = await supabaseAdmin
      .from("wishlist_items")
      .select(
        `
        id,
        products (
          id, name, slug,
          product_images (url, alt_text, is_primary),
          product_variants (price, compare_at_price)
        )
        `
      )
      .eq("wishlist_id", wishlist.id);

    if (error) throw error;
    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/wishlist/items", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { productId } = req.body;

    // Get or create wishlist
    let wishlistId: string;
    const { data: existing } = await supabaseAdmin
      .from("wishlists")
      .select("id")
      .eq("user_id", req.userId)
      .single();

    if (existing) {
      wishlistId = existing.id;
    } else {
      const { data: newWl } = await supabaseAdmin
        .from("wishlists")
        .insert({ user_id: req.userId })
        .select("id")
        .single();
      wishlistId = newWl!.id;
    }

    // Avoid duplicates
    const { data: dup } = await supabaseAdmin
      .from("wishlist_items")
      .select("id")
      .eq("wishlist_id", wishlistId)
      .eq("product_id", productId)
      .single();

    if (dup) return res.json({ success: true, message: "Already in wishlist." });

    await supabaseAdmin.from("wishlist_items").insert({ wishlist_id: wishlistId, product_id: productId });
    res.json({ success: true, message: "Added to wishlist." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/wishlist/items/:productId", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { data: wishlist } = await supabaseAdmin
      .from("wishlists")
      .select("id")
      .eq("user_id", req.userId)
      .single();

    if (!wishlist) return res.status(404).json({ success: false, error: "Wishlist not found." });

    await supabaseAdmin
      .from("wishlist_items")
      .delete()
      .eq("wishlist_id", wishlist.id)
      .eq("product_id", req.params.productId);

    res.json({ success: true, message: "Removed from wishlist." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── NOTIFICATIONS ──────────────────────────────────────────────────────── */

app.get("/api/notifications", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, notifications: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/notifications/:id/read", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", req.params.id)
      .eq("user_id", req.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/notifications/read-all", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── PROFILE & ADDRESSES ────────────────────────────────────────────────── */

app.get("/api/profile", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.userId)
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/profile", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name, phone, avatar_url, updated_at: new Date().toISOString() })
      .eq("id", req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/addresses", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .select("*")
      .eq("user_id", req.userId)
      .order("is_default", { ascending: false });

    if (error) throw error;
    res.json({ success: true, addresses: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/addresses", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { full_name, phone, street, city, state, country, postal_code, is_default } = req.body;
    console.log("POST /api/addresses body:", req.body); // ← add this

    if (is_default) {
      await supabaseAdmin
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", req.userId);
    }

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .insert({ user_id: req.userId, full_name, phone, street, city, state, country, postal_code, is_default: !!is_default })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error); // ← add this
      throw error;
    }
    res.json({ success: true, address: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/addresses/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    await supabaseAdmin
      .from("user_addresses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── NEWSLETTER ─────────────────────────────────────────────────────────── */

app.post("/api/newsletter/subscribe", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email is required." });

    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabasePublic.auth.getUser(authHeader.split(" ")[1]);
      userId = user?.id ?? null;
    }

    await supabaseAdmin
      .from("email_subscriptions")
      .upsert({ email, user_id: userId, is_subscribed: true }, { onConflict: "email" });

    res.json({ success: true, message: "Subscribed successfully!" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ADMIN ROUTES                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */




























/* ─── ADMIN: DASHBOARD STATS ─────────────────────────────────────────────── */

app.get("/api/admin/stats", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [revenueRes, ordersRes, customersRes, productsRes, lowStockRes] = await Promise.all([
      supabaseAdmin.from("payments").select("amount").eq("status", "paid"),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin
        .from("inventory")
        .select("id, quantity, low_stock_threshold, product_variants(sku, products(name))")
        .filter("quantity", "lte", "low_stock_threshold"),
    ]);

    const totalRevenue = (revenueRes.data || []).reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

    res.json({
      success: true,
      stats: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrders: ordersRes.count ?? 0,
        totalCustomers: customersRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        lowStockItems: lowStockRes.data ?? [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});



app.get("/api/debug/products", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, slug")
    .limit(10);
  res.json({ data, error });
});






/* ─── ADMIN: GIFT BOXES ──────────────────────────────────────────────────── */

app.get("/api/admin/gift-boxes", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from("gift_boxes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, giftBoxes: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/gift-boxes", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, image_url, base_price, capacity, is_customizable, is_active } = req.body;
    if (!name || !slug || base_price === undefined) {
      return res.status(400).json({ success: false, error: "name, slug, and base_price are required." });
    }
    const { data, error } = await supabaseAdmin
      .from("gift_boxes")
      .insert({
        name, slug,
        description: description || null,
        image_url: image_url || null,
        base_price,
        capacity: capacity || null,
        is_customizable: is_customizable ?? true,
        is_active: is_active ?? true,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ success: false, error: `Slug "${slug}" is already in use.` });
      throw error;
    }
    res.json({ success: true, giftBox: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/gift-boxes/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, image_url, base_price, capacity, is_customizable, is_active } = req.body;
    const { error } = await supabaseAdmin
      .from("gift_boxes")
      .update({ name, slug, description, image_url, base_price, capacity, is_customizable, is_active, updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (error) {
      if (error.code === "23505") return res.status(409).json({ success: false, error: `Slug "${slug}" is already in use.` });
      throw error;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/gift-boxes/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from("gift_boxes").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: GIFT BOX ELIGIBLE PRODUCTS ──────────────────────────────────── */

app.get("/api/admin/gift-boxes/:id/products", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("gift_box_products")
      .select(
        `
        id, default_quantity, sort_order, product_id, variant_id,
        products (id, name),
        product_variants (id, sku, price, size, color, weight_grams)
        `
      )
      .eq("gift_box_id", req.params.id)
      .order("sort_order");
    if (error) throw error;
    res.json({ success: true, products: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/gift-boxes/:id/products", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { product_id, variant_id, default_quantity, sort_order } = req.body;
    if (!product_id || !variant_id) return res.status(400).json({ success: false, error: "product_id and variant_id are required." });
    const { data, error } = await supabaseAdmin
      .from("gift_box_products")
      .insert({
        gift_box_id: req.params.id,
        product_id, variant_id,
        default_quantity: default_quantity ?? 0,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, giftBoxProduct: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/gift-boxes/:id/products/:linkId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { default_quantity, sort_order } = req.body;
    const { error } = await supabaseAdmin
      .from("gift_box_products")
      .update({ default_quantity, sort_order })
      .eq("id", req.params.linkId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/gift-boxes/:id/products/:linkId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from("gift_box_products").delete().eq("id", req.params.linkId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});



/* ─── ADMIN: PRODUCTS ────────────────────────────────────────────────────── */

app.get("/api/admin/products", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabaseAdmin
      .from("products")
      .select("id, name, name_ar, slug, brand, is_active, sold_by_weight, categories(name), product_variants(id, sku, price)", { count: "exact" });

    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1);

    if (error) throw error;
    res.json({ success: true, products: data, total: count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/products", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, name_ar, slug, description, description_ar, category_id, brand, sold_by_weight, variants, images } = req.body;

    const { data: product, error: prodErr } = await supabaseAdmin
      .from("products")
      .insert({
        name,
        name_ar: name_ar || null,
        slug,
        description,
        description_ar: description_ar || null,
        category_id,
        brand,
        is_active: true,
        sold_by_weight: !!sold_by_weight,
      })
      .select("id")
      .single();

    if (prodErr) {
      if (prodErr.code === "23505") {
        return res.status(409).json({ success: false, error: `Slug "${slug}" is already in use. Choose a different product name or slug.` });
      }
      throw prodErr;
    }

    for (const v of variants || []) {
      const { data: variant, error: varErr } = await supabaseAdmin
        .from("product_variants")
        .insert({
          product_id: product.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          compare_at_price: v.compare_at_price,
          weight_grams: v.weight_grams ?? null,
        })
        .select("id")
        .single();

      if (varErr) throw varErr;

      await supabaseAdmin.from("inventory").insert({
        variant_id: variant.id,
        quantity: v.stock ?? 0,
        low_stock_threshold: v.low_stock_threshold ?? 5,
      });
    }

    for (const img of images || []) {
      await supabaseAdmin.from("product_images").insert({
        product_id: product.id,
        url: img.url,
        alt_text: img.alt_text,
        is_primary: img.is_primary ?? false,
        sort_order: img.sort_order ?? 0,
      });
    }

    res.json({ success: true, productId: product.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/products/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, name_ar, slug, description, description_ar, category_id, brand, is_active, is_featured, is_best_seller, sold_by_weight } = req.body;

    const { error } = await supabaseAdmin
      .from("products")
      .update({
        name,
        name_ar: name_ar || null,
        slug,
        description,
        description_ar: description_ar || null,
        category_id: category_id || null,
        brand, is_active,
        is_featured: is_featured ?? false,
        is_best_seller: is_best_seller ?? false,
        sold_by_weight: sold_by_weight ?? false,
      })
      .eq("id", req.params.id);

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ success: false, error: `Slug "${slug}" is already in use. Choose a different product name or slug.` });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/products/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from("products")
      .delete()  // ← hard delete instead of update({ is_active: false })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: CATEGORIES ──────────────────────────────────────────────────── */

app.post("/api/admin/categories", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, name_ar, slug, parent_id, image_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({ name, name_ar: name_ar || null, slug, parent_id: parent_id || null, image_url })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, category: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/categories/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, name_ar, slug, parent_id, image_url } = req.body;
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ name, name_ar: name_ar || null, slug, parent_id: parent_id || null, image_url })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/categories/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, parent_id, image_url } = req.body;
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ name, slug, parent_id: parent_id || null, image_url })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/categories/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { count } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", req.params.id);

    if (count && count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete — ${count} product${count > 1 ? "s" : ""} still use this category. Reassign them first.`,
      });
    }

    const { error } = await supabaseAdmin.from("categories").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: ORDERS ──────────────────────────────────────────────────────── */

app.get("/api/admin/orders", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabaseAdmin
      .from("orders")
      .select("id, status, total_amount, created_at, profiles(full_name), payments(method, status)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query.range(offset, offset + parseInt(limit as string) - 1);
    if (error) throw error;
    res.json({ success: true, orders: data, total: count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/orders/:id/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, note, trackingNumber, carrier } = req.body;

    await supabaseAdmin.from("orders").update({ status }).eq("id", req.params.id);

    await supabaseAdmin.from("order_status_history").insert({
      order_id: req.params.id,
      status,
      note: note || null,
      changed_by: "admin",
    });

    // If shipping, create or update shipment record
    if (status === "shipped" && trackingNumber) {
      const { data: existing } = await supabaseAdmin
        .from("shipments")
        .select("id")
        .eq("order_id", req.params.id)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("shipments")
          .update({ tracking_number: trackingNumber, carrier, status: "in_transit", shipped_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("shipping_method_id")
          .eq("id", req.params.id)
          .single();

        await supabaseAdmin.from("shipments").insert({
          order_id: req.params.id,
          shipping_method_id: order?.shipping_method_id,
          tracking_number: trackingNumber,
          carrier,
          status: "in_transit",
          shipped_at: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: COUPONS ─────────────────────────────────────────────────────── */

app.get("/api/admin/coupons", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, coupons: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/coupons", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code, description, discount_type, discount_value, minimum_order_amount, usage_limit, expiry_date } = req.body;

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .insert({
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value,
        minimum_order_amount: minimum_order_amount || null,
        usage_limit: usage_limit || null,
        expiry_date: expiry_date || null,
        is_active: true,
        used_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, coupon: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/coupons/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { is_active, discount_value, expiry_date, usage_limit } = req.body;
    const { error } = await supabaseAdmin
      .from("coupons")
      .update({ is_active, discount_value, expiry_date, usage_limit })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: INVENTORY ───────────────────────────────────────────────────── */

app.get("/api/admin/inventory", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { lowStock } = req.query;

    let query = supabaseAdmin
      .from("inventory")
      .select("id, quantity, low_stock_threshold, product_variants(id, sku, size, color, products(name, sold_by_weight))");

    if (lowStock === "true") {
      query = query.filter("quantity", "lte", "low_stock_threshold");
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, inventory: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/inventory/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { quantity, low_stock_threshold } = req.body;
    const { error } = await supabaseAdmin
      .from("inventory")
      .update({ quantity, low_stock_threshold })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: SHIPPING METHODS ────────────────────────────────────────────── */

app.get("/api/admin/shipping-methods", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from("shipping_methods").select("*").order("price");
    if (error) throw error;
    res.json({ success: true, shippingMethods: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/shipping-methods", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, carrier, price, estimated_days_min, estimated_days_max, is_active } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: "name and price are required." });
    }
    const { data, error } = await supabaseAdmin
      .from("shipping_methods")
      .insert({
        name,
        carrier: carrier || null,
        price,
        estimated_days_min: estimated_days_min ?? null,
        estimated_days_max: estimated_days_max ?? null,
        is_active: is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, shippingMethod: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/shipping-methods/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, carrier, price, estimated_days_min, estimated_days_max, is_active } = req.body;
    const { error } = await supabaseAdmin
      .from("shipping_methods")
      .update({ name, carrier, price, estimated_days_min, estimated_days_max, is_active })
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/shipping-methods/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Soft delete — hard-deleting could break historical orders referencing this method
    const { error } = await supabaseAdmin
      .from("shipping_methods")
      .update({ is_active: false })
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});



/* ─── ADMIN: PRODUCT IMAGES ──────────────────────────────────────────────── */

app.get("/api/admin/products/:id/images", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("product_images")
      .select("*")
      .eq("product_id", req.params.id)
      .order("sort_order");
    if (error) throw error;
    res.json({ success: true, images: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/products/:id/images", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { url, alt_text, is_primary, sort_order } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "url is required." });

    if (is_primary) {
      await supabaseAdmin.from("product_images").update({ is_primary: false }).eq("product_id", req.params.id);
    }

    const { data, error } = await supabaseAdmin
      .from("product_images")
      .insert({
        product_id: req.params.id,
        url,
        alt_text: alt_text || null,
        is_primary: !!is_primary,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, image: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/products/:id/images/:imageId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { is_primary, alt_text, sort_order } = req.body;

    if (is_primary) {
      await supabaseAdmin.from("product_images").update({ is_primary: false }).eq("product_id", req.params.id);
    }

    const { error } = await supabaseAdmin
      .from("product_images")
      .update({ is_primary, alt_text, sort_order })
      .eq("id", req.params.imageId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/products/:id/images/:imageId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from("product_images").delete().eq("id", req.params.imageId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: CUSTOMER ROLE MANAGEMENT ────────────────────────────────────── */

app.patch("/api/admin/customers/:id/admin-status", requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const { is_admin } = req.body;
    if (typeof is_admin !== "boolean") {
      return res.status(400).json({ success: false, error: "is_admin must be true or false." });
    }
    if (req.params.id === req.userId && is_admin === false) {
      return res.status(400).json({ success: false, error: "You cannot remove your own admin access." });
    }

    const { error } = await supabaseAdmin.from("profiles").update({ is_admin }).eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: REVIEWS ─────────────────────────────────────────────────────── */

app.get("/api/admin/reviews", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("*, products(name), profiles(full_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, reviews: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/reviews/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { is_verified } = req.body;
    const { error } = await supabaseAdmin
      .from("reviews")
      .update({ is_verified })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/reviews/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: CUSTOMERS ───────────────────────────────────────────────────── */

app.get("/api/admin/customers", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, avatar_url, created_at, is_admin")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, customers: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/customers/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [profileRes, ordersRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", req.params.id).single(),
      supabaseAdmin
        .from("orders")
        .select("id, status, total_amount, created_at")
        .eq("user_id", req.params.id)
        .order("created_at", { ascending: false }),
    ]);

    const totalSpent = (ordersRes.data || []).reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    res.json({
      success: true,
      customer: profileRes.data,
      orders: ordersRes.data,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});














/* ─── ADMIN: SINGLE PRODUCT (for edit form) ──────────────────────────────── */

app.get("/api/admin/products/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        `
        *,
        categories (id, name, name_ar, slug),
        product_images (id, url, alt_text, is_primary, sort_order),
        product_variants (
          id, sku, size, color, price, compare_at_price,
          inventory (id, quantity, low_stock_threshold)
        )
        `
      )
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "Product not found." });
    res.json({ success: true, product: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});







app.post("/api/admin/products/:id/variants", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      sku, size, color, weight_grams,
      price, compare_at_price,
      stock = 0,
      low_stock_threshold = 5,
    } = req.body;

    if (!sku?.trim()) {
      return res.status(400).json({ success: false, error: "sku is required." });
    }
    if (price === undefined || price === null || price === "") {
      return res.status(400).json({ success: false, error: "price is required." });
    }

    const { data: variant, error } = await supabaseAdmin
      .from("product_variants")
      .insert({
        product_id: req.params.id,
        sku, size, color,
        weight_grams: weight_grams ? Number(weight_grams) : null,
        price,
        compare_at_price,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ success: false, error: `SKU "${sku}" is already in use. SKUs must be unique across all products.` });
      }
      throw error;
    }

    await supabaseAdmin.from("inventory").insert({
      variant_id: variant.id,
      quantity: stock,
      low_stock_threshold,
    });

    res.json({ success: true, variantId: variant.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});




































app.patch("/api/admin/products/:id/variants/:variantId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      sku, size, color, weight_grams,
      price, compare_at_price,
      stock,
      low_stock_threshold,
    } = req.body;

    const { error: varErr } = await supabaseAdmin
      .from("product_variants")
      .update({
        sku, size, color,
        weight_grams: weight_grams !== undefined ? (weight_grams ? Number(weight_grams) : null) : undefined,
        price, compare_at_price,
      })
      .eq("id", req.params.variantId);

    if (varErr) {
      if (varErr.code === "23505") {
        return res.status(409).json({ success: false, error: `SKU "${sku}" is already in use. SKUs must be unique across all products.` });
      }
      throw varErr;
    }

    if (stock !== undefined || low_stock_threshold !== undefined) {
      const updates: any = {};
      if (stock !== undefined) updates.quantity = stock;
      if (low_stock_threshold !== undefined) updates.low_stock_threshold = low_stock_threshold;
      await supabaseAdmin.from("inventory").update(updates).eq("variant_id", req.params.variantId);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});





















app.delete("/api/admin/products/:id/variants/:variantId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Block delete if variant is referenced by any order_items (preserve order history)
    const { count } = await supabaseAdmin
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("variant_id", req.params.variantId);

    if (count && count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete — this variant appears in ${count} past order(s).`,
      });
    }

    const { error } = await supabaseAdmin
      .from("product_variants")
      .delete()
      .eq("id", req.params.variantId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: ORDER CANCEL & REFUND (with inventory restock) ─────────────── */

app.post("/api/admin/orders/:id/cancel", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { note } = req.body;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", req.params.id)
      .single();

    if (!order) return res.status(404).json({ success: false, error: "Order not found." });
    if (["delivered", "cancelled", "refunded"].includes(order.status)) {
      return res.status(400).json({ success: false, error: `Cannot cancel an order that is already ${order.status}.` });
    }

    // Restock inventory for every item in this order
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", req.params.id);

    for (const item of items || []) {
      if (!item.variant_id) continue;
      const { data: inv } = await supabaseAdmin
        .from("inventory")
        .select("id, quantity")
        .eq("variant_id", item.variant_id)
        .single();
      if (inv) {
        await supabaseAdmin
          .from("inventory")
          .update({ quantity: inv.quantity + item.quantity })
          .eq("id", inv.id);
      }
    }

    await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", req.params.id);
    await supabaseAdmin.from("order_status_history").insert({
      order_id: req.params.id,
      status: "cancelled",
      note: note || "Cancelled by admin — stock restocked.",
      changed_by: "admin",
    });

    res.json({ success: true, message: "Order cancelled and inventory restocked." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/orders/:id/refund", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount, reason, restock = true } = req.body;

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, amount")
      .eq("order_id", req.params.id)
      .single();

    if (!payment) return res.status(404).json({ success: false, error: "No payment found for this order." });

    const refundAmount = amount ?? payment.amount;

    const { data: refund, error: refundErr } = await supabaseAdmin
      .from("refunds")
      .insert({
        payment_id: payment.id,
        amount: refundAmount,
        reason: reason || null,
        status: "approved",
        refunded_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (refundErr) throw refundErr;

    await supabaseAdmin.from("payments").update({ status: "refunded" }).eq("id", payment.id);
    await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", req.params.id);
    await supabaseAdmin.from("order_status_history").insert({
      order_id: req.params.id,
      status: "refunded",
      note: reason || "Refunded by admin",
      changed_by: "admin",
    });

    if (restock) {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("variant_id, quantity")
        .eq("order_id", req.params.id);

      for (const item of items || []) {
        if (!item.variant_id) continue;
        const { data: inv } = await supabaseAdmin
          .from("inventory")
          .select("id, quantity")
          .eq("variant_id", item.variant_id)
          .single();
        if (inv) {
          await supabaseAdmin
            .from("inventory")
            .update({ quantity: inv.quantity + item.quantity })
            .eq("id", inv.id);
        }
      }
    }

    res.json({ success: true, refundId: refund.id, message: "Refund recorded." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: SINGLE ORDER DETAIL ─────────────────────────────────────────── */

app.get("/api/admin/orders/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (*, product_variants (size, color)),
        order_status_history (status, note, changed_at, changed_by),
        payments (*),
        refunds:payments(refunds(*)),
        shipments (*),
        shipping_methods (name, carrier),
        user_addresses (full_name, phone, street, city, state, country, postal_code),
        profiles (full_name)
        `
      )
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "Order not found." });
    res.json({ success: true, order: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: COUPON DELETE ────────────────────────────────────────────────── */

app.delete("/api/admin/coupons/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { count } = await supabaseAdmin
      .from("coupon_usage")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", req.params.id);

    if (count && count > 0) {
      // Already used — deactivate instead of hard delete to preserve order history integrity
      await supabaseAdmin.from("coupons").update({ is_active: false }).eq("id", req.params.id);
      return res.json({ success: true, message: "Coupon has been used before, so it was deactivated instead of deleted." });
    }

    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── ADMIN: STORE SETTINGS ───────────────────────────────────────────────── */

app.get("/api/admin/settings", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from("store_settings").select("*").single();
    if (error) throw error;
    res.json({ success: true, settings: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/admin/settings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { store_name, logo_url, contact_email, contact_phone, address, currency, tax_rate, free_shipping_threshold } = req.body;

    const { data: existing } = await supabaseAdmin.from("store_settings").select("id").single();
    if (!existing) return res.status(404).json({ success: false, error: "Settings row not found." });

    const { data, error } = await supabaseAdmin
      .from("store_settings")
      .update({ store_name, logo_url, contact_email, contact_phone, address, currency, tax_rate, free_shipping_threshold })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, settings: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});





















/* ─── HELPER FUNCTIONS ───────────────────────────────────────────────────── */

async function calculateOrderTotal(
  cartId: string,
  shippingMethodId: string,
  couponId: string | null,
  userId: string
) {
  const { data: items } = await supabaseAdmin
    .from("cart_items")
    .select("quantity, product_variants(price)")
    .eq("cart_id", cartId);

  const subtotal = (items || []).reduce((sum: number, item: any) => {
    return sum + parseFloat(item.product_variants.price) * item.quantity;
  }, 0);

  const { data: sm } = await supabaseAdmin
    .from("shipping_methods")
    .select("price")
    .eq("id", shippingMethodId)
    .single();
  const shippingAmount = parseFloat(sm?.price || "0");

  let discountAmount = 0;
  if (couponId) {
    const { data: coupon } = await supabaseAdmin.from("coupons").select("*").eq("id", couponId).single();
    if (coupon) {
      discountAmount = coupon.discount_type === "percentage"
        ? (subtotal * coupon.discount_value) / 100
        : coupon.discount_value;
      discountAmount = Math.min(discountAmount, subtotal);
    }
  }

  const total = subtotal - discountAmount + shippingAmount;
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    shippingAmount: parseFloat(shippingAmount.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

function shapeProduct(p: any) {
  const primaryImage =
    p.product_images?.find((img: any) => img.is_primary) ||
    p.product_images?.[0];

  const variants: any[] = p.product_variants || [];
  const soldByWeight: boolean = !!p.sold_by_weight;

  const getVariantQty = (v: any) =>
    Array.isArray(v.inventory) ? (v.inventory[0]?.quantity ?? 0) : (v.inventory?.quantity ?? 0);

  const prices = variants.map((v: any) => parseFloat(v.price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxCompare = variants.map((v: any) => parseFloat(v.compare_at_price || 0));

  const ratings = (p.reviews || []).map((r: any) => r.rating);
  const avgRating = ratings.length
    ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
    : 0;

  const totalStock = variants.reduce((sum: number, v: any) => sum + getVariantQty(v), 0);

  const inStockVariants = variants.filter((v: any) => getVariantQty(v) > 0);

  const pickFrom = inStockVariants.length > 0 ? inStockVariants : variants;
  const cheapestVariant = pickFrom.reduce(
    (min: any, v: any) =>
      !min || parseFloat(v.price) < parseFloat(min.price) ? v : min,
    null
  );

  return {
    id: p.id,
    name: p.name,
    name_en: p.name,
    name_ar: p.name_ar || p.name, // falls back to English if not yet translated
    description: p.description,
    description_en: p.description,
    description_ar: p.description_ar || p.description,
    slug: p.slug,
    brand: p.brand,
    category: p.categories
      ? {
        ...p.categories,
        name_en: p.categories.name,
        name_ar: p.categories.name_ar || p.categories.name,
      }
      : null,
    image: primaryImage,
    price: minPrice,
    compareAtPrice: maxCompare.length ? Math.max(...maxCompare) : 0,
    avgRating: parseFloat(avgRating.toFixed(1)),
    reviewCount: ratings.length,
    inStock: totalStock > 0,
    defaultVariantId: cheapestVariant?.id ?? null,
    variantCount: variants.length,
    is_featured: p.is_featured ?? false,
    is_best_seller: p.is_best_seller ?? false,
    sold_by_weight: soldByWeight,
  };
}















function sortProducts(products: any[], sort: string) {
  switch (sort) {
    case "price_asc":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      products.sort((a, b) => b.price - a.price);
      break;
    case "top_rated":
      products.sort((a, b) => b.avgRating - a.avgRating);
      break;
    default:
      break; // "newest" is handled by DB order
  }
}





/* ─── SERVER START ───────────────────────────────────────────────────────── */

app.listen(PORT, () => {
  console.log(`🚀 NUTX  backend running on http://localhost:${PORT}`);
});

export default app;