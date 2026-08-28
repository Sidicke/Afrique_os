/**
 * Couche API — contrats backend
 * --------------------------------------------------------------------------
 * Types des réponses DTO du backend NestJS (`backend/src`). Ils reflètent
 * EXACTEMENT les contrats : ne pas « simplifier » ici sans vérifier le
 * backend. La conversion vers les types d'affichage du frontend vit dans
 * `mappers.ts`.
 */

/* ———————————————————————————————— Auth & Users ———————————————————————————————— */

export type ApiRole = "ADMIN" | "VENDEUR" | "CLIENT";

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  role: ApiRole;
  boutiqueId: string | null;
  boutiqueSlug: string | null;
}

export interface ApiAuthResponse {
  accessToken: string;
  user: ApiUser;
}

export interface ApiRegisterResponse {
  user: ApiUser;
  boutique: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
}

export interface ApiMerchantProfile {
  name: string;
  shopName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  avatarInitials: string;
  plan: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultPaymentMethod?: string;
  pointsBalance?: number;
  referralCode?: string;
}

/* ———————————————————————————————— Boutiques ———————————————————————————————— */

export interface ApiSocialLinks {
  instagram: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
}

export interface ApiDeliveryPack {
  id: string;
  name: string;
  price: number;
  description?: string;
  badge?: string;
}

export interface ApiPromotion {
  productId: string;
  discountPercent: number;
}

export interface ApiNotificationSetting {
  id: string;
  label?: string;
  description?: string;
  enabled?: boolean;
}

/** Boutique — projection propriétaire (GET /boutiques/:id, PATCH…) */
export interface ApiShop {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  status: string;
  /** Vérification du compte vendeur : NONE | PENDING | VERIFIED | REJECTED */
  verificationStatus: string | null;
  plan: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  whatsappNumber: string | null;
  coverImage: string | null;
  logoImage: string | null;
  deliveryShortLabel: string | null;
  deliveryNote: string | null;
  warrantyNote: string | null;
  paymentNote: string | null;
  socialLinks: ApiSocialLinks | null;
  deliveryPacks: ApiDeliveryPack[] | null;
  promotions: ApiPromotion[] | null;
  notifications: ApiNotificationSetting[] | null;
}

/** Boutique — profil public complet (GET /boutiques/public/:slug) */
export interface ApiPublicShop extends ApiShop {
  categories: Array<{ id: string; name: string; slug: string }>;
  products: ApiPublicProduct[];
}

/** Boutique — carte de l'annuaire (GET /boutiques/public, liste) */
export interface ApiBoutiqueCard {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  coverImage: string | null;
  logoImage: string | null;
  /** Vérification du compte vendeur : NONE | PENDING | VERIFIED | REJECTED */
  verificationStatus: string | null;
  category: string | null;
  productsCount: number;
}

/* ———————————————————————————————— Catalogue public ———————————————————————————————— */

export interface ApiVariant {
  id: string;
  name: string;
  value: string;
  priceDelta: number | string | null;
  stock: number;
}

/** Produit public (vitrine) — prix Prisma.Decimal sérialisé en chaîne */
export interface ApiPublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  oldPrice: number | string | null;
  currency: string;
  stock: number;
  isFeatured: boolean;
  images: string[];
  category: { name: string; slug: string } | null;
  brand?: { id: string; name: string; slug: string } | null;
  variants: ApiVariant[];
  reviews?: Array<{ rating: number }>;
  salesCount?: number;
  rating?: number | null;
  sku?: string | null;
  /** Boutique d'origine — présente dans le catalogue global (accueil client) */
  boutique?: {
    id: string;
    name: string;
    slug: string;
    /** Vérification du compte vendeur (badge de confiance) */
    verificationStatus?: string | null;
  };
}

export interface ApiCataloguePage {
  items: ApiPublicProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Avis public complet (page produit) */
export interface ApiPublicReview {
  id: string;
  author: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

/**
 * Détail produit public (GET /products/public/boutique/:slug/:id ou
 * /products/public/by-slug/:slug) — variantes + avis COMPLETS + boutique
 * (avec son id, nécessaire au lien « Discuter »).
 */
export interface ApiProductDetail extends ApiPublicProduct {
  category: { id: string; name: string; slug: string } | null;
  reviews: ApiPublicReview[];
  boutique: {
    id: string;
    name: string;
    slug: string;
    verificationStatus?: string | null;
  };
}

/** Produit — projection admin (dashboard vendeur) */
export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  oldPrice: number | string | null;
  currency: string;
  stock: number;
  sku: string | null;
  isFeatured: boolean;
  isActive: boolean;
  images: string[];
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  brandId: string | null;
  brand: { id: string; name: string; slug: string } | null;
  variants: ApiVariant[];
  createdAt: string;
  updatedAt: string;
  _count: { orderItems: number };
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
}

/** Catégorie du catalogue GLOBAL avec nombre de produits actifs (Marketplace) */
export interface ApiCategoryCount {
  name: string;
  slug: string;
  count: number;
}

/** Marque d'une boutique (ex. Samsung, Vlisco…) — rattache des produits */
export interface ApiBrand {
  id: string;
  name: string;
  slug: string;
}

/* ———————————————————————————————— Commandes ———————————————————————————————— */

export interface ApiOrderItem {
  productName: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
}

/** Commande — déjà au format frontend (toOrderView du backend) */
export interface ApiOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  country: string;
  status: string;
  paymentMethod: string;
  /** Référence de transaction fournisseur (présente après confirmation du paiement) */
  paymentRef?: string;
  /** Motif d'annulation saisi par le client (présent seulement si annulée avec motif) */
  cancellationReason?: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  totalPriceFcfa: number;
  items: ApiOrderItem[];
  deliveryName?: string;
  deliveryPrice: number;
  createdAt: string;
  /** Boutique d'origine — présente dans GET /orders/me (mes commandes) */
  boutique?: { id: string; name: string; slug: string } | null;
}

export interface ApiCreateOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface ApiCreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  country?: string;
  conversationId?: string;
  pointsToUse?: number;
  paymentMethod:
    | "MOBILE_MONEY"
    | "CASH_ON_DELIVERY"
    | "CARD"
    | "WHATSAPP_DIRECT";
  deliveryName?: string;
  deliveryPrice?: number;
  notes?: string;
  items: ApiCreateOrderItem[];
}

/* ———————————————————————————————— Dashboard ———————————————————————————————— */

export interface ApiKpi {
  title: string;
  value: string;
  rawNumber: number;
  changePercent: number;
  isPositive: boolean;
  comparisonText: string;
  iconName: string;
}

export interface ApiChartPoint {
  date: string;
  currentPeriodFcfa: number;
  previousPeriodFcfa: number;
}

/** Activité hebdomadaire (répartition des commandes par jour) */
export interface ApiActiveDay {
  day: string;
  ordersCount: number;
  isPeakDay: boolean;
}

export interface ApiCustomer {
  id: string;
  name: string;
  phone: string;
  city: string;
  ordersCount: number;
  totalSpentFcfa: number;
  segment: string;
  lastOrderDate: string;
}

export interface ApiOverview {
  kpis: {
    revenue: ApiKpi;
    orders: ApiKpi;
    visitors: ApiKpi;
    conversionRate: ApiKpi;
  };
  revenueChart: ApiChartPoint[];
  repeatCustomerRate: number;
  customerSegments: {
    retailersPercent: number;
    distributorsPercent: number;
    wholesalersPercent: number;
  };
  activeDays: ApiActiveDay[];
  bestSellers: Array<{
    id: string;
    name: string;
    salesCount: number;
    revenueFcfa: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    status: string;
    paymentMethod: string;
    totalPriceFcfa: number;
    cancellationReason?: string;
    createdAt: string;
  }>;
  totalOrders: number;
}

export interface ApiStats {
  kpis: {
    revenue: ApiKpi;
    orders: ApiKpi;
    avgBasket: ApiKpi;
    conversion: ApiKpi;
  };
  revenueChart: ApiChartPoint[];
  repeatCustomerRate: number;
  customerSegments: {
    retailersPercent: number;
    distributorsPercent: number;
    wholesalersPercent: number;
  };
  activeDays: ApiActiveDay[];
}

/* ———————————————————————————————— Messagerie ———————————————————————————————— */

export interface ApiConversation {
  id: string;
  userId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  lastMessageAt: string | null;
  /** Aperçu du dernier message (liste « Mes discussions ») */
  lastMessage?: string | null;
  /** Expéditeur du dernier message : "client" | "vendeur" */
  lastMessageFrom?: "client" | "vendeur" | null;
  boutique: { id: string; name: string; slug: string; logoImage?: string | null };
  user?: { id: string; name: string | null; avatarUrl?: string | null } | null;
  _count?: { messages: number };
  /** Messages non lus de l'AUTRE partie (badge) — calculé par le backend */
  unreadCount?: number;
  /** Contexte commercial (optionnel) — la messagerie comprend le commerce */
  productId?: string | null;
  productName?: string | null;
  productPrice?: string | null;
  agreedPrice?: number | null;
  /** Snapshots de la carte produit affichée dans la discussion */
  productDescription?: string | null;
  productImage?: string | null;
  orderId?: string | null;
  orderReference?: string | null;
}

export interface ApiMessage {
  id: string;
  senderRole: "CLIENT" | "VENDEUR" | "ADMIN";
  sender: { id: string; name: string | null; avatarUrl?: string | null };
  content: string;
  readAt: string | null;
  createdAt: string;
}
