import React, { createContext, useContext, useReducer, useEffect } from "react";
import { supabase } from "./config/supabaseClient";
import axios from "axios";
import { toast } from "sonner";

export interface CartItem {
  itemId?: string;
  productId: string;
  variantId?: string;
  quantity: number;
  slug?: string; // ← carried from server for navigation links
}

export interface GiftBoxCartContent {
  variantId: string;
  quantity: number;
  productName?: string;
  sku?: string;
}

export interface GiftBoxCartItem {
  itemId: string;
  giftBoxId: string;
  name: string;
  slug?: string;
  image?: string;
  basePrice: number;
  quantity: number;
  contents: GiftBoxCartContent[];
}

interface StoreState {
  cart: CartItem[];
  giftBoxCart: GiftBoxCartItem[];
  wishlist: string[];
  darkMode: boolean;
  coupon: string | null;
  couponRate: number;
  couponId: string | null;
  cartId: string | null;
}

type Action =
  | { type: "SET_CART"; cart: CartItem[] }
  | { type: "SET_CART_ID"; cartId: string | null }
  | { type: "ADD_TO_CART"; productId: string; variantId?: string }
  | { type: "REMOVE_FROM_CART"; productId: string; variantId?: string }
  | { type: "UPDATE_QUANTITY"; productId: string; variantId?: string; quantity: number }
  | { type: "SET_GIFT_BOX_CART"; giftBoxCart: GiftBoxCartItem[] }
  | { type: "REMOVE_GIFT_BOX_ITEM"; itemId: string }
  | { type: "UPDATE_GIFT_BOX_QUANTITY"; itemId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_WISHLIST"; productId: string }
  | { type: "TOGGLE_DARK_MODE" }
  | { type: "SET_COUPON"; code: string | null; rate: number; couponId: string | null };

function itemKey(productId: string, variantId?: string) {
  return variantId ? `${productId}__${variantId}` : productId;
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "SET_CART":
      return { ...state, cart: action.cart };

    case "SET_CART_ID":
      return { ...state, cartId: action.cartId };

    case "ADD_TO_CART": {
      const key = itemKey(action.productId, action.variantId);
      const existing = state.cart.find(
        (i) => itemKey(i.productId, i.variantId) === key
      );
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            itemKey(i.productId, i.variantId) === key
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        cart: [
          ...state.cart,
          { productId: action.productId, variantId: action.variantId, quantity: 1 },
        ],
      };
    }

    case "REMOVE_FROM_CART": {
      const key = itemKey(action.productId, action.variantId);
      return {
        ...state,
        cart: state.cart.filter((i) => itemKey(i.productId, i.variantId) !== key),
      };
    }

    case "UPDATE_QUANTITY": {
      const key = itemKey(action.productId, action.variantId);
      if (action.quantity <= 0) {
        return {
          ...state,
          cart: state.cart.filter((i) => itemKey(i.productId, i.variantId) !== key),
        };
      }
      return {
        ...state,
        cart: state.cart.map((i) =>
          itemKey(i.productId, i.variantId) === key
            ? { ...i, quantity: action.quantity }
            : i
        ),
      };
    }

    case "SET_GIFT_BOX_CART":
      return { ...state, giftBoxCart: action.giftBoxCart };

    case "REMOVE_GIFT_BOX_ITEM":
      return {
        ...state,
        giftBoxCart: state.giftBoxCart.filter((i) => i.itemId !== action.itemId),
      };

    case "UPDATE_GIFT_BOX_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          giftBoxCart: state.giftBoxCart.filter((i) => i.itemId !== action.itemId),
        };
      }
      return {
        ...state,
        giftBoxCart: state.giftBoxCart.map((i) =>
          i.itemId === action.itemId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }

    case "CLEAR_CART":
      return { ...state, cart: [], giftBoxCart: [], cartId: null, coupon: null, couponRate: 0, couponId: null };

    case "TOGGLE_WISHLIST":
      return {
        ...state,
        wishlist: state.wishlist.includes(action.productId)
          ? state.wishlist.filter((id) => id !== action.productId)
          : [...state.wishlist, action.productId],
      };

    case "TOGGLE_DARK_MODE":
      return { ...state, darkMode: !state.darkMode };

    case "SET_COUPON":
      return { ...state, coupon: action.code, couponRate: action.rate, couponId: action.couponId };

    default:
      return state;
  }
}

/* ─── CONTEXT TYPES ─────────────────────────────────────────────────────── */
interface StoreContextType {
  state: StoreState;
  dispatch: React.Dispatch<Action>;
  cartCount: number;
  cartSubtotal: number;
  discount: number;
  cartTotal: number;
  isInWishlist: (id: string) => boolean;
  couponRate: number;
  user: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  products: any[];
  fetchUserOrders: () => Promise<any[]>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  syncAddToCart: (productId: string, variantId?: string, quantity?: number) => Promise<void>;
  syncUpdateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
    itemId?: string
  ) => Promise<void>;
  syncRemoveFromCart: (
    productId: string,
    variantId?: string,
    itemId?: string
  ) => Promise<void>;
  syncUpdateGiftBoxQuantity: (itemId: string, quantity: number) => Promise<void>;
  syncRemoveGiftBoxItem: (itemId: string) => Promise<void>;
  giftBoxSubtotal: number;
  fetchLiveCart: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

const initialState: StoreState = {
  cart: [],
  giftBoxCart: [],
  wishlist: [],
  darkMode: true,
  coupon: null,
  couponRate: 0,
  couponId: null,
  cartId: null,
};

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem("store");
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch {
    return initialState;
  }
}

/* ─── STORE PROVIDER ────────────────────────────────────────────────────── */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [dbProducts, setDbProducts] = React.useState<any[]>([]);
  const [user, setUser] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || "/api" });
  api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    let sessionId = localStorage.getItem("x-session-id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("x-session-id", sessionId);
    }
    config.headers["x-session-id"] = sessionId;
    return config;
  });

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    try {
      const sessionId = localStorage.getItem("x-session-id");
      if (sessionId) {
        await api.post("/cart/merge", { sessionId });
      }
      await fetchLiveCart();
    } catch (err) {
      console.error("Cart merge failed:", err);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  };

  const fetchLiveCart = async () => {
    try {
      const res = await api.get("/cart");
      const items = res.data.items ?? [];
      const giftBoxItems = res.data.giftBoxItems ?? [];
      const cartId = res.data.cartId ?? null;

      const formattedCart: CartItem[] = items.map((item: any) => {
        const product = item.product_variants?.products;
        return {
          itemId: item.id,
          productId: product?.id ?? "",
          variantId: item.variant_id || undefined,
          quantity: item.quantity,
          slug: product?.slug ?? null,
        };
      });

      const formattedGiftBoxCart: GiftBoxCartItem[] = giftBoxItems.map((item: any) => {
        const box = item.gift_boxes;
        const contents = (item.cart_gift_box_item_contents || []).map((c: any) => ({
          variantId: c.product_variants?.id ?? "",
          quantity: c.quantity,
          productName: c.product_variants?.products?.name,
          sku: c.product_variants?.sku,
        }));
        return {
          itemId: item.id,
          giftBoxId: box?.id ?? "",
          name: box?.name ?? "Gift Box",
          slug: box?.slug,
          image: box?.image_url,
          basePrice: parseFloat(box?.base_price ?? 0),
          quantity: item.quantity,
          contents,
        };
      });

      dispatch({ type: "SET_CART", cart: formattedCart });
      dispatch({ type: "SET_GIFT_BOX_CART", giftBoxCart: formattedGiftBoxCart });
      dispatch({ type: "SET_CART_ID", cartId });
    } catch (err) {
      console.error("Failed to sync cart:", err);
    }
  };

  const syncAddToCart = async (productId: string, variantId?: string, quantity: number = 1) => {
    dispatch({ type: "ADD_TO_CART", productId, variantId });
    try {
      await api.post("/cart/items", { variantId: variantId || productId, quantity });
      await fetchLiveCart();
    } catch (err) {
      console.error("Backend cart add failed:", err);
      toast.error("Couldn't add item to cart — please try again.");
      dispatch({ type: "REMOVE_FROM_CART", productId, variantId });
    }
  };

  const syncUpdateQuantity = async (
    productId: string,
    quantity: number,
    variantId?: string,
    itemId?: string
  ) => {
    dispatch({ type: "UPDATE_QUANTITY", productId, variantId, quantity });
    if (!itemId) {
      console.warn("No itemId — cannot sync quantity to backend");
      return;
    }
    try {
      if (quantity <= 0) {
        await api.delete(`/cart/items/${itemId}`);
      } else {
        await api.patch(`/cart/items/${itemId}`, { quantity });
      }
    } catch (err) {
      console.error("Backend quantity sync failed:", err);
    }
  };

  const syncRemoveFromCart = async (
    productId: string,
    variantId?: string,
    itemId?: string
  ) => {
    dispatch({ type: "REMOVE_FROM_CART", productId, variantId });
    if (!itemId) {
      console.warn("No itemId — cannot sync removal to backend");
      return;
    }
    try {
      await api.delete(`/cart/items/${itemId}`);
    } catch (err) {
      console.error("Backend cart remove failed:", err);
    }
  };

  const syncUpdateGiftBoxQuantity = async (itemId: string, quantity: number) => {
    dispatch({ type: "UPDATE_GIFT_BOX_QUANTITY", itemId, quantity });
    try {
      if (quantity <= 0) {
        await api.delete(`/cart/gift-box-items/${itemId}`);
      } else {
        await api.patch(`/cart/gift-box-items/${itemId}`, { quantity });
      }
    } catch (err) {
      console.error("Backend gift box quantity sync failed:", err);
    }
  };

  const syncRemoveGiftBoxItem = async (itemId: string) => {
    dispatch({ type: "REMOVE_GIFT_BOX_ITEM", itemId });
    try {
      await api.delete(`/cart/gift-box-items/${itemId}`);
    } catch (err) {
      console.error("Backend gift box remove failed:", err);
    }
  };

  // Fetch all products from API
  useEffect(() => {
    async function fetchInventory() {
      try {
   const res = await fetch(`${import.meta.env.VITE_API_BASE || "/api"}/products?limit=100`);
        const result = await res.json();
        if (Array.isArray(result)) {
          setDbProducts(result);
        } else if (result.products) {
          setDbProducts(result.products);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    }
    fetchInventory();
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem("store", JSON.stringify(state));
  }, [state]);

  // Dark mode
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [state.darkMode]);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) fetchLiveCart();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        fetchLiveCart();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    dispatch({ type: "CLEAR_CART" });
  };

  const fetchUserOrders = async () => {
    if (!user?.id) return [];
    try {
      const res = await api.get("/orders");
      return res.data || [];
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      return [];
    }
  };

  /* ─── CALCULATIONS ──────────────────────────────────────────────────────── */
  const cartCount =
    state.cart.reduce((sum, item) => sum + item.quantity, 0) +
    state.giftBoxCart.reduce((sum, item) => sum + item.quantity, 0);

  const productSubtotal = state.cart.reduce((sum, item) => {
    const product = dbProducts.find((p) => p.id === item.productId);
    if (!product) return sum;
    return sum + (product.price || 0) * item.quantity;
  }, 0);

  const giftBoxSubtotal = state.giftBoxCart.reduce(
    (sum, item) => sum + item.basePrice * item.quantity,
    0
  );

  const cartSubtotal = productSubtotal + giftBoxSubtotal;
  const couponRate = state.couponRate;
  const discount = cartSubtotal * state.couponRate;
  const shipping = cartSubtotal > 0 && cartSubtotal < 75 ? 9.99 : 0;
  const cartTotal = cartSubtotal - discount + shipping;

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        cartCount,
        cartSubtotal,
        discount,
        cartTotal,
        isInWishlist: (id) => state.wishlist.includes(id),
        couponRate,
        user,
        loading,
        signOut,
        products: dbProducts,
        fetchUserOrders,
        signInWithEmail,
        signUpWithEmail,
        syncAddToCart,
        syncUpdateQuantity,
        syncRemoveFromCart,
        syncUpdateGiftBoxQuantity,
        syncRemoveGiftBoxItem,
        giftBoxSubtotal,
        fetchLiveCart,
      }}
    >
      {!loading && children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}