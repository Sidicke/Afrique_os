const fs = require('fs');

const frAdditions = `
    // Product Page
    productNotFound: "Ce produit n'existe pas ou n'est plus disponible. Retournez au marketplace pour continuer votre découverte.",
    productRetry: "Réessayer",
    productCopied: "Lien copié !",
    productShare: "Partager le lien",
    productSoldOutBadge: "Épuisé",
    productStockLimited: "Stock limité",
    productSoldOut: "Épuisé",
    productQuantity: "Quantité",
    productDecreaseCount: "Diminuer la quantité",
    productIncreaseCount: "Augmenter la quantité",
    productOrderHint: "commande (coordonnées + paiement) s'ouvre immédiatement sur",
    productOrderNow: "Commander maintenant",
    productOrderSoldOut: "Produit épuisé",
    productPublicOrder: "Commande publique sans compte : paiement et livraison gérés par",
    productVerifiedSeller: "Vendeur vérifié par la plateforme",
    productReviews: "avis",
    productSameCategory: "Dans la même catégorie",
`;

const enAdditions = `
    // Product Page
    productNotFound: "This product doesn't exist or is no longer available. Return to the marketplace to continue your discovery.",
    productRetry: "Retry",
    productCopied: "Link copied!",
    productShare: "Share link",
    productSoldOutBadge: "Sold out",
    productStockLimited: "Limited stock",
    productSoldOut: "Sold out",
    productQuantity: "Quantity",
    productDecreaseCount: "Decrease quantity",
    productIncreaseCount: "Increase quantity",
    productOrderHint: "order (details + payment) opens immediately on",
    productOrderNow: "Order now",
    productOrderSoldOut: "Product sold out",
    productPublicOrder: "Public order without account: payment and delivery handled by",
    productVerifiedSeller: "Platform-verified seller",
    productReviews: "reviews",
    productSameCategory: "In the same category",
`;

const patchLocales = (file, additions) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('// Search Results extra', additions + '\n    // Search Results extra');
  fs.writeFileSync(file, content);
}

patchLocales('src/lib/i18n/locales/fr.ts', frAdditions);
patchLocales('src/lib/i18n/locales/en.ts', enAdditions);

console.log("ProductPage locales patched.");
