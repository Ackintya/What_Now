export interface CatalogProduct {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  ingredients: string[];
  tags: string[];
  source?: string;
  product_url?: string;
}

export const MOCK_PRODUCT_CATALOG: CatalogProduct[] = [
  {
    id: "p1",
    product_name: "Barrier Calm Cleanser",
    brand: "DermaRoot",
    category: "cleanser",
    ingredients: ["glycerin", "niacinamide", "panthenol", "ceramide np"],
    tags: ["hydrating", "barrier support"],
  },
  {
    id: "p2",
    product_name: "Hydra Balance Moisturizer",
    brand: "NovaSkin",
    category: "moisturizer",
    ingredients: ["hyaluronic acid", "ceramide np", "squalane", "allantoin"],
    tags: ["dryness support", "daily use"],
  },
  {
    id: "p3",
    product_name: "Even Tone Night Serum",
    brand: "Lumina Lab",
    category: "serum",
    ingredients: ["niacinamide", "azelaic acid", "licorice root extract", "glycerin"],
    tags: ["tone support", "appearance smoothing"],
  },
  {
    id: "p4",
    product_name: "Clear Texture Serum",
    brand: "Clarity Works",
    category: "serum",
    ingredients: ["salicylic acid", "zinc pca", "green tea extract", "panthenol"],
    tags: ["oil control", "texture"],
  },
  {
    id: "p5",
    product_name: "Mineral Daily Shield SPF 40",
    brand: "SunQuiet",
    category: "sunscreen",
    ingredients: ["zinc oxide", "squalane", "vitamin e", "bisabolol"],
    tags: ["daily defense", "sensitive skin"],
  },
  {
    id: "p6",
    product_name: "Scalp Reset Shampoo",
    brand: "RootWise",
    category: "shampoo",
    ingredients: ["pyrithione zinc", "panthenol", "tea tree extract", "glycerin"],
    tags: ["flaking support", "refresh"],
  },
  {
    id: "p7",
    product_name: "Gentle Moisture Shampoo",
    brand: "SoftCurrent",
    category: "shampoo",
    ingredients: ["cocamidopropyl betaine", "aloe vera", "betaine", "panthenol"],
    tags: ["dry scalp support", "gentle"],
  },
  {
    id: "p8",
    product_name: "Repair Veil Conditioner",
    brand: "SoftCurrent",
    category: "conditioner",
    ingredients: ["cetyl alcohol", "argan oil", "hydrolyzed keratin", "panthenol"],
    tags: ["thinning appearance support", "repair"],
  },
  {
    id: "p9",
    product_name: "Scalp Comfort Serum",
    brand: "RootWise",
    category: "scalp serum",
    ingredients: ["niacinamide", "caffeine", "panthenol", "peptide complex"],
    tags: ["scalp care", "root support"],
  },
  {
    id: "p10",
    product_name: "Calm Mist Toner",
    brand: "DermaRoot",
    category: "serum",
    ingredients: ["centella asiatica", "allantoin", "glycerin", "beta-glucan"],
    tags: ["calming", "hydrating"],
  },
  {
    id: "p11",
    product_name: "Protein Bounce Mask",
    brand: "HairForge",
    category: "conditioner",
    ingredients: ["hydrolyzed wheat protein", "amino acids", "argan oil", "panthenol"],
    tags: ["strength", "texture"],
  },
  {
    id: "p12",
    product_name: "Lightweight Gel Moisturizer",
    brand: "NovaSkin",
    category: "moisturizer",
    ingredients: ["hyaluronic acid", "green tea extract", "niacinamide", "betaine"],
    tags: ["combination skin", "oil balance"],
  },
];
