# Adresse intelligente sans Google Maps

## Saisie au checkout, avant paiement
Pays → département → commune/ville → arrondissement → quartier/zone → point de repère → description libre (ex. « derrière la pharmacie, portail bleu ») → téléphone de contact → préférence de livraison (domicile / gare) → gare sélectionnée si applicable.

## Localisation précise : vérité technique
- **Avec consentement** : demander la géolocalisation du navigateur/téléphone (latitude, longitude, précision en mètres et horodatage) ; le client vérifie et confirme. Une position GPS peut être imprécise, notamment à l'intérieur.
- **Sans GPS** : proposer une carte libre basée sur OpenStreetMap si intégrée légalement/techniquement, avec épingle déplaçable, ou conserver une adresse descriptive **approximative** ; ne jamais prétendre déduire des coordonnées exactes à partir d'un texte seul.
- L'autocomplétion peut suggérer des communes/quartiers/repères d'un référentiel local validé ; le client choisit et corrige. Les données OSM requièrent respect de licence, attribution et politique d'usage du service de géocodage choisi.
- Ne pas rendre GPS obligatoire ; fallback manuel, notamment pour clients invités et faibles connexions.
- Le vendeur/livreur ne voit que les coordonnées nécessaires à sa mission active ; limiter la conservation et le partage.

## Fiabilité et normalisation
Stocker `address_text`, composants normalisés, `coordinates?`, `accuracy_m?`, `source`, `confirmed_by_customer`, `landmark`, `delivery_notes`, `address_version`. Snapshot de l'adresse par commande : une nouvelle adresse d'un même client ne doit pas modifier les anciennes missions.

## Tarification
Moteur configurable par zone origine × zone destination × catégorie/poids/volume × mode (domicile/gare) × éventuelle surcharge ; prix visible et accepté avant paiement. Exemples **illustratifs non vérifiés** : Cotonou intra-zone 1 000 FCFA, Cotonou–Calavi 1 500 FCFA. Les tarifs réels doivent être négociés/validés.

## Interurbain
Devis = collecte + transport interurbain + dernier kilomètre éventuel + frais de service ; gare par défaut suggérée par commune, mais client peut en choisir une autre **desservie**. Ne pas présumer une gare unique par commune. Refuser checkout ou demander devis si route/prestataire/prix indisponible.

## Réconciliation avec packs vendeurs
Auditer les packs existants ; les conserver comme offres/modes ou règles prioritaires selon une politique explicite. Éviter double facturation. Définir priorité : contrat partenaire, tarif plateforme, tarif vendeur, exception manuelle approuvée.
