/**
 * Seller Dashboard Types — Afrique Commerce OS
 * Architecture de données SaaS pour la gestion de commerce africain
 */

export type OrderStatus = "pending" | "paid" | "shipping" | "delivered" | "cancelled";
export type PaymentMethod = "mobile_money" | "cash_on_delivery" | "card" | "whatsapp_direct";

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  country: string;
  productName: string;
  productImage?: string;
  quantity: number;
  totalPriceFcfa: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  /** Motif d'annulation saisi par le client (présent si annulée avec motif) */
  cancellationReason?: string;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  /** Marque du produit (ex. Samsung) — vide si non définie */
  brand: string;
  priceFcfa: number;
  salesCount: number;
  revenueFcfa: number;
  rating: number;
  stock: number;
  image: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

/** Variante saisie dans le formulaire d'ajout de produit (brouillon) */
export interface NewVariantDraft {
  /** Type de variante — ex. « Couleur » */
  name: string;
  /** Valeur — ex. « Noir » */
  value: string;
  /** Surcharge de prix éventuelle (FCFA) */
  priceDelta?: number;
  /** Stock propre à cette variante */
  stock?: number;
}

/** Saisie complète du formulaire d'ajout de produit (miroir de CreateProductDto) */
export interface NewProductDraft {
  name: string;
  description?: string;
  price: number;
  /** Prix barré — sert de prix de référence pour la promotion */
  oldPrice?: number;
  stock?: number;
  sku?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  categoryId?: string;
  /** Marque du produit (id de la marque) */
  brandId?: string;
  images?: string[];
  variants?: NewVariantDraft[];
}

/** Option de catégorie pour les sélecteurs du dashboard */
export interface CategoryOption {
  id: string;
  name: string;
}

/** Option de marque pour les sélecteurs du dashboard */
export interface BrandOption {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  city: string;
  ordersCount: number;
  totalSpentFcfa: number;
  segment: "Fidèle" | "Régulier" | "Nouveau" | "VIP";
  lastOrderDate: string;
}

/** Profil du commerçant connecté (header, paramètres) */
export interface MerchantProfile {
  name: string;
  shopName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  avatarInitials: string;
  plan: string;
}

import type { ShopConfig, NotificationSetting as NS } from "@/lib/shopConfig";

// Paramètres de la boutique — désormais la config partagée unique
// (identité, visuels, contacts, livraison, promotions) définie dans
// `lib/shopConfig.ts` et pilotée par l'admin « Ma boutique ».
export type ShopSettings = ShopConfig;
export type NotificationSetting = NS;

/** Données de la page Statistiques — paramétrable par période */
export interface StatsData {
  kpis: {
    revenue: KPIStat;
    orders: KPIStat;
    avgBasket: KPIStat;
    conversion: KPIStat;
  };
  revenueChart: RevenueDataPoint[];
  activeDays: DayActivityPoint[];
  repeatCustomerRate: number;
  customerSegments: CustomerSegmentBreakdown;
  bestSellers: ProductItem[];
}

export interface KPIStat {
  title: string;
  value: string;
  rawNumber: number;
  changePercent: number;
  isPositive: boolean;
  comparisonText: string;
  iconName: "revenue" | "orders" | "visitors" | "conversion" | "basket";
}

export interface RevenueDataPoint {
  date: string;
  currentPeriodFcfa: number;
  previousPeriodFcfa: number;
}

export interface CustomerSegmentBreakdown {
  retailersPercent: number;
  distributorsPercent: number;
  wholesalersPercent: number;
}

export interface DayActivityPoint {
  day: "Lun" | "Mar" | "Mer" | "Jeu" | "Ven" | "Sam" | "Dim";
  ordersCount: number;
  isPeakDay?: boolean;
}

export interface DashboardOverviewData {
  kpis: {
    revenue: KPIStat;
    orders: KPIStat;
    visitors: KPIStat;
    conversionRate: KPIStat;
  };
  revenueChart: RevenueDataPoint[];
  repeatCustomerRate: number;
  customerSegments: CustomerSegmentBreakdown;
  activeDays: DayActivityPoint[];
  bestSellers: ProductItem[];
  recentOrders: Order[];
  /** Objectif de chiffre d'affaires du mois (affiché dans l'en-tête vivant) */
  monthlyGoalFcfa: number;
}
