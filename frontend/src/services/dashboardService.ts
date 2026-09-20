/**
 * Service Layer — Dashboard Vendeur (BRANCHÉ SUR L'API)
 * --------------------------------------------------------------------------
 * Chaque méthode délègue à la couche `lib/api/` et convertit les contrats
 * backend vers les types d'affichage du frontend (`types/dashboard.ts`)
 * via `lib/api/mappers.ts`. Les composants ne changent pas : la surface
 * d'export (dashboardService + merchantProfile) reste identique.
 *
 * Le `boutiqueId` vient de la session (utilisateur connecté) : si aucun
 * vendeur n'est connecté, les méthodes lèvent une erreur claire.
 */

import {
  ApiError,
  authApi,
  brandsApi,
  categoriesApi,
  dashboardApi,
  ordersApi,
  productsApi,
  shopsApi,
} from "@/lib/api";
import {
  initialsOf,
  toApiOrderStatus,
  toApiPaymentMethod,
  toCategory,
  toCustomer,
  toDashboardProduct,
  toOrder,
  toOverview,
  toShopConfig,
  toShopConfigPatch,
  toStats,
} from "@/lib/api/mappers";
import { getBoutiqueId, getSessionUser } from "@/lib/api/session";
import { getShopConfig, updateShopConfig } from "@/lib/shopConfig";
import type {
  BrandOption,
  CategoryOption,
  Customer,
  DashboardOverviewData,
  MerchantProfile,
  NewProductDraft,
  Order,
  OrderStatus,
  PaymentMethod,
  ProductItem,
  ShopSettings,
  StatsData,
} from "@/types/dashboard";

/**
 * Mapping slug de plan (boutique.plan, source backend) → libellé lisible.
 * Partagé entre la sidebar et la page Formule (pas de nom codé en dur).
 */
export const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

/** Slug de plan → ligne de prix facturé (aligné sur les plans seedés du backend) */
export const PLAN_PRICE_LINE: Record<string, string> = {
  starter: "Gratuit",
  business: "12 500 FCFA / mois",
};

/** Id de la boutique du vendeur connecté (sinon erreur explicite) */
function requireBoutique(): string {
  const id = getBoutiqueId();
  if (!id) {
    throw new ApiError(
      401,
      "Aucune boutique associée à ce compte. Connectez-vous en tant que vendeur.",
    );
  }
  return id;
}

/**
 * Profil du commerçant (header, paramètres). Initialisé depuis la session
 * locale (lecture synchrone) puis rafraîchi par l'API via `refreshProfile`.
 */
export const merchantProfile: MerchantProfile = (() => {
  const user = getSessionUser();
  const config = getShopConfig();
  const name = user?.name ?? "Vendeur";
  return {
    name,
    shopName: config.name,
    email: user?.email ?? "",
    phone: "",
    city: config.city,
    country: config.country,
    avatarInitials: initialsOf(name),
    plan: "starter",
  };
})();

/** Recharge le profil depuis GET /users/me et synchronise le cache local */
export async function refreshProfile(): Promise<MerchantProfile> {
  try {
    const profile = await authApi.me();
    Object.assign(merchantProfile, profile);
    return profile;
  } catch (err) {
    console.warn("[dashboardService] profil indisponible :", err);
    return merchantProfile;
  }
}

export const dashboardService = {
  /** Vue d'ensemble (KPIs + best sellers + commandes récentes) */
  async getOverview(): Promise<DashboardOverviewData> {
    const boutiqueId = requireBoutique();
    const [overview, productList, orderList] = await Promise.all([
      dashboardApi.overview(boutiqueId),
      productsApi.list(boutiqueId),
      ordersApi.seller(boutiqueId),
    ]);
    return toOverview(
      overview,
      productList.map(toDashboardProduct),
      orderList.map(toOrder),
    );
  },

  /** Commandes de la boutique (ou de toutes les boutiques si boutiqueId === 'all') */
  async getOrders(targetBoutiqueId?: string): Promise<Order[]> {
    if (targetBoutiqueId === "all") {
      return (await ordersApi.allOwner()).map(toOrder);
    }
    const boutiqueId = targetBoutiqueId || requireBoutique();
    return (await ordersApi.seller(boutiqueId)).map(toOrder);
  },

  /** Catalogue produits (admin ou toutes boutiques) */
  async getProducts(targetBoutiqueId?: string): Promise<ProductItem[]> {
    if (targetBoutiqueId === "all") {
      return (await productsApi.allOwner()).map(toDashboardProduct);
    }
    const boutiqueId = targetBoutiqueId || requireBoutique();
    return (await productsApi.list(boutiqueId)).map(toDashboardProduct);
  },

  /** Clients dérivés des commandes */
  async getCustomers(): Promise<Customer[]> {
    const boutiqueId = requireBoutique();
    return (await dashboardApi.customers(boutiqueId)).map(toCustomer);
  },

  /** Statistiques paramétrables par période */
  async getStats(
    period: "7_days" | "30_days" | "this_year" = "30_days",
  ): Promise<StatsData> {
    const boutiqueId = requireBoutique();
    const [stats, productList] = await Promise.all([
      dashboardApi.stats(boutiqueId, period),
      productsApi.list(boutiqueId),
    ]);
    return toStats(stats, productList.map(toDashboardProduct));
  },

  /** Profil complet du vendeur connecté */
  async getProfile(): Promise<MerchantProfile> {
    return refreshProfile();
  },

  /** Paramètres boutique (source de vérité : le backend) */
  async getSettings(): Promise<ShopSettings> {
    const boutiqueId = requireBoutique();
    const shop = await shopsApi.owner(boutiqueId);
    const config = toShopConfig(shop);
    // Synchronise le cache local pour que la vitrine reflète le serveur
    updateShopConfig(config);
    return config;
  },

  /** Sauvegarde des paramètres boutique */
  async updateSettings(partial: Partial<ShopSettings>): Promise<ShopSettings> {
    const boutiqueId = requireBoutique();
    const shop = await shopsApi.update(boutiqueId, toShopConfigPatch(partial));
    const config = toShopConfig(shop);
    updateShopConfig(config);
    return config;
  },

  /** Changement de statut d'une commande */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    deliveryContact?: string,
  ): Promise<boolean> {
    const boutiqueId = requireBoutique();
    await ordersApi.updateStatus(
      boutiqueId,
      orderId,
      toApiOrderStatus(status),
      deliveryContact,
    );
    return true;
  },

  /** Rappel de paiement */
  async remindPayment(orderId: string): Promise<boolean> {
    const boutiqueId = requireBoutique();
    await ordersApi.remindPayment(boutiqueId, orderId);
    return true;
  },

  /**
   * Ajout d'un produit au catalogue — formulaire complet : description,
   * prix promo (oldPrice), catégorie, SKU, visibilité, images et variantes.
   */
  async addProduct(draft: NewProductDraft & { boutiqueId?: string }): Promise<ProductItem> {
    const boutiqueId = draft.boutiqueId || requireBoutique();
    const created = await productsApi.create(boutiqueId, {
      name: draft.name,
      description: draft.description || undefined,
      price: draft.price,
      oldPrice: draft.oldPrice && draft.oldPrice > 0 ? draft.oldPrice : undefined,
      stock: draft.stock,
      sku: draft.sku || undefined,
      isFeatured: draft.isFeatured,
      isActive: draft.isActive ?? true,
      categoryId: draft.categoryId || undefined,
      brandId: draft.brandId || undefined,
      images: draft.images?.length ? draft.images : undefined,
      variants: draft.variants?.length ? draft.variants : undefined,
    });
    return toDashboardProduct(created);
  },

  /** Mise à jour d'un produit (stock, prix, visibilité isActive, etc.) */
  async updateProduct(
    id: string,
    input: Partial<ProductItem> & { isActive?: boolean; stock?: number; boutiqueId?: string }
  ): Promise<ProductItem> {
    const boutiqueId = input.boutiqueId || requireBoutique();
    const updated = await productsApi.update(boutiqueId, id, {
      name: input.name,
      price: input.priceFcfa,
      stock: input.stock,
      isActive: input.isActive,
    });
    return toDashboardProduct(updated);
  },

  /** Suppression d'un produit du catalogue */
  async deleteProduct(id: string, targetBoutiqueId?: string): Promise<boolean> {
    const boutiqueId = targetBoutiqueId || requireBoutique();
    await productsApi.remove(boutiqueId, id);
    return true;
  },

  /** Marques de la boutique (sélecteurs du formulaire produit) */
  async getBrands(): Promise<BrandOption[]> {
    const boutiqueId = requireBoutique();
    return (await brandsApi.list(boutiqueId)).map((b) => ({
      id: b.id,
      name: b.name,
    }));
  },

  /** Crée une marque à la volée depuis le formulaire produit */
  async createBrand(name: string): Promise<BrandOption> {
    const boutiqueId = requireBoutique();
    const brand = await brandsApi.create(boutiqueId, name);
    return { id: brand.id, name: brand.name };
  },

  /** Catégories de la boutique (sélecteurs du formulaire produit) */
  async getCategories(): Promise<CategoryOption[]> {
    const boutiqueId = requireBoutique();
    return (await categoriesApi.list(boutiqueId)).map(toCategory);
  },

  /** Crée une catégorie à la volée depuis le formulaire produit */
  async createCategory(name: string): Promise<CategoryOption> {
    const boutiqueId = requireBoutique();
    return toCategory(await categoriesApi.create(boutiqueId, name));
  },

  /**
   * Création d'une commande manuelle (vendeur, reçue par téléphone).
   * Le produit est résolu par nom dans le catalogue ; si introuvable (ou
   * backend injoignable), repli local pour ne pas bloquer la saisie.
   */
  async createOrder(input: {
    customerName: string;
    customerPhone: string;
    city: string;
    country: string;
    productName: string;
    quantity: number;
    totalPriceFcfa: number;
    paymentMethod: PaymentMethod;
  }): Promise<Order> {
    const boutiqueId = requireBoutique();
    try {
      const catalog = await productsApi.list(boutiqueId);
      const match = catalog.find(
        (p) =>
          p.name.trim().toLowerCase() === input.productName.trim().toLowerCase(),
      );
      if (match) {
        const api = await ordersApi.create(boutiqueId, {
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          city: input.city,
          country: input.country,
          paymentMethod: toApiPaymentMethod(input.paymentMethod),
          items: [{ productId: match.id, quantity: input.quantity }],
        });
        return toOrder(api);
      }
    } catch (err) {
      // Erreur métier (ex. stock insuffisant) → on la PROPAGE au vendeur
      if (err instanceof ApiError) throw err;
      // Erreur réseau uniquement → repli local
      console.warn("[dashboardService] réseau indisponible, repli local :", err);
    }
    // Repli local : produit hors catalogue → la commande reste visible
    return {
      id: `local-${Date.now()}`,
      orderNumber: `#AC-${String(Date.now()).slice(-4)}`,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      city: input.city,
      country: input.country,
      productName: input.productName,
      quantity: input.quantity,
      totalPriceFcfa: input.totalPriceFcfa,
      status: "pending",
      paymentMethod: input.paymentMethod,
      createdAt: new Date().toLocaleString("fr-FR"),
    };
  },
};
