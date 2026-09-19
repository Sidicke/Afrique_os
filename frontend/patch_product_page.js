const fs = require('fs');

const file = 'src/components/marketplace/ProductPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  "Ce produit n'existe pas ou n'est plus disponible. Retournez au marketplace pour continuer votre découverte.": "{t.marketplace.productNotFound}",
  "Réessayer": "{t.marketplace.productRetry}",
  "Lien copié !": "t.marketplace.productCopied",
  "Partager le lien": "t.marketplace.productShare",
  ">Épuisé<": ">{t.marketplace.productSoldOutBadge}<",
  "Stock limité": "{t.marketplace.productStockLimited}",
  "Épuisé\"": "{t.marketplace.productSoldOut}\"",
  "Quantité": "{t.marketplace.productQuantity}",
  "Diminuer la quantité": "t.marketplace.productDecreaseCount",
  "Augmenter la quantité": "t.marketplace.productIncreaseCount",
  "commande (coordonnées + paiement) s'ouvre immédiatement sur": "{t.marketplace.productOrderHint}",
  "Commander maintenant": "{t.marketplace.productOrderNow}",
  "Produit épuisé": "{t.marketplace.productOrderSoldOut}",
  "Commande publique sans compte : paiement et livraison gérés par": "{t.marketplace.productPublicOrder}",
  "Vendeur vérifié par la plateforme": "{t.marketplace.productVerifiedSeller}",
  " avis": " {t.marketplace.productReviews}",
  "Dans la même catégorie": "{t.marketplace.productSameCategory}"
};

for (const [fr, key] of Object.entries(replacements)) {
    content = content.split(fr).join(key);
}

content = content.replace(/\{copied \? "t\.marketplace\.productCopied" \: "t\.marketplace\.productShare"\}/g, '{copied ? t.marketplace.productCopied : t.marketplace.productShare}');
content = content.replace(/aria-label="t\.marketplace\.productDecreaseCount"/g, 'aria-label={t.marketplace.productDecreaseCount}');
content = content.replace(/aria-label="t\.marketplace\.productIncreaseCount"/g, 'aria-label={t.marketplace.productIncreaseCount}');
content = content.replace(/ \: "t\.marketplace\.productSoldOut"\}/g, ' : t.marketplace.productSoldOut}');

fs.writeFileSync(file, content);
console.log("ProductPage patched.");
