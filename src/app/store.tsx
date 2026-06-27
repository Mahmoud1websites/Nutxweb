import React, { createContext, useContext, useReducer, useEffect } from "react";
import { supabase } from "./config/supabaseClient";
import axios from "axios";

export interface CartItem {
  itemId?: string;
  productId: string;
  variantId?: string;
  quantity: number;
  slug?: string; // ← carried from server for navigation links
}

interface StoreState {
  cart: CartItem[];
  wishlist: string[];
  darkMode: boolean;
  coupon: string | null;
}

type Action =
  | { type: "SET_CART"; cart: CartItem[] }
  | { type: "ADD_TO_CART"; productId: string; variantId?: string }
  | { type: "REMOVE_FROM_CART"; productId: string; variantId?: string }
  | { type: "UPDATE_QUANTITY"; productId: string; variantId?: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_WISHLIST"; productId: string }
  | { type: "TOGGLE_DARK_MODE" }
  | { type: "SET_COUPON"; code: string | null };

function itemKey(productId: string, variantId?: string) {
  return variantId ? `${productId}__${variantId}` : productId;
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "SET_CART":
      return { ...state, cart: action.cart };

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

    case "CLEAR_CART":
      return { ...state, cart: [] };

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
      return { ...state, coupon: action.code };

    default:
      return state;
  }
}

const COUPONS: Record<string, number> = {
  SAVE10: 0.1,
  WELCOME20: 0.2,
  FLASH15: 0.15,
};

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
  syncAddToCart: (productId: string, variantId?: string) => Promise<void>;
  syncUpdateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
    itemId?: string
  ) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

const initialState: StoreState = {
  cart: [],
  wishlist: [],
  darkMode: true,
  coupon: null,
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

  const api = axios.create({ baseURL: "/api" });
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
      await api.post("/cart/merge");
      fetchLiveCart();
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

      const formattedCart: CartItem[] = items.map((item: any) => {
        const product = item.product_variants?.products;
        return {
          itemId: item.id,
          productId: product?.id ?? "",
          variantId: item.variant_id || undefined,
          quantity: item.quantity,
          // ✅ carry the slug so Cart.tsx can build correct /products/:slug links
          slug: product?.slug ?? null,
        };
      });

      dispatch({ type: "SET_CART", cart: formattedCart });
    } catch (err) {
      console.error("Failed to sync cart:", err);
    }
  };

  const syncAddToCart = async (productId: string, variantId?: string) => {
    dispatch({ type: "ADD_TO_CART", productId, variantId });
    try {
      await api.post("/cart/items", { variantId: variantId || productId, quantity: 1 });
    } catch (err) {
      console.error("Backend cart add failed:", err);
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

  // Fetch all products from API
  useEffect(() => {
    async function fetchInventory() {
      try {
        // In store.tsx, update the fetchInventory call:
        const res = await fetch("/api/products?limit=100");
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
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartSubtotal = state.cart.reduce((sum, item) => {
    const product = dbProducts.find((p) => p.id === item.productId);
    if (!product) return sum;
    return sum + (product.price || 0) * item.quantity;
  }, 0);
  const couponRate = state.coupon ? (COUPONS[state.coupon] ?? 0) : 0;
  const discount = cartSubtotal * couponRate;
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