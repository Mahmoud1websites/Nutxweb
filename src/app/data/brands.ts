export interface Brand {
  name: string;
  category: string;
  country: string;
  description: string;
  productCount: number;
  featured: boolean;
  image: string;
}

export const BRANDS_DATA: Brand[] = [
  {
    name: "Pioneer",
    category: "Audio & Electronics",
    country: "Japan",
    description: "World-leading car audio brand known for high-fidelity head units, speakers, and multimedia systems.",
    productCount: 48,
    featured: true,
    image: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Kenwood",
    category: "Audio & Electronics",
    country: "Japan",
    description: "Premium audio and communication equipment. Trusted by enthusiasts for superior sound clarity.",
    productCount: 36,
    featured: true,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "JBL",
    category: "Audio & Electronics",
    country: "USA",
    description: "Iconic sound engineering from Harman. JBL car speakers deliver concert-hall audio on the road.",
    productCount: 29,
    featured: true,
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Alpine",
    category: "Audio & Electronics",
    country: "Japan",
    description: "Precision-engineered in-car entertainment systems. Alpine sets the benchmark for mobile audio.",
    productCount: 22,
    featured: true,
    image: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Blaupunkt",
    category: "Audio & Electronics",
    country: "Germany",
    description: "German engineering meets car audio. Blaupunkt's heritage spans over a century of innovation.",
    productCount: 18,
    featured: false,
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Thule",
    category: "Exterior Accessories",
    country: "Sweden",
    description: "Swedish precision for roof racks, cargo carriers, and bike mounts. Built for adventure.",
    productCount: 31,
    featured: true,
    image: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Hella",
    category: "Lighting",
    country: "Germany",
    description: "OEM-quality automotive lighting systems. Hella supplies the world's top car manufacturers.",
    productCount: 44,
    featured: true,
    image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Osram",
    category: "Lighting",
    country: "Germany",
    description: "LED and HID lighting specialists. Osram bulbs deliver longer life and brighter output.",
    productCount: 38,
    featured: false,
    image: "https://images.unsplash.com/photo-1558089687-f282ffcbd1d5?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Bosch",
    category: "Performance Parts",
    country: "Germany",
    description: "The world's largest auto parts supplier. Bosch parts are trusted in workshops across 150 countries.",
    productCount: 67,
    featured: true,
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "K&N",
    category: "Performance Parts",
    country: "USA",
    description: "High-flow air filters and intake systems that boost horsepower without harming your engine.",
    productCount: 15,
    featured: false,
    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Bilstein",
    category: "Performance Parts",
    country: "Germany",
    description: "Motorsport-derived shock absorbers and suspension systems for the discerning driver.",
    productCount: 12,
    featured: false,
    image: "https://images.unsplash.com/photo-1532581291347-9c39cf10a73c?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Michelin",
    category: "Tires & Wheels",
    country: "France",
    description: "The world's most recognized tire brand. Michelin tires balance performance, safety, and longevity.",
    productCount: 24,
    featured: true,
    image: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Varta",
    category: "Performance Parts",
    country: "Germany",
    description: "Premium automotive batteries. Varta powers millions of vehicles with reliable, long-lasting energy.",
    productCount: 19,
    featured: false,
    image: "https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "Meguiar's",
    category: "Car Care & Detailing",
    country: "USA",
    description: "The detailer's choice since 1901. Meguiar's polishes, waxes, and cleaners set the gold standard.",
    productCount: 33,
    featured: true,
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=150&h=150&fit=crop&q=80",
  },
  {
    name: "3M",
    category: "Car Care & Detailing",
    country: "USA",
    description: "Industrial-grade car care from one of the world's most trusted science companies.",
    productCount: 27,
    featured: false,
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=150&h=150&fit=crop&q=80",
  },
];

export const ALL_CATEGORIES = ["All", ...Array.from(new Set(BRANDS_DATA.map((b) => b.category)))];