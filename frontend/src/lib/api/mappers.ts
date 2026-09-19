/**
 * Couche API — mappers
 * --------------------------------------------------------------------------
 * SEULE conversion entre les contrats backend (`types.ts`) et les types
 * d'affichage du frontend (`types/dashboard.ts`, `constants/store.ts`,
 * `lib/shopConfig.ts`, `lib/customerStore.ts`). Aucune logique réseau ici.
 *
 * Règle : les composants ne voient JAMAIS les types API bruts ; ils
 * consomment les types métier du frontend.
 */

import type { Product, Review } from "@/constants/store";
import type { ShopConfig, SocialLinks } from "@/lib/shopConfig";
import type {
  CategoryOption,
  Customer,
  DashboardOverviewData,
  Order,
  OrderStatus,
  PaymentMethod,
  ProductItem,
  StatsData,
} from "@/types/dashboard";
import type { ApiCategory } from "./types";
import type { UpdateShopInput } from "./shops";
import type {
  ApiCreateOrderInput,
  ApiCustomer,
  ApiOrder,
  ApiOverview,
  ApiProduct,
  ApiPublicProduct,
  ApiShop,
  ApiStats,
} from "./types";
import type { ApiOrderStatus } from "./orders";

/* ———————————————————————————————— Utilitaires ———————————————————————————————— */

/** Initiales d'un nom (avatar) — "Awa Diallo" → "AD" */
export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "B"
  );
}

/** Date ISO → étiquette courte fr-FR ("2026-08-05" → "5 août") */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const STATUS_UPPER: Record<OrderStatus, ApiOrderStatus> = {
  pending: "PENDING",
  paid: "PAID",
  shipping: "SHIPPING",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

export function toApiOrderStatus(status: OrderStatus): ApiOrderStatus {
  return STATUS_UPPER[status];
}

const PAYMENT_UPPER: Record<PaymentMethod, string> = {
  MOBILE_MONEY: "MOBILE_MONEY",
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
  CARD: "CARD",
  WHATSAPP_DIRECT: "WHATSAPP_DIRECT",
};

export function toApiPaymentMethod(
  method: PaymentMethod,
): ApiCreateOrderInput["paymentMethod"] {
  return PAYMENT_UPPER[method] as ApiCreateOrderInput["paymentMethod"];
}

/* ———————————————————————————————— Catalogue public (vitrine) ———————————————————————————————— */

/**
 * Images présentes localement dans `public/assets/boutique/` — seules ces
 * images du backend sont affichables sans passer par l'optimiseur Next.
 */
const EXISTING_BOUTIQUE_ASSETS = new Set([
  "ecouteurs.jpg",
  "gadget-importe.jpg",
  "galaxy-s23-ultra.jpg",
  "montre-connectee.jpg",
  "powerbank.jpg",
  "smartphone-pro.jpg",
]);

/** Repli d'image sûr par catégorie (les assets locaux existent toujours) */
const IMAGE_FALLBACK_BY_CATEGORY: Record<string, string> = {
  Téléphone: "/assets/boutique/smartphone-pro.jpg",
  Audio: "/assets/boutique/ecouteurs.jpg",
  Accessoires: "/assets/boutique/powerbank.jpg",
  Autre: "/assets/boutique/gadget-importe.jpg",
};

/** Image du backend utilisée telle quelle SI elle existe localement, sinon repli */
function resolveImage(
  images: string[] | undefined,
  category: string,
): string {
  const candidate = images?.[0];
  const base = candidate?.split("/").pop() ?? "";
  if (candidate && EXISTING_BOUTIQUE_ASSETS.has(base)) return candidate;
  return IMAGE_FALLBACK_BY_CATEGORY[category] ?? "/assets/boutique/ecouteurs.jpg";
}

const KNOWN_CATEGORIES = ["Téléphone", "Audio", "Accessoires", "Autre"] as const;

/**
 * Image sûre d'un produit du catalogue GLOBAL (accueil client) — même règle
 * que la vitrine : image backend utilisée telle quelle si elle existe
 * localement, sinon repli par catégorie.
 */
export function publicProductImage(api: ApiPublicProduct): string {
  return resolveImage(api.images, api.category?.name ?? "");
}

/** Produit backend → `Product` de la vitrine (constants/store.ts) */
export function toPublicProduct(api: ApiPublicProduct): Product {
  const category = api.category?.name ?? "";
  return {
    id: api.id,
    name: api.name,
    category: (KNOWN_CATEGORIES as readonly string[]).includes(category)
      ? (category as Product["category"])
      : "Autre",
    price: Number(api.price),
    description: api.description ?? "",
    image: resolveImage(api.images, category),
    available: api.stock > 0,
    stock: api.stock,
    sku: api.sku ?? api.slug,
    variants: (api.variants ?? []).map((v) => ({
      id: v.id,
      label: v.value || v.name,
    })),
    reviews: toPublicReviews(api),
    // Marque du produit (ex. Samsung, Vlisco…) — filtres de la vitrine
    brand: api.brand?.name ?? undefined,
    // Boutique d'origine (catalogue global) — la vitrine mono-boutique l'ignore
    boutique: api.boutique
      ? { name: api.boutique.name, slug: api.boutique.slug }
      : undefined,
  };
}

/** Avis du catalogue public : seules les notes sont exposées en liste */
function toPublicReviews(api: ApiPublicProduct): Review[] {
  return (api.reviews ?? []).map((r, i) => ({
    id: `${api.id}-review-${i}`,
    author: "Avis client",
    rating: r.rating,
    comment: "",
    date: "",
  }));
}

/* ———————————————————————————————— Config boutique ———————————————————————————————— */

const EMPTY_SOCIAL: SocialLinks = {
  instagram: "",
  facebook: "",
  twitter: "",
  linkedin: "",
  tiktok: "",
};

/** Boutique (publique ou propriétaire) → `ShopConfig` du frontend */
export function toShopConfig(shop: ApiShop): ShopConfig {
  return {
    name: shop.name,
    // Badge de confiance : affiché quand la plateforme a validé la vérification
    isVerified: shop.verificationStatus === "VERIFIED",
    tagline: shop.tagline ?? "",
    description: shop.description ?? "",
    city: shop.city ?? "",
    country: shop.country ?? "",
    email: shop.email ?? "",
    whatsappNumber: shop.whatsappNumber ?? "",
    social: shop.socialLinks ?? EMPTY_SOCIAL,
    coverImage: shop.coverImage ?? "/assets/portraits/vitrine.jpg",
    logoImage: shop.logoImage ?? "",
    deliveryShortLabel: shop.deliveryShortLabel ?? "",
    deliveryNote: shop.deliveryNote ?? "",
    warrantyNote: shop.warrantyNote ?? "",
    paymentNote: shop.paymentNote ?? "",
    deliveryPacks: (shop.deliveryPacks ?? []).map((p) => ({
      ...p,
      price: Number(p.price) || 0,
      description: p.description ?? "",
    })),
    promotions: (shop.promotions ?? []).map((p) => ({
      productId: p.productId,
      discountPercent: Number(p.discountPercent) || 0,
    })),
    notifications: (shop.notifications ?? []).map((n) => ({
      id: n.id,
      label: n.label ?? n.id,
      description: n.description ?? "",
      // Absent → activé : même règle que le backend (isTypeEnabled)
      enabled: n.enabled ?? true,
    })),
  };
}

/** Patch `ShopConfig` (formulaire « Ma boutique ») → DTO backend */
export function toShopConfigPatch(
  partial: Partial<ShopConfig>,
): UpdateShopInput {
  return {
    ...(partial.name !== undefined ? { name: partial.name } : {}),
    ...(partial.tagline !== undefined ? { tagline: partial.tagline } : {}),
    ...(partial.description !== undefined
      ? { description: partial.description }
      : {}),
    ...(partial.city !== undefined ? { city: partial.city } : {}),
    ...(partial.country !== undefined ? { country: partial.country } : {}),
    ...(partial.email !== undefined ? { email: partial.email } : {}),
    ...(partial.whatsappNumber !== undefined
      ? { whatsappNumber: partial.whatsappNumber }
      : {}),
    ...(partial.coverImage !== undefined
      ? { coverImage: partial.coverImage }
      : {}),
    ...(partial.logoImage !== undefined ? { logoImage: partial.logoImage } : {}),
    ...(partial.deliveryShortLabel !== undefined
      ? { deliveryShortLabel: partial.deliveryShortLabel }
      : {}),
    ...(partial.deliveryNote !== undefined
      ? { deliveryNote: partial.deliveryNote }
      : {}),
    ...(partial.warrantyNote !== undefined
      ? { warrantyNote: partial.warrantyNote }
      : {}),
    ...(partial.paymentNote !== undefined
      ? { paymentNote: partial.paymentNote }
      : {}),
    ...(partial.social !== undefined ? { socialLinks: partial.social } : {}),
    ...(partial.deliveryPacks !== undefined
      ? { deliveryPacks: partial.deliveryPacks }
      : {}),
    ...(partial.promotions !== undefined
      ? { promotions: partial.promotions }
      : {}),
    ...(partial.notifications !== undefined
      ? { notifications: partial.notifications }
      : {}),
  };
}

/* ———————————————————————————————— Catégories ———————————————————————————————— */

/** Catégorie backend → option de sélecteur du dashboard */
export function toCategory(api: ApiCategory): CategoryOption {
  return { id: api.id, name: api.name };
}

/* ———————————————————————————————— Dashboard vendeur ———————————————————————————————— */

/** Produit admin backend → `ProductItem` du dashboard */
export function toDashboardProduct(api: ApiProduct): ProductItem {
  const price = Number(api.price);
  const sales = api._count?.orderItems ?? 0;
  return {
    id: api.id,
    slug: api.slug,
    name: api.name,
    category: api.category?.name ?? "",
    brand: api.brand?.name ?? "",
    priceFcfa: price,
    salesCount: sales,
    revenueFcfa: sales * price,
    rating: 0,
    stock: api.stock,
    image: api.images?.[0] ?? "",
    status:
      api.stock <= 0 ? "out_of_stock" : api.stock <= 5 ? "low_stock" : "in_stock",
  };
}

/** Commande backend (déjà au format frontend) → `Order` typé */
export function toOrder(api: ApiOrder): Order {
  return {
    id: api.id,
    orderNumber: api.orderNumber,
    customerName: api.customerName,
    customerPhone: api.customerPhone,
    city: api.city,
    country: api.country,
    productName: api.productName,
    quantity: api.quantity,
    totalPriceFcfa: api.totalPriceFcfa,
    status: api.status as OrderStatus,
    paymentMethod: api.paymentMethod as PaymentMethod,
    cancellationReason: api.cancellationReason,
    createdAt: api.createdAt,
  };
}

/** Client backend → `Customer` du dashboard */
export function toCustomer(api: ApiCustomer): Customer {
  return {
    id: api.id,
    name: api.name,
    phone: api.phone,
    city: api.city,
    ordersCount: api.ordersCount,
    totalSpentFcfa: api.totalSpentFcfa,
    segment: api.segment as Customer["segment"],
    lastOrderDate: api.lastOrderDate,
  };
}

/**
 * Vue d'ensemble : enrichit la réponse backend avec les produits (best
 * sellers complets) et les commandes (récentes complètes) du même appel.
 */
export function toOverview(
  api: ApiOverview,
  products: ProductItem[],
  orders: Order[],
): DashboardOverviewData {
  const productById = new Map(products.map((p) => [p.id, p]));
  const orderById = new Map(orders.map((o) => [o.id, o]));

  return {
    kpis: api.kpis as DashboardOverviewData["kpis"],
    // Gardes défensives : un champ absent ou mal formé du backend ne doit
    // JAMAIS faire crasher le dashboard (régression revenueChart → Promise).
    revenueChart: (api.revenueChart ?? []).map((p) => ({
      date: shortDate(p.date),
      currentPeriodFcfa: p.currentPeriodFcfa,
      previousPeriodFcfa: p.previousPeriodFcfa,
    })),
    repeatCustomerRate: api.repeatCustomerRate,
    customerSegments: api.customerSegments,
    activeDays: (api.activeDays ?? []).map((d) => ({
      day: d.day as DashboardOverviewData["activeDays"][number]["day"],
      ordersCount: d.ordersCount,
      isPeakDay: d.isPeakDay,
    })),
    bestSellers: (api.bestSellers ?? []).map((b) => {
      const full = productById.get(b.id);
      return (
        full ?? {
          id: b.id,
          name: b.name,
          category: "",
          brand: "",
          priceFcfa: 0,
          salesCount: b.salesCount,
          revenueFcfa: b.revenueFcfa,
          rating: 0,
          stock: 0,
          image: "",
          status: "out_of_stock" as const,
        }
      );
    }),
    recentOrders: (api.recentOrders ?? []).map((r) => {
      const full = orderById.get(r.id);
      return (
        full ?? {
          id: r.id,
          orderNumber: r.orderNumber,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          city: "",
          country: "",
          productName: "",
          quantity: 0,
          totalPriceFcfa: r.totalPriceFcfa,
          status: r.status as OrderStatus,
          paymentMethod: r.paymentMethod as PaymentMethod,
          cancellationReason: r.cancellationReason,
          createdAt: r.createdAt,
        }
      );
    }),
    monthlyGoalFcfa: (api as any).monthlyGoalFcfa ?? 500000,
  };
}

/** Statistiques par période */
export function toStats(api: any, products: ProductItem[]): StatsData {
  return {
    kpis: api.kpis,
    revenueChart: (api.chart ?? api.revenueChart ?? []).map((p: any) => ({
      date: shortDate(p.date),
      currentPeriodFcfa: p.currentPeriodFcfa,
      previousPeriodFcfa: p.previousPeriodFcfa,
    })),
    repeatCustomerRate: api.repeatCustomerRatio ?? api.repeatCustomerRate ?? 0,
    customerSegments: api.segments ?? api.customerSegments ?? { retailersPercent: 0, distributorsPercent: 0, wholesalersPercent: 0 },
    activeDays: (api.activeDays ?? []).map((d: any) => ({
      day: d.day,
      ordersCount: d.ordersCount,
      isPeakDay: d.isPeakDay,
    })),
    bestSellers: (products ?? []).slice(0, 5),
    requiresBusiness: api.requiresBusiness,
  };
}

/* ———————————————————————————————— Commande client ———————————————————————————————— */

/** Statuts affichés côté client (statuts backend en minuscules) */
const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  // PENDING = commandée, en attente de validation du paiement
  pending: "En attente de paiement",
  paid: "Payée",
  shipping: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/** Libellés des moyens de paiement (minuscules côté API) */
const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  MOBILE_MONEY: "Mobile Money",
  CASH_ON_DELIVERY: "Paiement à la livraison",
  CARD: "Carte bancaire",
  WHATSAPP_DIRECT: "WhatsApp",
};

/** Libellé français d'un moyen de paiement (checkout + confirmation) */
export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_LABEL[method] ?? method;
}

/** Libellé français d'un statut de commande (PENDING = en attente vendeur) */
export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

/**
 * Commande backend → vue « Mon compte » client : statut et paiement en
 * français, items + livraison prêts à afficher.
 */
export function toCustomerOrder(
  api: ApiOrder,
): import("@/lib/customerStore").CustomerOrderView {
  const status = api.status as OrderStatus;
  const paymentMethod = api.paymentMethod as PaymentMethod;
  return {
    id: api.id,
    ref: api.orderNumber,
    createdAt: api.createdAt,
    dateLabel: shortDate(api.createdAt),
    status,
    statusLabel: orderStatusLabel(status),
    paymentLabel: PAYMENT_LABEL[paymentMethod] ?? api.paymentMethod,
    cancellationReason: api.cancellationReason,
    items: api.items.map((i) => ({
      name: i.productName,
      variantLabel: i.variantLabel,
      qty: i.quantity,
      unitPrice: i.unitPrice,
    })),
    deliveryName: api.deliveryName ?? "",
    deliveryPrice: api.deliveryPrice,
    total: api.totalPriceFcfa,
  };
}

/** Commande backend → `OrderRecord` de l'historique client (lib/customerStore) */
export function toOrderRecord(api: ApiOrder): import("@/lib/customerStore").OrderRecord {
  const status = api.status as OrderStatus;
  const paymentMethod = api.paymentMethod as PaymentMethod;
  return {
    id: api.id,
    ref: api.orderNumber,
    createdAt: shortDate(api.createdAt),
    items: api.items.map((i) => ({
      name: i.productName,
      variantLabel: i.variantLabel,
      qty: i.quantity,
      unitPrice: i.unitPrice,
    })),
    deliveryName: api.deliveryName ?? "",
    deliveryPrice: api.deliveryPrice,
    total: api.totalPriceFcfa,
    // Statut et paiement RÉELS du backend — affichés sur la confirmation
    status,
    statusLabel: orderStatusLabel(status),
    paymentLabel: paymentMethodLabel(paymentMethod),
    paymentRef: api.paymentRef,
  };
}
