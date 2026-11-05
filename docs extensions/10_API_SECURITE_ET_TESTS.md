# API, permissions, sécurité et tests

## API proposées (adapter à l'existant)
- `POST /checkout/quote-delivery` : calcul de tarif/éligibilité avant paiement.
- `POST /shipments/{id}/dispatch` : demande d'expédition autorisée.
- `POST /missions/{id}/accept` : acceptation atomique.
- `POST /missions/{id}/assign` : attribution agence à membre actif.
- `POST /missions/{id}/pickup` ; `POST /legs/{id}/handover` : chaîne de garde.
- `POST /shipments/{id}/verify-delivery` : vérification preuve, pas simple booléen.
- `POST /shipments/{id}/accept-product` ; `POST /shipments/{id}/dispute`.
- `GET /delivery/threads/{id}` : ACL fondée sur mission active.
- `POST /agencies/{id}/members/invite` ; `POST /agencies/{id}/members/{id}/detach`.

Ces routes sont **indicatives** ; préférer extension des routes existantes plutôt que duplication.

## Contrôles
AuthN/AuthZ objet par objet ; agences ne voient que leurs missions et membres ; livreurs d'agence jamais missions publiques ; vendeur ne peut affecter une mission d'autrui ; liens invités signés, expirants, limités ; codes de remise hachés, usage unique ; preuve et photo protégées ; rate limiting ; validation de fichiers ; audit ; gestion RGPD local/APDP ; chiffrement adapté ; WebSocket ACL vérifiées à connexion ET événement.

## Tests obligatoires
1. Vendeur désigne livreur personnel ; agence valide livreur demandé ; indépendant prend mission publique.
2. Deux livreurs acceptent en même temps : un seul gagne.
3. Livreur d'agence tente API publique : refus.
4. Employé quitte agence en transportant colis : transition contrôlée.
5. Client invité confirme avec lien vérifié.
6. GPS refusé → adresse manuelle utilisable ; coordonnées imprécises non présentées comme exactes.
7. Tarifs Cotonou/Calavi configurés ; devis figé ; aucune double facturation des packs.
8. Livraison locale code valide/invalide/expiré/réutilisé ; preuve frauduleuse contestée.
9. Gare sans confirmation client : pas de libération automatique.
10. Interurbain A→transporteur→B→client ; perte à chaque transfert.
11. Chat fermé après remise vérifiée ; ancien livreur perd accès ; même livreur/nouvelle mission réactive, sans divulgation ancienne adresse ; tentative WebSocket refusée hors mission.
12. Webhook dupliqué/hors ordre ; payout en échec ; remboursement partiel ; litige ouvert juste avant délai 24 h ; pas de double règlement.
13. Régressions commandes, checkout, Wallet, notifications et messagerie existants.

## Exploitabilité
Feature flags, migrations par étapes, observabilité, alertes, files de retry, procédures de support et de réconciliation ; journalisation sans secrets ni codes OTP.
