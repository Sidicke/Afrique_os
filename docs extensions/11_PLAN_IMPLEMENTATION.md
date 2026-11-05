# Plan d'implémentation progressif

## Phase 0 — Audit et arbitrages
Lire `01_AUDIT_EXISTANT.md`, établir carte du code, lister questions bloquantes, proposer schéma de migrations et tests. **Ne rien coder avant accord sur le plan.**

## Phase 1 — Socle adresses et devis
Référentiel local zones/gares, formulaire d'adresse avec GPS optionnel, repères, snapshot, devis et intégration packs vendeur ; tests.

## Phase 2 — Acteurs et missions locales
Profils agence/indépendant, rattachement, permissions, missions publiques/privées, attribution atomique, collecte et remise ; tableau de bord minimal ; tests.

## Phase 3 — Preuves et messagerie
Confirmation de livraison, codes/lien invité, fermeture/réouverture conditionnelle du fil existant, notifications, litiges de livraison ; tests sécurité.

## Phase 4 — Segments interurbains
Gares, collecte A, transporteur sans compte, preuve de transfert, retrait gare ou livreur B, tarification multi-segments ; tests.

## Phase 5 — Règlements réels
Après validation du prestataire agréé et du juridique : allocations, fonds en attente, commissions, paiements agence/indépendant, libération vendeur, litiges, réconciliation, audit. Commencer en sandbox puis pilote contrôlé.

## Conditions de fin de phase
Migrations documentées, tests automatisés, parcours de démonstration, non-régression, permissions vérifiées, métriques et rollback. Ne pas prétendre une fonctionnalité prête si son PSP/transporteur/zone n'est pas opérationnel.

## Consigne à l'agent
À chaque phase : (1) citer fichiers existants réutilisés, (2) proposer modifications minimales, (3) attendre validation si modification structurante, (4) implémenter, (5) exécuter tests, (6) rendre compte des limites et risques.
