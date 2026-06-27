export interface Variant {
  id: string;
  label: string;
  type: "color" | "size" | "storage";
  value: string;
  inStock: boolean;
  priceModifier?: number;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  avatar: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  helpful: number;
  verified: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number;
  images: string[];
  description: string;
  features: string[];
  variants: Variant[];
  tags: string[];
  featured: boolean;
  badge?: string;
}

export interface Order {
  id: string;
  date: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  items: { productId: string; name: string; quantity: number; price: number; image: string }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  trackingNumber?: string;
}

export const categories = [
  { id: "electronics", name: "Electronics", icon: "💻", count: 48, image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=400&fit=crop&auto=format" },
  { id: "clothing", name: "Clothing", icon: "👕", count: 124, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop&auto=format" },
  { id: "home", name: "Home & Living", icon: "🏠", count: 86, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop&auto=format" },
  { id: "sports", name: "Sports & Fitness", icon: "⚽", count: 63, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop&auto=format" },
];

export const products: Product[] = [
  {
    id: "1",
    name: "Sony WH-1000XM5 Wireless Headphones",
    price: 349.99,
    originalPrice: 399.99,
    category: "Electronics",
    rating: 4.8,
    reviewCount: 2847,
    inStock: true,
    stockCount: 34,
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop&auto=format",
    ],
    description: "Industry-leading noise canceling with two processors, 30-hour battery life, and exceptional call quality. The WH-1000XM5 sets the benchmark for premium wireless headphones with precise Auto NC Optimizer that automatically adjusts noise canceling settings.",
    features: ["30-hour battery life", "Industry-leading noise canceling", "Crystal-clear hands-free calling", "Speak-to-Chat technology", "Multipoint connection — 2 devices"],
    variants: [
      { id: "1-black", label: "Black", type: "color", value: "#1a1a1a", inStock: true },
      { id: "1-silver", label: "Platinum Silver", type: "color", value: "#c0c0c0", inStock: true },
    ],
    tags: ["wireless", "noise-canceling", "premium", "audio"],
    featured: true,
    badge: "Best Seller",
  },
  {
    id: "2",
    name: "Apple Watch Series 9 GPS 45mm",
    price: 429.00,
    category: "Electronics",
    rating: 4.9,
    reviewCount: 1923,
    inStock: true,
    stockCount: 18,
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop&auto=format",
    ],
    description: "The most advanced Apple Watch ever, featuring the new S9 chip for double tap gesture, brighter Always-On Retina display, and precision finding for iPhone.",
    features: ["S9 SiP chip", "Double tap gesture", "Carbon neutral", "18-hour battery", "Crash Detection & ECG"],
    variants: [
      { id: "2-midnight", label: "Midnight", type: "color", value: "#1c2028", inStock: true },
      { id: "2-starlight", label: "Starlight", type: "color", value: "#e8e0d4", inStock: true },
      { id: "2-red", label: "Product Red", type: "color", value: "#b91c1c", inStock: false },
    ],
    tags: ["smartwatch", "apple", "fitness", "wearable"],
    featured: true,
    badge: "New",
  },
  {
    id: "3",
    name: "MacBook Pro 14\" M3 Pro",
    price: 1999.00,
    originalPrice: 2199.00,
    category: "Electronics",
    rating: 4.9,
    reviewCount: 892,
    inStock: true,
    stockCount: 8,
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop&auto=format",
    ],
    description: "MacBook Pro with M3 Pro chip for groundbreaking performance. Up to 22 hours of battery life, Liquid Retina XDR display, and advanced connectivity.",
    features: ["M3 Pro chip", "18GB unified memory", "512GB SSD", "Liquid Retina XDR display", "Up to 22-hour battery"],
    variants: [
      { id: "3-space", label: "Space Black", type: "color", value: "#1c1c1e", inStock: true },
      { id: "3-silver", label: "Silver", type: "color", value: "#e2e2e2", inStock: true },
    ],
    tags: ["laptop", "apple", "professional", "m3"],
    featured: true,
    badge: "Sale",
  },
  {
    id: "4",
    name: "Nike Air Max 270 React",
    price: 149.99,
    originalPrice: 179.99,
    category: "Clothing",
    rating: 4.6,
    reviewCount: 4251,
    inStock: true,
    stockCount: 52,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop&auto=format",
    ],
    description: "The Nike Air Max 270 React combines the Air Max 270's towering Air unit with React foam for a supremely comfortable ride from morning to night.",
    features: ["Max Air 270 unit", "React foam midsole", "Engineered mesh upper", "Rubber outsole", "Pull tab at heel"],
    variants: [
      { id: "4-us8", label: "US 8", type: "size", value: "8", inStock: true },
      { id: "4-us9", label: "US 9", type: "size", value: "9", inStock: true },
      { id: "4-us10", label: "US 10", type: "size", value: "10", inStock: true },
      { id: "4-us11", label: "US 11", type: "size", value: "11", inStock: true },
      { id: "4-us12", label: "US 12", type: "size", value: "12", inStock: false },
    ],
    tags: ["sneakers", "nike", "running", "casual"],
    featured: true,
    badge: "Sale",
  },
  {
    id: "5",
    name: "Premium Merino Wool Hoodie",
    price: 124.00,
    category: "Clothing",
    rating: 4.7,
    reviewCount: 631,
    inStock: true,
    stockCount: 41,
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f96ccbfd?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=600&fit=crop&auto=format",
    ],
    description: "Ultra-soft merino wool blend hoodie for all-day comfort. Naturally temperature-regulating, moisture-wicking, and odor-resistant. Built to last a decade.",
    features: ["100% merino wool blend", "Temperature regulating", "Moisture wicking", "Odor resistant", "Pre-washed for softness"],
    variants: [
      { id: "5-s", label: "S", type: "size", value: "S", inStock: true },
      { id: "5-m", label: "M", type: "size", value: "M", inStock: true },
      { id: "5-l", label: "L", type: "size", value: "L", inStock: true },
      { id: "5-xl", label: "XL", type: "size", value: "XL", inStock: false },
    ],
    tags: ["hoodie", "merino", "casual", "premium"],
    featured: false,
  },
  {
    id: "6",
    name: "Leather Weekender Bag",
    price: 289.00,
    category: "Clothing",
    rating: 4.8,
    reviewCount: 418,
    inStock: true,
    stockCount: 12,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop&auto=format",
    ],
    description: "Handcrafted from full-grain vegetable-tanned leather, this weekender develops a rich patina over time. Includes a removable shoe compartment and padded laptop sleeve.",
    features: ["Full-grain leather", "Vegetable tanned", "Removable shoe bag", "Padded laptop sleeve (up to 15\")", "100-year warranty"],
    variants: [
      { id: "6-cognac", label: "Cognac", type: "color", value: "#b45309", inStock: true },
      { id: "6-black", label: "Black", type: "color", value: "#111111", inStock: true },
    ],
    tags: ["bag", "leather", "travel", "premium"],
    featured: true,
    badge: "New",
  },
  {
    id: "7",
    name: "Handcrafted Ceramic Mug Set",
    price: 64.00,
    category: "Home & Living",
    rating: 4.5,
    reviewCount: 287,
    inStock: true,
    stockCount: 67,
    images: [
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format",
    ],
    description: "Set of 4 hand-thrown ceramic mugs, each slightly different — testament to the craft. Microwave and dishwasher safe, holds 12oz.",
    features: ["Set of 4 mugs", "Hand-thrown ceramic", "12oz capacity", "Microwave safe", "Dishwasher safe"],
    variants: [
      { id: "7-speckled", label: "Speckled White", type: "color", value: "#f5f0eb", inStock: true },
      { id: "7-navy", label: "Navy Glaze", type: "color", value: "#1e3a5f", inStock: true },
      { id: "7-sage", label: "Sage Green", type: "color", value: "#7d9b76", inStock: false },
    ],
    tags: ["mugs", "ceramic", "kitchen", "gift"],
    featured: false,
  },
  {
    id: "8",
    name: "Ray-Ban Aviator Classic",
    price: 161.00,
    category: "Clothing",
    rating: 4.7,
    reviewCount: 3124,
    inStock: true,
    stockCount: 29,
    images: [
      "https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&auto=format",
    ],
    description: "The original Aviator, born in 1937 and still the icon. Crafted with high-quality materials, optimal comfort, and UV protection for everyday wear.",
    features: ["100% UV protection", "Polarized lenses", "Metal frame", "Includes hard case", "Italian craftsmanship"],
    variants: [
      { id: "8-gold", label: "Gold / Green", type: "color", value: "#d4a017", inStock: true },
      { id: "8-silver", label: "Silver / Blue", type: "color", value: "#9ca3af", inStock: true },
      { id: "8-black", label: "Black / Gray", type: "color", value: "#111111", inStock: true },
    ],
    tags: ["sunglasses", "rayban", "eyewear", "aviator"],
    featured: false,
  },
  {
    id: "9",
    name: "Canon EOS R6 Mark II Mirrorless",
    price: 2499.00,
    originalPrice: 2699.00,
    category: "Electronics",
    rating: 4.9,
    reviewCount: 547,
    inStock: true,
    stockCount: 6,
    images: [
      "https://images.unsplash.com/photo-1502920917128-1aa500764c01?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop&auto=format",
    ],
    description: "40fps burst shooting, 6K RAW video, and the best autofocus system Canon has ever made. The R6 II is the versatile full-frame mirrorless for photographers and video creators.",
    features: ["40fps continuous shooting", "6K RAW video output", "Subject Tracking AF", "In-body image stabilization", "Dual card slots"],
    variants: [],
    tags: ["camera", "canon", "mirrorless", "professional"],
    featured: true,
    badge: "Sale",
  },
  {
    id: "10",
    name: "iPhone 15 Pro 256GB",
    price: 999.00,
    category: "Electronics",
    rating: 4.8,
    reviewCount: 5671,
    inStock: true,
    stockCount: 24,
    images: [
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop&auto=format",
    ],
    description: "iPhone 15 Pro — the first iPhone built with aerospace-grade titanium. The A17 Pro chip, 48MP main camera, and Action button make this the most pro iPhone ever.",
    features: ["A17 Pro chip", "Titanium design", "Action button", "48MP Fusion camera", "USB 3 speeds"],
    variants: [
      { id: "10-256", label: "256GB", type: "storage", value: "256GB", inStock: true },
      { id: "10-512", label: "512GB", type: "storage", value: "512GB", inStock: true, priceModifier: 200 },
      { id: "10-1tb", label: "1TB", type: "storage", value: "1TB", inStock: true, priceModifier: 400 },
    ],
    tags: ["iphone", "apple", "smartphone", "5g"],
    featured: false,
    badge: "Best Seller",
  },
  {
    id: "11",
    name: "Keychron Q1 Pro Mechanical Keyboard",
    price: 199.00,
    category: "Electronics",
    rating: 4.7,
    reviewCount: 1089,
    inStock: true,
    stockCount: 15,
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&h=600&fit=crop&auto=format",
    ],
    description: "The Q1 Pro is a wireless 75% layout mechanical keyboard with QMK/VIA support, gasket-mounted construction, and fully-programmable RGB.",
    features: ["QMK/VIA programmable", "Gasket mount", "Hot-swappable switches", "Wireless Bluetooth 5.1", "Aluminum body"],
    variants: [
      { id: "11-red", label: "Gateron Red", type: "color", value: "#dc2626", inStock: true },
      { id: "11-blue", label: "Gateron Blue", type: "color", value: "#2563eb", inStock: true },
      { id: "11-brown", label: "Gateron Brown", type: "color", value: "#92400e", inStock: false },
    ],
    tags: ["keyboard", "mechanical", "productivity", "wireless"],
    featured: false,
  },
  {
    id: "12",
    name: "Lululemon Align Yoga Mat 5mm",
    price: 88.00,
    category: "Sports & Fitness",
    rating: 4.6,
    reviewCount: 2341,
    inStock: true,
    stockCount: 78,
    images: [
      "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1601925228127-1cc4e08d4e71?w=600&h=600&fit=crop&auto=format",
    ],
    description: "The Align yoga mat features our unique LiquiForm process for a smooth, grippy surface that keeps up with your practice. 5mm thick for cushioning without sacrificing ground feel.",
    features: ["5mm thick", "LiquiForm smooth top", "Natural rubber base", "Alignment lines", "Includes carry strap"],
    variants: [
      { id: "12-standard", label: "Standard (68\")", type: "size", value: "68\"", inStock: true },
      { id: "12-long", label: "Long (71\")", type: "size", value: "71\"", inStock: true },
    ],
    tags: ["yoga", "fitness", "mat", "lululemon"],
    featured: false,
  },
  {
    id: "13",
    name: "Flos Arco Floor Lamp",
    price: 1250.00,
    category: "Home & Living",
    rating: 4.8,
    reviewCount: 192,
    inStock: true,
    stockCount: 4,
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600&h=600&fit=crop&auto=format",
    ],
    description: "Achille and Pier Giacomo Castiglioni's 1962 Arco is the archetype of the modern floor lamp. A Carrara marble base, stainless-steel arch, and spun-aluminum shade.",
    features: ["Carrara marble base", "Stainless steel arch", "Aluminum shade", "E26 bulb socket", "Designed in 1962, made for a lifetime"],
    variants: [
      { id: "13-white", label: "White", type: "color", value: "#f5f5f5", inStock: true },
      { id: "13-black", label: "Black", type: "color", value: "#111111", inStock: true },
    ],
    tags: ["lamp", "flos", "design", "lighting"],
    featured: true,
    badge: "New",
  },
  {
    id: "14",
    name: "Fellow Ode Brew Grinder Gen 2",
    price: 365.00,
    category: "Home & Living",
    rating: 4.7,
    reviewCount: 891,
    inStock: true,
    stockCount: 19,
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop&auto=format",
    ],
    description: "The Ode Brew Grinder Gen 2 is a flat-burr grinder purpose-built for home brewing. 31 grind settings, single-dose tray, and low retention burrs for a precise cup every time.",
    features: ["64mm flat burrs", "31 grind settings", "Single-dose loading", "Anti-static tech", "Built for pour-over, French press, AeroPress"],
    variants: [
      { id: "14-matte", label: "Matte Black", type: "color", value: "#1a1a1a", inStock: true },
      { id: "14-cream", label: "Cream", type: "color", value: "#f5f0e8", inStock: true },
    ],
    tags: ["coffee", "grinder", "fellow", "brewing"],
    featured: false,
  },
  {
    id: "15",
    name: "Patagonia Torrentshell 3L Jacket",
    price: 179.00,
    category: "Clothing",
    rating: 4.6,
    reviewCount: 1432,
    inStock: true,
    stockCount: 31,
    images: [
      "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&h=600&fit=crop&auto=format",
    ],
    description: "A wind- and waterproof shell made with H2No Performance Standard fabric. The Torrentshell has been a go-to for outdoor adventures for 20+ years.",
    features: ["H2No Performance Standard", "Waterproof, windproof, breathable", "Helmet-compatible hood", "Internal mesh pocket", "Fair Trade certified sewn"],
    variants: [
      { id: "15-s", label: "S", type: "size", value: "S", inStock: true },
      { id: "15-m", label: "M", type: "size", value: "M", inStock: true },
      { id: "15-l", label: "L", type: "size", value: "L", inStock: true },
      { id: "15-xl", label: "XL", type: "size", value: "XL", inStock: true },
    ],
    tags: ["jacket", "patagonia", "outdoor", "waterproof"],
    featured: false,
  },
  {
    id: "16",
    name: "Dyson V15 Detect Absolute",
    price: 749.99,
    originalPrice: 849.99,
    category: "Home & Living",
    rating: 4.8,
    reviewCount: 3287,
    inStock: true,
    stockCount: 9,
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=600&fit=crop&auto=format",
    ],
    description: "Laser reveals dust you cannot see. Counts and sizes every particle. Auto-boosts power to remove it. The V15 Detect is Dyson's most intelligent cordless vacuum.",
    features: ["Laser Slim Fluffy cleaner head", "Dust particle counter display", "Auto-boost on carpets", "60-minute battery", "HEPA filtration"],
    variants: [],
    tags: ["vacuum", "dyson", "cordless", "home"],
    featured: false,
    badge: "Sale",
  },
];

export const reviews: Review[] = [
  { id: "r1", productId: "1", userName: "Marcus T.", avatar: "M", rating: 5, title: "Best headphones I've ever owned", body: "The noise canceling is genuinely incredible. I commute through NYC every day and these block out everything. Battery lasts me 3 days easily.", date: "2024-11-12", helpful: 234, verified: true },
  { id: "r2", productId: "1", userName: "Sarah K.", avatar: "S", rating: 5, title: "Worth every penny", body: "Upgraded from the XM4s. The call quality improvement is massive. My team can actually hear me on Zoom calls now. Comfort is 10/10 for long sessions.", date: "2024-10-28", helpful: 189, verified: true },
  { id: "r3", productId: "1", userName: "James L.", avatar: "J", rating: 4, title: "Great but touch controls are finicky", body: "Sound quality and ANC are world-class. Minor gripe: the touch controls take some getting used to. Almost gave them 5 stars.", date: "2024-09-15", helpful: 67, verified: false },
  { id: "r4", productId: "2", userName: "Priya M.", avatar: "P", rating: 5, title: "Double tap changed my life", body: "I know that sounds dramatic but the new double tap gesture is incredibly convenient. The display is noticeably brighter too.", date: "2024-11-01", helpful: 156, verified: true },
  { id: "r5", productId: "3", userName: "Chen W.", avatar: "C", rating: 5, title: "The laptop I've always wanted", body: "Coming from a Windows machine. The battery life is insane — I got 19 hours on a real workday of Figma, VS Code, and meetings.", date: "2024-10-10", helpful: 412, verified: true },
  { id: "r6", productId: "4", userName: "Alex R.", avatar: "A", rating: 5, title: "Most comfortable sneakers I own", body: "Wore these all day at a conference, 12 hours on my feet. Feet didn't hurt at all. The React foam is a different level.", date: "2024-09-22", helpful: 98, verified: true },
];

export const mockOrders: Order[] = [
  {
    id: "ORD-7842",
    date: "2024-11-15",
    status: "delivered",
    items: [
      { productId: "1", name: "Sony WH-1000XM5 Wireless Headphones", quantity: 1, price: 349.99, image: products[0].images[0] },
    ],
    subtotal: 349.99,
    discount: 0,
    shipping: 0,
    total: 349.99,
    trackingNumber: "1Z999AA10123456784",
  },
  {
    id: "ORD-7631",
    date: "2024-10-22",
    status: "delivered",
    items: [
      { productId: "4", name: "Nike Air Max 270 React", quantity: 1, price: 149.99, image: products[3].images[0] },
      { productId: "5", name: "Premium Merino Wool Hoodie", quantity: 1, price: 124.00, image: products[4].images[0] },
    ],
    subtotal: 273.99,
    discount: 27.40,
    shipping: 0,
    total: 246.59,
    trackingNumber: "1Z999AA10123456785",
  },
  {
    id: "ORD-7290",
    date: "2024-09-08",
    status: "delivered",
    items: [
      { productId: "7", name: "Handcrafted Ceramic Mug Set", quantity: 2, price: 64.00, image: products[6].images[0] },
    ],
    subtotal: 128.00,
    discount: 0,
    shipping: 9.99,
    total: 137.99,
  },
];

export const adminStats = {
  revenue: { value: 124582, change: 12.4, period: "vs last month" },
  orders: { value: 1247, change: 8.2, period: "vs last month" },
  customers: { value: 8934, change: 15.7, period: "vs last month" },
  products: { value: 156, change: 3, period: "new this month" },
};

export const revenueData = [
  { date: "Jun 8", revenue: 3200, orders: 41 },
  { date: "Jun 9", revenue: 4100, orders: 53 },
  { date: "Jun 10", revenue: 3800, orders: 47 },
  { date: "Jun 11", revenue: 5200, orders: 68 },
  { date: "Jun 12", revenue: 4700, orders: 61 },
  { date: "Jun 13", revenue: 6100, orders: 79 },
  { date: "Jun 14", revenue: 5800, orders: 74 },
];

export const adminOrders = [
  { id: "ORD-7901", customer: "Emma Wilson", email: "emma@example.com", date: "2024-11-16", status: "processing", total: 1249.00, items: 2 },
  { id: "ORD-7900", customer: "Liam Johnson", email: "liam@example.com", date: "2024-11-16", status: "pending", total: 349.99, items: 1 },
  { id: "ORD-7899", customer: "Olivia Davis", email: "olivia@example.com", date: "2024-11-15", status: "shipped", total: 88.00, items: 1 },
  { id: "ORD-7898", customer: "Noah Brown", email: "noah@example.com", date: "2024-11-15", status: "delivered", total: 429.00, items: 1 },
  { id: "ORD-7897", customer: "Ava Martinez", email: "ava@example.com", date: "2024-11-14", status: "delivered", total: 674.00, items: 3 },
  { id: "ORD-7896", customer: "Ethan Garcia", email: "ethan@example.com", date: "2024-11-14", status: "cancelled", total: 199.00, items: 1 },
  { id: "ORD-7895", customer: "Isabella Anderson", email: "isabella@example.com", date: "2024-11-13", status: "delivered", total: 2499.00, items: 1 },
];
