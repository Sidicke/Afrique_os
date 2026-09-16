/**
 * Super Admin Types — ZennShop
 * --------------------------------------------------------------------------
 * Types d'affichage du dashboard Administrateur Général (l'utilisateur
 * suprême, distinct de l'espace vendeur). Leur structure reflète le contrat
 * défini dans `Ecommerce/administration/ADMIN_BACKEND_CONTRACT.md` : chaque
 * widget a un modèle de données identifiable pour permettre le branchement
 * du backend sans refonte de l'interface.
 */

/* ———————————————————————————————— États globaux ———————————————————————————————— */

/** Statut d'une boutique (Store Governance) — aligné sur les enums backend */
export type AdminStoreStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "BLOCKED";

/** Statut de vérification d'un vendeur (Verification Center) */
export type AdminVerificationStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUIRED"
  | "REJECTED";

/** Statut d'un abonnement (Subscriptions & Revenue) */
export type AdminSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "SUSPENDED";

/** Rôle d'un utilisateur de la plateforme (Users Management) */
export type AdminUserRole = "CLIENT" | "VENDEUR" | "ADMIN";

/** Niveau de priorité d'une alerte (doc 03 — §10) */
export type AdminPriorityLevel = "critical" | "high" | "medium" | "info";

/* ———————————————————————————————— KPI ———————————————————————————————— */

/** Indicateur clé de la homepage admin — structure type (doc 03 — §6/§7) */
export interface AdminKpi {
  /** Identifiant stable (sert de clé de rendu) */
  id: string;
  label: string;
  value: string;
  /** Variation vs période précédente (ex. +12.4) */
  changePercent?: number;
  isPositive?: boolean;
  comparisonText?: string;
  /** Lien d'action contextuel (ex. « Examiner » pour les vérifications) */
  action?: { label: string; href: string };
  tone: "gold" | "blue" | "green" | "terracotta" | "ivory";
  icon: "store" | "users" | "orders" | "wallet" | "chart" | "shield" | "checkCircle" | "alert";
}

/* ———————————————————————————————— Priority actions ———————————————————————————————— */

/** Action nécessitant l'intervention de l'administrateur (doc 03 — §9/§10) */
export interface AdminPriorityAction {
  id: string;
  level: AdminPriorityLevel;
  title: string;
  description: string;
  /** Nombre d'éléments concernés (ex. « 12 vendeurs en attente ») */
  count: number;
  href: string;
  /** Icône d'accompagnement (complète la couleur pour l'accessibilité) */
  icon: "shield" | "alert" | "store" | "users" | "orders" | "clock" | "wallet";
}

/* ———————————————————————————————— Performance ———————————————————————————————— */

/** Métrique sélectionnable du graphique principal (doc 03 — §11) */
export type AdminPerformanceMetric = "orders" | "gmv" | "revenue" | "users" | "stores";

/** Point temporel d'une série de performance */
export interface AdminPerformancePoint {
  date: string;
  value: number;
}

/* ———————————————————————————————— Activité récente ———————————————————————————————— */

/** Événement du flux d'activité (doc 03 — §14) */
export interface AdminActivityEvent {
  id: string;
  /** Type machine — détermine l'icône (new_store, store_verified, order…) */
  type:
    | "new_store"
    | "store_verified"
    | "store_suspended"
    | "new_order"
    | "subscription_upgraded"
    | "report_submitted"
    | "new_user"
    | "new_merchant";
  actor: string;
  description: string;
  /** ISO — affiché en relatif (« il y a 5 min ») */
  timestamp: string;
  resourceHref?: string;
}

/* ———————————————————————————————— Snapshots ———————————————————————————————— */

/** Synthèse boutiques (doc 03 — §16) — chaque valeur ouvre la liste filtrée */
export interface AdminStoresSnapshot {
  active: number;
  pending: number;
  suspended: number;
  blocked: number;
  /** Évolution des nouvelles boutiques sur la période */
  newStores: number;
  newStoresChangePercent?: number;
}

/** Synthèse utilisateurs (doc 03 — §17) */
export interface AdminUsersSnapshot {
  total: number;
  clients: number;
  merchants: number;
  newUsers: number;
  newUsersChangePercent?: number;
}

/** Synthèse commandes (doc 03 — §18) */
export interface AdminOrdersSnapshot {
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
}

/** Synthèse abonnements (doc 03 — §19) */
export interface AdminSubscriptionsSnapshot {
  free: number;
  trial: number;
  pro: number;
  business: number;
  /** Monthly Recurring Revenue (FCFA) */
  mrrFcfa: number;
}

/* ———————————————————————————————— Système ———————————————————————————————— */

/** État d'un composant d'infrastructure (doc 03 — §21) */
export type AdminSystemStatus = "operational" | "degraded" | "down" | "maintenance";

export interface AdminSystemComponent {
  id: string;
  label: string;
  status: AdminSystemStatus;
  /** Détail optionnel (ex. « 99.98 % ») */
  detail?: string;
}

/* ———————————————————————————————— Verification Center ———————————————————————————————— */

/** Priorité de traitement d'un dossier (doc 04 — §8) */
export type AdminVerificationPriority = "low" | "medium" | "high" | "critical";

/** État d'un document fourni (doc 04 — §17) */
export type AdminDocumentState =
  | "present"
  | "missing"
  | "expired"
  | "invalid"
  | "verified";

/** Document de vérification (registre, pièce d'identité…) */
export interface AdminVerificationDocument {
  id: string;
  /** Nom du document (ex. « Registre de commerce ») */
  label: string;
  state: AdminDocumentState;
  /** Aperçu : true si une image/PDF est disponible pour prévisualisation */
  hasPreview: boolean;
  /** URL de l'aperçu (image/PDF), servie par le backend */
  url?: string;
  uploadedAt?: string;
}

/** Élément de la checklist de vérification (doc 04 — §19) */
export interface AdminChecklistItem {
  id: string;
  /** Groupe : identity | business | store */
  group: "identity" | "business" | "store";
  label: string;
  done: boolean;
}

/** Événement d'historique d'un dossier (doc 04 — §21) */
export interface AdminVerificationHistoryEvent {
  id: string;
  action: string;
  at: string;
  by?: string;
}

/** Note interne — JAMAIS visible par le vendeur (doc 04 — §20) */
export interface AdminInternalNote {
  id: string;
  author: string;
  content: string;
  at: string;
}

/** Dossier de vérification complet (doc 04 — §42) */
export interface AdminVerificationCase {
  id: string;
  merchant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    joinedAt: string;
    /** Compte vendeur : ACTIVE | SUSPENDED… */
    accountStatus: string;
  };
  store: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    location: string | null;
    status: AdminStoreStatus;
    createdAt: string;
    productsCount: number;
  };
  status: AdminVerificationStatus;
  priority: AdminVerificationPriority;
  submittedAt: string;
  updatedAt: string;
  assignedTo: string | null;
  documents: AdminVerificationDocument[];
  checklist: AdminChecklistItem[];
  notes: AdminInternalNote[];
  history: AdminVerificationHistoryEvent[];
}

/** Ligne de la liste des dossiers (doc 04 — §11) */
export interface AdminVerificationRow {
  id: string;
  merchantName: string;
  storeName: string;
  submittedAt: string;
  status: AdminVerificationStatus;
  priority: AdminVerificationPriority;
  assignedTo: string | null;
  updatedAt: string;
}

/** Données complètes de la page Verification Center */
export interface AdminVerificationsData {
  kpis: {
    pending: number;
    inReview: number;
    changesRequired: number;
    approved: number;
    rejected: number;
  };
  rows: AdminVerificationRow[];
}

/* ———————————————————————————————— Stores Management ———————————————————————————————— */

/** Ligne de la liste des boutiques (doc 05 — §11) */
export interface AdminStoreRow {
  id: string;
  name: string;
  slug: string;
  merchantName: string;
  status: AdminStoreStatus;
  verificationStatus: AdminVerificationStatus | null;
  plan: string;
  ordersCount: number;
  gmvFcfa: number;
  createdAt: string;
  lastActivityAt: string;
}

/** Événement d'activité d'une boutique (doc 05 — §21) */
export interface AdminStoreActivityEvent {
  id: string;
  label: string;
  at: string;
}

/** Événement d'historique administratif d'une boutique (doc 05 — §31) */
export interface AdminStoreHistoryEvent {
  id: string;
  label: string;
  at: string;
  by?: string;
  reason?: string;
}

/** Note interne — jamais visible par le vendeur (doc 05 — §32) */
export interface AdminStoreNote {
  id: string;
  author: string;
  content: string;
  at: string;
}

/** Données complètes du détail boutique (doc 05 — §15 à §24) */
export interface AdminStoreDetail {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  /** Coordonnées publiques de la boutique */
  email: string | null;
  phone: string | null;
  status: AdminStoreStatus;
  verificationStatus: AdminVerificationStatus | null;
  /** Date de validation + administrateur ayant validé */
  verifiedAt: string | null;
  verifiedBy: string | null;
  plan: string;
  subscriptionStatus: AdminSubscriptionStatus;
  /** Prochaine échéance d'abonnement */
  renewalDate: string | null;
  createdAt: string;
  updatedAt: string;
  merchant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    accountStatus: string;
    joinedAt: string;
  };
  productsCount: number;
  ordersCount: number;
  /** Commandes ce mois-ci */
  ordersThisMonth: number;
  gmvFcfa: number;
  /** État de modération : signalements et avertissements actifs */
  reportsCount: number;
  activeWarnings: number;
  previousSuspensions: number;
  activity: AdminStoreActivityEvent[];
  history: AdminStoreHistoryEvent[];
  notes: AdminStoreNote[];
}

/** Données complètes de la page Stores Management */
export interface AdminStoresData {
  kpis: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    blocked: number;
    newStores: number;
  };
  rows: AdminStoreRow[];
}

/* ———————————————————————————————— Users Management ———————————————————————————————— */

/** Statut d'un compte utilisateur (doc 06 — §6.2) — aligné sur les enums backend */
export type AdminUserStatus =
  | "ACTIVE"
  | "PENDING"
  | "SUSPENDED"
  | "BLOCKED"
  | "DEACTIVATED";

/** Ligne de la liste des utilisateurs (doc 06 — §7) */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  /** Entité associée — nom de boutique pour un vendeur */
  storeName: string | null;
  /** Boutique associée (navigation vers /admin/stores/[id]) */
  storeId: string | null;
  lastActiveAt: string;
  createdAt: string;
}

/** Événement de la timeline d'activité (doc 06 — §13) */
export interface AdminUserActivityEvent {
  id: string;
  label: string;
  at: string;
}

/** Commande associée (doc 06 — §14) */
export interface AdminUserOrderSummary {
  id: string;
  storeName: string;
  amountFcfa: number;
  status: string;
  date: string;
}

/** Événement d'historique administratif (doc 06 — §23 audit log) */
export interface AdminUserHistoryEvent {
  id: string;
  label: string;
  at: string;
  by?: string;
  reason?: string;
}

/** Note interne — jamais visible par l'utilisateur */
export interface AdminUserNote {
  id: string;
  author: string;
  content: string;
  at: string;
}

/** Données complètes du détail utilisateur (doc 06 — §9 à §15) */
export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  lastLoginAt: string | null;
  /** Boutique associée (vendeur uniquement) */
  store:
    | {
        id: string;
        name: string;
        slug: string;
        status: AdminStoreStatus;
        verificationStatus: AdminVerificationStatus | null;
        /** Id du dossier de vérification si existant */
        verificationId: string | null;
        plan: string;
        subscriptionStatus: AdminSubscriptionStatus;
        createdAt: string;
      }
    | null;
  /** Statistiques client (client uniquement) */
  clientStats: {
    ordersCount: number;
    totalSpentFcfa: number;
    conversationsCount: number;
    lastOrderAt: string | null;
  } | null;
  activity: AdminUserActivityEvent[];
  orders: AdminUserOrderSummary[];
  history: AdminUserHistoryEvent[];
  notes: AdminUserNote[];
}

/** Données complètes de la page Users Management */
export interface AdminUsersData {
  kpis: {
    total: number;
    clients: number;
    sellers: number;
    admins: number;
    suspended: number;
    newUsers: number;
    /** Variation des nouveaux utilisateurs vs mois précédent */
    newUsersChangePercent: number;
  };
  rows: AdminUserRow[];
}

/* ———————————————————————————————— Orders Platform Overview ———————————————————————————————— */

/**
 * Statut de commande PLATEFORME — aligné sur les enums réels du backend
 * (src/lib/api/orders.ts). Règle doc 07 §7 : jamais de statut inventé côté
 * frontend — le backend est la source de vérité.
 */
export type AdminOrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

/** Ligne de la liste des commandes (doc 07 — §13) */
export interface AdminOrderRow {
  id: string;
  /** Référence lisible (ex. #AC-82921) */
  reference: string;
  customer: { id: string; name: string; phone: string };
  store: { id: string; name: string; status: AdminStoreStatus };
  sellerName: string;
  amountFcfa: number;
  currency: string;
  status: AdminOrderStatus;
  createdAt: string;
  updatedAt: string;
}

/** Produit commandé (doc 07 — §22) */
export interface AdminOrderItem {
  id: string;
  name: string;
  variant: string | null;
  quantity: number;
  unitPriceFcfa: number;
}

/** Événement de la timeline d'une commande (doc 07 — §24) */
export interface AdminOrderTimelineEvent {
  id: string;
  label: string;
  at: string;
  by?: string;
}

/** Note interne — jamais visible par le client (doc 07 — §26) */
export interface AdminOrderNote {
  id: string;
  author: string;
  content: string;
  at: string;
}

/** Anomalie détectée (doc 07 — §25) */
export interface AdminOrderAnomaly {
  id: string;
  level: AdminPriorityLevel;
  message: string;
  /** Commande concernée */
  orderId: string;
}

/** Données complètes du détail commande (doc 07 — §21 à §24) */
export interface AdminOrderDetail extends AdminOrderRow {
  seller: { id: string; name: string };
  items: AdminOrderItem[];
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  totalFcfa: number;
  paymentMethod: string;
  delivery: {
    method: string;
    zone: string;
    address: string | null;
    feeFcfa: number;
    status: string;
  };
  timeline: AdminOrderTimelineEvent[];
  notes: AdminOrderNote[];
  /** Anomalie associée (détectée par la plateforme) */
  anomaly: AdminOrderAnomaly | null;
}

/** Point du graphique de volume (doc 07 — §8) */
export interface AdminOrderVolumePoint {
  label: string;
  orders: number;
  gmvFcfa: number;
}

/** Données complètes de la page Orders Platform Overview */
export interface AdminOrdersData {
  kpis: {
    total: number;
    today: number;
    todayChangePercent: number;
    pending: number;
    delivered: number;
    cancelled: number;
    /** GMV — valeur brute des commandes (jamais confondu avec le revenu plateforme, doc 07 §42) */
    gmvFcfa: number;
    /** Average Order Value sur la période (doc 07 — §10) */
    aovFcfa: number;
  };
  /** Évolution du volume — unité temporelle par période (doc 07 — §8) */
  volume: AdminOrderVolumePoint[];
  anomalies: AdminOrderAnomaly[];
  rows: AdminOrderRow[];
}

/* ———————————————————————————————— Subscriptions & Revenue ———————————————————————————————— */

/** Cycle de facturation (doc 08 — §11) */
export type AdminBillingCycle = "monthly" | "yearly";

/** Plan d'abonnement — performance commerciale (doc 08 — §8/§9) */
export interface AdminPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceFcfa: number;
  yearlyPriceFcfa: number;
  /** ACTIVE | DISABLED — désactiver ne supprime jamais les abonnements (doc 08 §9.1) */
  status: "ACTIVE" | "DISABLED";
  subscribersCount: number;
  /** Revenu mensuel généré par ce plan */
  mrrFcfa: number;
  growthPercent: number;
  conversionPercent: number;
  churnPercent: number;
  /** Part du MRR total */
  shareOfMrrPercent: number;
}

/** Ligne de la liste des abonnements (doc 08 — §11) */
export interface AdminSubscriptionRow {
  id: string;
  store: { id: string; name: string };
  ownerName: string;
  plan: string;
  status: AdminSubscriptionStatus;
  billingCycle: AdminBillingCycle;
  amountFcfa: number;
  currency: string;
  startedAt: string;
  /** Prochaine échéance */
  renewalDate: string | null;
  /** Fin d'essai (TRIAL uniquement) */
  trialEndsAt: string | null;
  paymentMethod: string;
  lastTransactionAt: string | null;
}

/** Changement de plan (doc 08 — §14) */
export interface AdminPlanChange {
  id: string;
  fromPlan: string;
  toPlan: string;
  at: string;
  reason?: string;
  priceDiffFcfa: number;
}

/** Transaction d'un abonnement (doc 08 — §13) */
export interface AdminSubscriptionTransaction {
  id: string;
  type: "charge" | "refund" | "renewal" | "downgrade_credit";
  amountFcfa: number;
  status: string;
  at: string;
}

/** Événement d'historique d'un abonnement (doc 08 — §13) */
export interface AdminSubscriptionHistoryEvent {
  id: string;
  label: string;
  at: string;
  by?: string;
}

/** Données complètes du détail abonnement (doc 08 — §13) */
export interface AdminSubscriptionDetail extends AdminSubscriptionRow {
  owner: { id: string; name: string; email: string };
  storeStatus: AdminStoreStatus;
  verificationStatus: AdminVerificationStatus | null;
  planPriceFcfa: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  updatedAt: string;
  planChanges: AdminPlanChange[];
  transactions: AdminSubscriptionTransaction[];
  history: AdminSubscriptionHistoryEvent[];
}

/** Point du graphique de revenus (doc 08 — §6) */
export interface AdminRevenuePoint {
  label: string;
  mrrFcfa: number;
  /** Revenus d'abonnement facturés */
  subscriptionFcfa: number;
  /** Nouveaux revenus (upgrades + nouveaux abonnés) */
  newRevenueFcfa: number;
  /** Revenus perdus (annulations, downgrades, expirations) */
  lostRevenueFcfa: number;
}

/** Essai arrivant à expiration (doc 08 — §10.1) */
export interface AdminTrialExpiring {
  storeId: string;
  storeName: string;
  plan: string;
  /** Jours avant expiration */
  expiresInDays: number;
}

/** Alerte économique (doc 08 — §19) */
export interface AdminRevenueAlert {
  id: string;
  level: AdminPriorityLevel;
  message: string;
}

/** Événement économique récent (doc 08 — §18) */
export interface AdminSubscriptionEvent {
  id: string;
  type: "upgrade" | "downgrade" | "cancel" | "new_trial" | "renewal";
  actor: string;
  description: string;
  timestamp: string;
  resourceHref?: string;
}

/** Données complètes de la page Subscriptions & Revenue */
export interface AdminSubscriptionsData {
  kpis: {
    mrrFcfa: number;
    mrrChangePercent: number;
    arrFcfa: number;
    arrChangePercent: number;
    activeSubscriptions: number;
    trialsActive: number;
    /** Conversion Trial → Paid (doc 08 — §4.5) */
    trialConversionPercent: number;
    /** Churn mensuel (doc 08 — §4.6) */
    churnPercent: number;
    /** Revenu moyen par boutique payante */
    revenuePerPaidStoreFcfa: number;
  };
  revenueSeries: AdminRevenuePoint[];
  plans: AdminPlan[];
  trialsExpiring: AdminTrialExpiring[];
  alerts: AdminRevenueAlert[];
  events: AdminSubscriptionEvent[];
  rows: AdminSubscriptionRow[];
}

/* ———————————————————————————————— Données complètes de l'Overview ———————————————————————————————— */

/** Payload de la homepage /admin (Command Center) */
export interface AdminOverviewData {
  kpis: AdminKpi[];
  priorityActions: AdminPriorityAction[];
  /** Période affichée (sélecteur global) */
  period: "7_days" | "30_days" | "90_days" | "this_year";
  performance: {
    /** Métrique active par défaut */
    defaultMetric: AdminPerformanceMetric;
    series: Record<AdminPerformanceMetric, AdminPerformancePoint[]>;
  };
  activity: AdminActivityEvent[];
  snapshots: {
    stores: AdminStoresSnapshot;
    users: AdminUsersSnapshot;
    orders: AdminOrdersSnapshot;
    subscriptions: AdminSubscriptionsSnapshot;
  };
  systemStatus: AdminSystemComponent[];
}

/* ———————————————————————————————— Analytics (doc 09) ———————————————————————————————— */

/** Période d'analyse — alignée sur le sélecteur global du topbar (doc 09 — §4) */
export type AdminAnalyticsPeriod = AdminOverviewData["period"];

/** Point de croissance plateforme (doc 09 — §7) */
export interface AdminGrowthPoint {
  label: string;
  users: number;
  stores: number;
  orders: number;
}

/** Étape du funnel vendeur (doc 09 — §10) */
export interface AdminFunnelStep {
  id: string;
  label: string;
  count: number;
  /** % de conversion par rapport à l'étape précédente */
  conversionPercent: number;
}

/** Performance d'une catégorie (doc 09 — §18) */
export interface AdminCategoryPerformance {
  id: string;
  name: string;
  productsCount: number;
  storesCount: number;
  ordersCount: number;
  gmvFcfa: number;
  growthPercent: number;
}

/** Classement d'une boutique (doc 09 — §16) */
export interface AdminTopStore {
  id: string;
  name: string;
  ordersCount: number;
  gmvFcfa: number;
  growthPercent: number;
}

/** Produit le plus performant (doc 09 — §17) */
export interface AdminTopProduct {
  id: string;
  name: string;
  storeName: string;
  ordersCount: number;
  gmvFcfa: number;
}

/** Terme de recherche analysé (doc 09 — §19) */
export interface AdminSearchTerm {
  term: string;
  searches: number;
  clicks: number;
  orders: number;
  /** Recherches sans résultat — opportunité de catalogue */
  noResultPercent: number;
}

/** Tendance / anomalie analytique (doc 09 — §22/§23) */
export interface AdminAnalyticTrend {
  id: string;
  label: string;
  value: string;
  positive: boolean;
  level: "info" | "attention" | "critical";
}

/** Payload complet de la page /admin/analytics */
export interface AdminAnalyticsData {
  kpis: AdminKpi[];
  period: AdminAnalyticsPeriod;
  growth: AdminGrowthPoint[];
  funnel: AdminFunnelStep[];
  categories: AdminCategoryPerformance[];
  topStores: AdminTopStore[];
  topProducts: AdminTopProduct[];
  searchTerms: AdminSearchTerm[];
  trends: AdminAnalyticTrend[];
}

/* ———————————————————————————————— Moderation & Security (doc 10) ———————————————————————————————— */

/** Statut d'un signalement (doc 10 — §8) */
export type AdminReportStatus =
  | "NEW"
  | "IN_REVIEW"
  | "PENDING_INFO"
  | "ACTION_REQUIRED"
  | "RESOLVED"
  | "REJECTED"
  | "ARCHIVED";

/** Gravité d'un problème (doc 10 — §5) — même échelle que la priorité de vérification */
export type AdminSeverity = AdminVerificationPriority;

/** Type de signalement (doc 10 — §6) */
export type AdminReportType =
  | "store"
  | "product"
  | "seller"
  | "customer"
  | "conversation"
  | "order"
  | "behavior"
  | "content"
  | "suspicious";

/** Ligne de la liste des signalements (doc 10 — §7) */
export interface AdminReportRow {
  id: string;
  type: AdminReportType;
  severity: AdminSeverity;
  status: AdminReportStatus;
  /** Élément concerné (boutique, produit, utilisateur…) */
  targetLabel: string;
  /** Auteur du signalement */
  reporterName: string;
  /** Nombre de signalements associés au même problème */
  relatedCount: number;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
}

/** Signalement détaillé (doc 10 — §9/§10) */
export interface AdminModerationCase {
  id: string;
  type: AdminReportType;
  severity: AdminSeverity;
  status: AdminReportStatus;
  createdAt: string;
  updatedAt: string;
  reporter: { name: string; detail: string };
  /** Entité concernée — lien contextuel vers le module correspondant */
  target: { kind: string; label: string; href: string };
  /** Contexte utile à la décision (commande, produit, conversation…) */
  context: Array<{ label: string; value: string }>;
  description: string;
  relatedCount: number;
  assignedTo: string | null;
  /** Notes internes — jamais visibles par l'utilisateur (doc 10 — §10) */
  notes: AdminInternalNote[];
  history: AdminVerificationHistoryEvent[];
}

/** Cycle de vie d'un incident (doc 10 — §18) */
export type AdminIncidentStatus =
  | "OPEN"
  | "ANALYSIS"
  | "INTERVENTION"
  | "MONITORING"
  | "RESOLVED"
  | "ARCHIVED";

/** Incident (doc 10 — §16/§17) */
export interface AdminIncident {
  id: string;
  title: string;
  severity: AdminSeverity;
  status: AdminIncidentStatus;
  detectedAt: string;
  affectedStores: number;
  affectedUsers: number;
  description: string;
  assignedTo: string | null;
}

/** Boutique à risque (doc 10 — §15) */
export interface AdminRiskStore {
  storeId: string;
  storeName: string;
  reportsCount: number;
  warnings: number;
  previousSuspensions: number;
  lastActivityAt: string;
  riskLevel: AdminSeverity;
}

/** Entrée du journal administratif (doc 10 — §20/§21) */
export interface AdminAuditLogEntry {
  id: string;
  admin: string;
  action: string;
  target: string;
  severity: AdminSeverity | "info";
  at: string;
}

/** Payload complet de la page /admin/moderation */
export interface AdminModerationData {
  kpis: {
    openReports: number;
    criticalReports: number;
    activeIncidents: number;
    suspendedStores: number;
    suspendedAccounts: number;
    recentActions: number;
  };
  reports: AdminReportRow[];
  incidents: AdminIncident[];
  riskStores: AdminRiskStore[];
  auditLog: AdminAuditLogEntry[];
}

/* ———————————————————————————————— Platform Settings (doc 11) ———————————————————————————————— */

/** Catégorie de catalogue administrée au niveau plateforme (doc 11 — §9) */
export interface AdminSettingsCategory {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  productsCount: number;
}

/** Document exigé par la vérification (doc 11 — §6) */
export interface AdminVerificationDocumentRule {
  id: string;
  label: string;
  required: boolean;
}

/** Rôle administratif et ses permissions (doc 11 — §10) */
export interface AdminRoleSetting {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

/** Interrupteur de notification (doc 11 — §11) */
export interface AdminSettingToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

/** Administrateur de la plateforme (doc 11 — §13) */
export interface AdminAdminEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActiveAt: string;
  active: boolean;
}

/** Règles globales de la plateforme (doc 11) — chaque sous-section est persistable */
export interface AdminPlatformSettings {
  general: {
    platformName: string;
    description: string;
    supportEmail: string;
    contactPhone: string;
  };
  stores: {
    allowVendorCreation: boolean;
    maxStoresPerVendor: number;
    newStoreStatus: string;
    publicVisibility: "active" | "active_verified";
    autoSuspendOnViolation: boolean;
  };
  verification: {
    verificationRequired: boolean;
    allowPublishBeforeVerified: boolean;
    documents: AdminVerificationDocumentRule[];
  };
  orders: {
    guestCheckoutEnabled: boolean;
    autoCancelAfterDays: number;
    cancellationReasonRequired: boolean;
    requireAdminConfirmStatus: boolean;
  };
  subscriptions: {
    freeTrialEnabled: boolean;
    trialDays: number;
    warnOnPlanChange: boolean;
    allowYearlyBilling: boolean;
  };
  catalog: {
    hideSuspendedStoreProducts: boolean;
    categories: AdminSettingsCategory[];
  };
  roles: {
    defaultNewUserRole: string;
    roles: AdminRoleSetting[];
  };
  notifications: {
    system: AdminSettingToggle[];
    adminAlerts: AdminSettingToggle[];
  };
  security: {
    passwordMinLength: number;
    maxLoginAttempts: number;
    sessionTimeoutHours: number;
    requireConfirmationSensitive: boolean;
    twoFactorForAdmins: boolean;
  };
  admins: AdminAdminEntry[];
}

/** Payload de la page /admin/settings */
export interface AdminSettingsData {
  settings: AdminPlatformSettings;
  updatedAt: string;
  updatedBy: string;
}

/** Nom de section configurable (clé de `AdminPlatformSettings`) */
export type AdminSettingsSection = keyof AdminPlatformSettings;

/* ———————————————————————————————— Admin Profile (doc 02 — §15) ———————————————————————————————— */

/** Session active de l'administrateur (doc 02 — §15) */
export interface AdminSessionDevice {
  id: string;
  label: string;
  location: string;
  lastActiveAt: string;
  /** true si c'est l'appareil courant */
  current: boolean;
}

/** Événement d'activité du compte admin */
export interface AdminProfileActivity {
  id: string;
  action: string;
  at: string;
}

/** Payload de la page /admin/profile */
export interface AdminProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    joinedAt: string;
  };
  security: {
    twoFactorEnabled: boolean;
    passwordLastChangedAt: string | null;
  };
  sessions: AdminSessionDevice[];
  activity: AdminProfileActivity[];
  notificationPrefs: AdminSettingToggle[];
}
