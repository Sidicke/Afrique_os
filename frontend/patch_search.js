const fs = require('fs');

const file = 'src/components/marketplace/SearchResults.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  'Rechercher un produit, une boutique, une marque...': 't.marketplace.searchPlaceholder',
  'Recherches récentes': '{t.marketplace.searchRecent}',
  'Aucune suggestion directe. Appuyez sur <strong>Entrée</strong> pour lancer la recherche complète.': '<>{t.marketplace.searchNoDirect}</>',
  'Produits proposés': '{t.marketplace.searchSuggestedProducts}',
  'Voir tous les résultats pour': '{t.marketplace.searchSeeAll}',
  "Recherchez parmi des milliers d&apos;articles : mode africaine, électronique, cosmétiques naturels et créations locales vérifiées.": "{t.marketplace.searchIntroTitle}",
  'Catégories les plus consultées': '{t.marketplace.searchPopCat}',
  'Articles populaires à découvrir': '{t.marketplace.searchPopArticles}',
  'Sélection des articles les plus appréciés sur la plateforme': '{t.marketplace.searchPopArticlesDesc}',
  'Boutiques partenaires à la une': '{t.marketplace.searchPartnerShops}',
  'Commerces vérifiés avec livraison rapide': '{t.marketplace.searchPartnerShopsDesc}',
  'élément{totalResults > 1 ? "s" : ""} trouvé{totalResults > 1 ? "s" : ""}': ' {t.marketplace.searchResultCount}',
  'Rayon sélectionné': '{t.marketplace.searchCategory}',
  'Catégorie :': '{t.marketplace.searchCategoryPrefix}',
  'Rayons associés :': '{t.marketplace.searchRelated}',
  'Aucun résultat pour': '{t.marketplace.searchEmptyTitle}',
  "Nous n&apos;avons trouvé aucun produit ou boutique correspondant à votre critère. Vérifiez l&apos;orthographe ou tentez un mot-clé plus simple.": "{t.marketplace.searchEmptyDesc}",
  'Explorer le catalogue général': '{t.marketplace.searchExploreCatalog}'
};

for (const [fr, key] of Object.entries(replacements)) {
    const regex = new RegExp(fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, key);
}

// Special fixes
content = content.replace(/placeholder="Rechercher un produit, une boutique, une marque..."/g, 'placeholder={t.marketplace.searchPlaceholder}');
content = content.replace(/<span>Voir tous les résultats pour « \{inputValue.trim\(\)\} »<\/span>/g, '<span>{t.marketplace.searchSeeAll} « {inputValue.trim()} »</span>');
content = content.replace(/{isCategorySearch \? "Rayon sélectionné" \: "Résultats de recherche"}/g, '{isCategorySearch ? t.marketplace.searchCategory : "Résultats"}');

fs.writeFileSync(file, content);
console.log("SearchResults patched.");
