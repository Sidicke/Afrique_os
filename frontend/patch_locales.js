const fs = require('fs');

const marketplaceAdditionsFR = `
    // Extra hero keys
    heroTag: "Grand marché africain",
    heroTitleAlt: "Achetez auprès de commerces",
    heroTitleHighlight: "100% vérifiés",
    heroDesc: "Découvrez des commerçants et artisans indépendants. Commandez directement, échangez sur WhatsApp et payez par Mobile Money en toute sécurité.",
    heroExplore: "Explorer le catalogue",
    heroSeeShops: "Voir les boutiques",
    heroPartnerShops: "Boutiques Partenaires",
    heroAvailableProducts: "Produits Disponibles",
    
    // Cards
    cardCertified: "Commerces certifiés",
    cardVerifiedShops: "Boutiques vérifiées",
    cardVerifiedDesc: "Consultez les boutiques locales avec profil vérifié, avis clients et contact WhatsApp direct.",
    cardDiscoverShops: "Découvrir les boutiques →",
    cardSecurePayment: "Paiement sécurisé",
    cardMobileMoney: "Mobile Money & Cartes",
    cardPaymentDesc: "Wave, Orange Money, MTN, Moov et Cartes bancaires. Transactions rapides et protégées.",
    cardSeeAll: "Voir tous les produits →",
    
    // TrustBar
    trustVerifiedTitle: "Boutiques vérifiées",
    trustVerifiedDesc: "Commerces certifiés et audités",
    trustWhatsappTitle: "Contact direct",
    trustWhatsappDesc: "Échangez sur WhatsApp en direct",
    trustPaymentTitle: "Paiement mobile",
    trustPaymentDesc: "Wave, Orange, MTN, Moov...",
    trustSupportTitle: "Support client",
    trustSupportDesc: "Assistance 7j/7 garantie",

    // Promo banner
    promoPlan: "Plan Business · 2% de commission",
    promoTitle: "Accélérez vos ventes avec le plan Business",
    promoDesc: "2% de commission seulement, jusqu'à 150 articles et badge vérifié. Formule Starter (0 FCFA) disponible pour démarrer.",
    promoCta: "Découvrir le plan Business →",
    
    // Search Results extra
    searchPlaceholder: "Rechercher un produit, une boutique, une marque...",
    searchRecent: "Recherches récentes",
    searchNoDirect: "Aucune suggestion directe. Appuyez sur Entrée pour lancer la recherche complète.",
    searchSuggestedProducts: "Produits proposés",
    searchSeeAll: "Voir tous les résultats pour",
    searchIntroTitle: "Recherchez parmi des milliers d'articles : mode africaine, électronique, cosmétiques naturels et créations locales vérifiées.",
    searchPopCat: "Catégories les plus consultées",
    searchPopArticles: "Articles populaires à découvrir",
    searchPopArticlesDesc: "Sélection des articles les plus appréciés sur la plateforme",
    searchPartnerShops: "Boutiques partenaires à la une",
    searchPartnerShopsDesc: "Commerces vérifiés avec livraison rapide",
    searchResultCount: "éléments trouvés",
    searchCategory: "Rayon sélectionné",
    searchCategoryPrefix: "Catégorie :",
    searchRelated: "Rayons associés :",
    searchEmptyTitle: "Aucun résultat pour",
    searchEmptyDesc: "Nous n'avons trouvé aucun produit ou boutique correspondant à votre critère. Vérifiez l'orthographe ou tentez un mot-clé plus simple.",
    searchExploreCatalog: "Explorer le catalogue général",
    searchShopsTab: "Boutiques",
    searchProductsTab: "Produits",
`;

const marketplaceAdditionsEN = `
    // Extra hero keys
    heroTag: "Great African Market",
    heroTitleAlt: "Buy from",
    heroTitleHighlight: "100% verified businesses",
    heroDesc: "Discover independent merchants and artisans. Order directly, chat on WhatsApp and pay securely via Mobile Money.",
    heroExplore: "Explore catalog",
    heroSeeShops: "View shops",
    heroPartnerShops: "Partner Shops",
    heroAvailableProducts: "Available Products",
    
    // Cards
    cardCertified: "Certified businesses",
    cardVerifiedShops: "Verified shops",
    cardVerifiedDesc: "Check out local shops with verified profiles, customer reviews and direct WhatsApp contact.",
    cardDiscoverShops: "Discover shops →",
    cardSecurePayment: "Secure payment",
    cardMobileMoney: "Mobile Money & Cards",
    cardPaymentDesc: "Wave, Orange Money, MTN, Moov and Bank Cards. Fast and protected transactions.",
    cardSeeAll: "See all products →",
    
    // TrustBar
    trustVerifiedTitle: "Verified shops",
    trustVerifiedDesc: "Certified and audited businesses",
    trustWhatsappTitle: "Direct contact",
    trustWhatsappDesc: "Chat directly on WhatsApp",
    trustPaymentTitle: "Mobile payment",
    trustPaymentDesc: "Wave, Orange, MTN, Moov...",
    trustSupportTitle: "Customer support",
    trustSupportDesc: "7/7 assistance guaranteed",

    // Promo banner
    promoPlan: "Business Plan · 2% commission",
    promoTitle: "Accelerate your sales with the Business plan",
    promoDesc: "Only 2% commission, up to 150 items and verified badge. Starter plan (Free) available to begin.",
    promoCta: "Discover Business plan →",
    
    // Search Results extra
    searchPlaceholder: "Search for a product, shop, brand...",
    searchRecent: "Recent searches",
    searchNoDirect: "No direct suggestions. Press Enter to run a full search.",
    searchSuggestedProducts: "Suggested products",
    searchSeeAll: "See all results for",
    searchIntroTitle: "Search through thousands of items: African fashion, electronics, natural cosmetics and verified local creations.",
    searchPopCat: "Most viewed categories",
    searchPopArticles: "Popular items to discover",
    searchPopArticlesDesc: "Selection of the most appreciated items on the platform",
    searchPartnerShops: "Featured partner shops",
    searchPartnerShopsDesc: "Verified businesses with fast delivery",
    searchResultCount: "items found",
    searchCategory: "Selected category",
    searchCategoryPrefix: "Category:",
    searchRelated: "Related categories:",
    searchEmptyTitle: "No results for",
    searchEmptyDesc: "We couldn't find any products or shops matching your criteria. Check your spelling or try a simpler keyword.",
    searchExploreCatalog: "Explore general catalog",
    searchShopsTab: "Shops",
    searchProductsTab: "Products",
`;

const addKeys = (file, additions) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('currencyNotice: "Prix affichés selon votre devise préférée",', 'currencyNotice: "Prix affichés selon votre devise préférée",\n' + additions);
  content = content.replace('currencyNotice: "Prices displayed in your preferred currency",', 'currencyNotice: "Prices displayed in your preferred currency",\n' + additions);
  fs.writeFileSync(file, content);
};

addKeys('src/lib/i18n/locales/fr.ts', marketplaceAdditionsFR);
addKeys('src/lib/i18n/locales/en.ts', marketplaceAdditionsEN);
console.log("Locales patched.");
