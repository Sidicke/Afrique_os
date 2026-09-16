/**
 * Définitions centralisées des plans — prêtes pour le backend.
 * Ne pas hardcoder dans plusieurs composants.
 */
export type PlanId = "starter" | "business" | "enterprise";

export interface PlanDef {
  id: PlanId;
  label: string;
  priceLabel: string;
  priceValue?: number; // FCFA / mois
  commission: string;
  badge?: string;
  position: string;
  audience: string[];
  features: string[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    id: "starter",
    label: "Starter",
    priceLabel: "0 FCFA / mois",
    commission: "5 %",
    position: "Commencez à vendre gratuitement, sans abonnement.",
    audience: ["indépendants", "petits commerçants", "nouveaux vendeurs"],
    features: [
      "Création de boutique",
      "Jusqu'à 20 produits",
      "Gestion des variantes",
      "Gestion du stock",
      "Commandes & messagerie",
      "Paiements & Wallet",
      "Options de livraison",
      "Présence sur la marketplace",
      "Statistiques essentielles",
      "Support standard",
    ],
    cta: "Créer ma boutique",
    ctaHref: "/inscription",
  },
  {
    id: "business",
    label: "Business",
    priceLabel: "12 500 FCFA / mois",
    priceValue: 12500,
    commission: "2 %",
    badge: "LE PLUS POPULAIRE",
    position: "Pour les vendeurs qui veulent développer et mieux piloter leur activité.",
    audience: ["entreprises établies", "vendeurs réguliers"],
    features: [
      "Tout le Starter +",
      "Jusqu'à 150 produits",
      "Jusqu'à 3 boutiques",
      "Analytics avancées",
      "Rapports détaillés",
      "Segmentation avancée des clients",
      "Outils de pilotage commercial",
      "Support prioritaire",
      "Jusqu'à 3 boutiques multi-boutique",
      "Gestion d'équipe (2 collaborateurs)",
    ],
    cta: "Passer à Business",
    ctaHref: "/inscription?plan=business",
    highlight: true,
  },
  {
    id: "enterprise",
    label: "Enterprise",
    priceLabel: "Sur mesure",
    commission: "Négociée",
    position: "Pour les entreprises et organisations ayant des besoins spécifiques.",
    audience: ["grandes marques", "distributeurs", "réseaux"],
    features: [
      "Tout le Business +",
      "Catalogues importants",
      "Multi-boutiques avancé",
      "Gestion des équipes",
      "Intégrations personnalisées",
      "API & systèmes externes",
      "Reporting avancé",
      "Accompagnement dédié",
      "Conditions commerciales sur mesure",
    ],
    cta: "Parler à notre équipe",
    ctaHref: "/contact",
  },
];

export const PREMIUM_TOOLS = [
  { name: "AI Assistant", desc: "Réponses automatiques et suggestions de produits." },
  { name: "Advanced Analytics", desc: "Tableaux de bord poussés et prédictions." },
  { name: "Marketing Automation", desc: "Campagnes et relances programmées." },
  { name: "Boost visibilité", desc: "Mise en avant dans le marketplace." },
  { name: "Advanced Inventory", desc: "Stock multi-entrepôt et alertes." },
  { name: "Automation", desc: "Règles et workflows personnalisés." },
];

/** Entitlements conceptuels — pour préparation backend */
export const ENTAILMENTS: Record<PlanId, string[]> = {
  starter: ["store", "products", "orders", "messaging", "marketplace", "basic_analytics"],
  business: ["store", "products", "orders", "messaging", "marketplace", "basic_analytics", "advanced_analytics", "promotions", "automation", "customer_segmentation", "advanced_orders", "priority_support"],
  enterprise: ["store", "products", "orders", "messaging", "marketplace", "basic_analytics", "advanced_analytics", "promotions", "automation", "customer_segmentation", "advanced_orders", "priority_support", "multi_store", "team_management", "custom_integrations", "api", "advanced_reporting", "dedicated_support"],
};

/**
 * Tableau comparatif des plans (ordre des colonnes = ordre de PLANS).
 * Source de vérité unique : dérivé des entitlements pour rester cohérent.
 */
export const COMPARISON_ROWS: Array<{ label: string; included: Record<PlanId, boolean> }> = [
  { label: "Création de boutique", included: { starter: true, business: true, enterprise: true } },
  { label: "Catalogue produits & variantes", included: { starter: true, business: true, enterprise: true } },
  { label: "Commandes & messagerie clients", included: { starter: true, business: true, enterprise: true } },
  { label: "Présence sur le marketplace", included: { starter: true, business: true, enterprise: true } },
  { label: "Paiement Mobile Money & à la livraison", included: { starter: true, business: true, enterprise: true } },
  { label: "Statistiques essentielles", included: { starter: true, business: true, enterprise: true } },
  { label: "Analytics avancées & rapports détaillés", included: { starter: false, business: true, enterprise: true } },
  { label: "Outils promotionnels & automatisations", included: { starter: false, business: true, enterprise: true } },
  { label: "Segmentation clients", included: { starter: false, business: true, enterprise: true } },
  { label: "Support prioritaire", included: { starter: false, business: true, enterprise: true } },
  { label: "Multi-boutiques (3 boutiques)", included: { starter: false, business: true, enterprise: true } },
  { label: "Gestion d'équipe (invitations)", included: { starter: false, business: true, enterprise: true } },
  { label: "Intégrations API & webhooks", included: { starter: false, business: false, enterprise: true } },
  { label: "Reporting avancé", included: { starter: false, business: false, enterprise: true } },
  { label: "Accompagnement & chargé de compte dédié", included: { starter: false, business: false, enterprise: true } },
];

/** FAQ de la page tarifs — questions concrètes des commerçants */
export const PRICING_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui. Vous pouvez passer à un plan supérieur quand vous voulez : la différence est calculée au prorata. Le passage à un plan inférieur prend effet à la fin de la période en cours.",
  },
  {
    q: "Comment se passe le paiement de l'abonnement ?",
    a: "Par Mobile Money (Orange Money, MTN, Moov, Wave) ou par carte. L'abonnement se renouvelle automatiquement chaque mois ; vous pouvez le désactiver à tout moment depuis vos paramètres.",
  },
  {
    q: "La commission s'applique-t-elle en plus de l'abonnement ?",
    a: "Oui, la commission s'applique uniquement sur vos ventes réalisées via le marketplace. Elle diminue avec les plans supérieurs (5 % en Starter, 2 % en Business, négociée en Enterprise), sans aucun frais caché.",
  },
  {
    q: "Puis-je résilier mon abonnement ?",
    a: "Oui, à tout moment depuis votre espace vendeur. Votre boutique reste active jusqu'à la fin de la période payée, et vos données (produits, commandes, clients) restent accessibles.",
  },
  {
    q: "Que se passe-t-il si mon activité dépasse mon plan ?",
    a: "Rien ne se coupe. Vous recevez une suggestion de mise à niveau, et vous choisissez le moment de basculer. Vos ventes ne s'arrêtent jamais à cause de votre plan.",
  },
];
