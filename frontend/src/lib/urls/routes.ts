/**
 * Architecture des URLs Canoniques — ZennShop
 * --------------------------------------------------------------------------
 * Module centralisé de génération et parsing d'URLs pour toute l'application.
 * Garantit la conformité RESTful, le typage strict et la cohérence SEO.
 */

export interface DiscoveryFilterParams {
  q?: string;
  cat?: string;
  marque?: string;
  ville?: string;
  prix_min?: number;
  prix_max?: number;
  tri?: 'populaire' | 'prix_asc' | 'prix_desc' | 'recent' | 'mieux_notes';
  en_stock?: '0' | '1';
  verifie?: '0' | '1';
  page?: number;
  limit?: number;
}

/**
 * Sérialise les paramètres de filtrage en Query String propre et normalisée
 */
export function buildDiscoveryQuery(params: DiscoveryFilterParams): string {
  const sp = new URLSearchParams();

  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.cat?.trim()) sp.set('cat', params.cat.trim());
  if (params.marque?.trim()) sp.set('marque', params.marque.trim());
  if (params.ville?.trim()) sp.set('ville', params.ville.trim());
  if (typeof params.prix_min === 'number' && params.prix_min > 0) {
    sp.set('prix_min', String(Math.floor(params.prix_min)));
  }
  if (typeof params.prix_max === 'number' && params.prix_max > 0) {
    sp.set('prix_max', String(Math.floor(params.prix_max)));
  }
  if (params.tri && ['populaire', 'prix_asc', 'prix_desc', 'recent', 'mieux_notes'].includes(params.tri)) {
    sp.set('tri', params.tri);
  }
  if (params.en_stock === '1') sp.set('en_stock', '1');
  if (params.verifie === '1') sp.set('verifie', '1');
  if (typeof params.page === 'number' && params.page > 1) {
    sp.set('page', String(params.page));
  }
  if (typeof params.limit === 'number' && params.limit > 0 && params.limit !== 24) {
    sp.set('limit', String(params.limit));
  }

  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Parse et assainit les Query Parameters reçus depuis l'URL
 */
export function parseDiscoveryParams(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): DiscoveryFilterParams {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0];
    return val ?? undefined;
  };

  const q = get('q')?.slice(0, 100);
  const cat = get('cat')?.slice(0, 80);
  const marque = get('marque')?.slice(0, 80);
  const ville = get('ville')?.slice(0, 80);
  const rawMin = Number(get('prix_min'));
  const rawMax = Number(get('prix_max'));
  const rawTri = get('tri');
  const tri = (['populaire', 'prix_asc', 'prix_desc', 'recent', 'mieux_notes'].includes(rawTri || '')
    ? (rawTri as DiscoveryFilterParams['tri'])
    : undefined);
  const en_stock = get('en_stock') === '1' ? '1' : undefined;
  const verifie = get('verifie') === '1' ? '1' : undefined;
  const rawPage = Number(get('page'));
  const rawLimit = Number(get('limit'));

  return {
    q: q || undefined,
    cat: cat || undefined,
    marque: marque || undefined,
    ville: ville || undefined,
    prix_min: !isNaN(rawMin) && rawMin > 0 ? rawMin : undefined,
    prix_max: !isNaN(rawMax) && rawMax > 0 ? rawMax : undefined,
    tri,
    en_stock,
    verifie,
    page: !isNaN(rawPage) && rawPage > 1 ? rawPage : 1,
    limit: !isNaN(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 24,
  };
}

/**
 * Système de génération d'URLs modulaires et RESTful
 */
export const routes = {
  // ===== 1. Vitrines Publiques & Découverte =====
  home: () => '/',
  marketplace: (params?: DiscoveryFilterParams) => `/marketplace${params ? buildDiscoveryQuery(params) : ''}`,
  
  /** Vitrine Boutique : /b/:boutiqueSlug */
  shop: (boutiqueSlug: string, params?: DiscoveryFilterParams) => 
    `/b/${encodeURIComponent(boutiqueSlug)}${params ? buildDiscoveryQuery(params) : ''}`,
  
  /** Fiche Produit Scôpée Boutique : /b/:boutiqueSlug/p/:productSlug */
  product: (boutiqueSlug: string, productSlug: string) => 
    `/b/${encodeURIComponent(boutiqueSlug)}/p/${encodeURIComponent(productSlug)}`,
  
  /** Rayon / Catégorie Boutique : /b/:boutiqueSlug/c/:categorySlug */
  shopCategory: (boutiqueSlug: string, categorySlug: string, params?: DiscoveryFilterParams) => 
    `/b/${encodeURIComponent(boutiqueSlug)}/c/${encodeURIComponent(categorySlug)}${params ? buildDiscoveryQuery(params) : ''}`,

  // ===== 2. Espace Marchand Dédié (/vendeur/...) =====
  seller: {
    dashboard: () => '/vendeur/tableau-de-bord',
    products: () => '/vendeur/catalogue',
    newProduct: () => '/vendeur/catalogue/nouveau',
    editProduct: (productId: string) => `/vendeur/catalogue/${encodeURIComponent(productId)}/edition`,
    orders: () => '/vendeur/commandes',
    orderDetail: (reference: string) => `/vendeur/commandes/${encodeURIComponent(reference)}`,
    clients: () => '/vendeur/clients',
    messages: () => '/vendeur/messages',
    messageThread: (conversationId: string) => `/vendeur/messages/${encodeURIComponent(conversationId)}`,
    finances: () => '/vendeur/finances',
    stats: () => '/vendeur/statistiques',
    settings: {
      root: () => '/vendeur/parametres',
      boutique: () => '/vendeur/parametres/boutique',
      shipping: () => '/vendeur/parametres/livraison',
      contacts: () => '/vendeur/parametres/contacts',
      promotions: () => '/vendeur/parametres/promotions',
      visuals: () => '/vendeur/parametres/visuels',
      plan: () => '/vendeur/parametres/formule',
      notifications: () => '/vendeur/parametres/notifications',
      profile: () => '/vendeur/parametres/profil',
      verification: () => '/vendeur/parametres/verification',
    },
  },

  // ===== 3. Espace Acheteur (/mon-compte/...) =====
  buyer: {
    dashboard: () => '/mon-compte/commandes',
    orders: () => '/mon-compte/commandes',
    orderDetail: (reference: string) => `/mon-compte/commandes/${encodeURIComponent(reference)}`,
    messages: () => '/mon-compte/messages',
    messageThread: (conversationId: string) => `/mon-compte/messages/${encodeURIComponent(conversationId)}`,
    loyalty: () => '/mon-compte/fidelite',
    stores: () => '/mon-compte/boutiques',
    profile: () => '/mon-compte/profil',
    settings: () => '/mon-compte/parametres',
  },

  // ===== 4. Auth & Onboarding =====
  auth: {
    login: (next?: string) => `/connexion${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    register: (next?: string) => `/inscription${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    forgotPassword: () => '/mot-de-passe-oublie',
    onboardingShop: () => '/onboarding/boutique',
  },

  // ===== 5. Super Admin Platform (/admin/...) =====
  admin: {
    overview: () => '/admin',
    stores: () => '/admin/stores',
    storeDetail: (id: string) => `/admin/stores/${encodeURIComponent(id)}`,
    orders: () => '/admin/orders',
    orderDetail: (id: string) => `/admin/orders/${encodeURIComponent(id)}`,
    users: () => '/admin/users',
    userDetail: (id: string) => `/admin/users/${encodeURIComponent(id)}`,
    moderation: () => '/admin/moderation',
    verification: () => '/admin/verification',
    subscriptions: () => '/admin/subscriptions',
    analytics: () => '/admin/analytics',
    settings: () => '/admin/settings',
    profile: () => '/admin/profile',
  },
};
