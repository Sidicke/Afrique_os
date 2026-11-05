# ZennShop — Dossier d'intégration Livraison & Paiements

## Objectif
Intégrer progressivement la livraison, les partenaires, les adresses, les preuves de remise et les règlements **sans casser les fonctionnalités existantes**.

## Ordre de lecture pour l'agent
1. `01_AUDIT_EXISTANT.md` : cartographier le dépôt avant toute modification.
2. `02_REGLES_METIER_ET_ACTEURS.md` : droits et scénarios.
3. `03_ARCHITECTURE_ET_DONNEES.md` : intégration cible adaptable.
4. `04_CYCLE_COMMANDE_LIVRAISON.md` : machines à états.
5. `05_ATTRIBUTION_ET_PARTENAIRES.md` : agences et indépendants.
6. `06_ADRESSES_ET_TARIFS.md` : adresses intelligentes et zones.
7. `07_PREUVES_ET_INTERURBAIN.md` : chaîne de garde et gares.
8. `08_MESSAGERIE_ET_NOTIFICATIONS.md` : conversations temporaires.
9. `09_PAIEMENTS_SEQUESTRE_ET_LITIGES.md` : flux financiers.
10. `10_API_SECURITE_ET_TESTS.md` : contrats, sécurité, tests.
11. `11_PLAN_IMPLEMENTATION.md` : phases et critères de livraison.
12. `12_DECISIONS_A_VALIDER.md` : inconnues à arbitrer.

## Contraintes non négociables
- Ne pas créer un second système de commandes, de Wallet, d'authentification, de messagerie ou de notifications.
- Ne pas inventer la structure du dépôt : identifier les noms réels des modèles/services/routes et adapter ce dossier.
- Ne jamais faire du front-end la seule barrière de sécurité.
- Ne pas appeler « séquestre » une simple écriture en base : vérifier les capacités et obligations du prestataire de paiement agréé.
- Les prix, délais, statuts et permissions doivent être configurables et testés.
- Ne pas activer les versements réels avant validation contractuelle, réglementaire et tests d'intégration.

## Livrables attendus de l'agent
Cartographie existant → analyse des écarts → plan de migration → implémentation par phases → tests → documentation opérationnelle. Ne pas développer tout d'un coup.
