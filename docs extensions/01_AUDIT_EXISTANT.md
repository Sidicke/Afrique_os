# Audit obligatoire du code existant

## Avant toute écriture
Inspecter l'arborescence, les migrations, la configuration, les services et les tests. Produire un tableau `Fonction existante | Fichier réel | Modèle/API | Réutilisation | Modification minimale`.

## Inspecter impérativement
- Identité utilisateur, rôles, vendeurs, boutiques, administration et permissions.
- Commandes, lignes de commande, paiement, confirmation et annulation.
- Packs/frais de livraison déjà définis par les vendeurs, et leur emploi au checkout.
- Wallet vendeur, ledger, commissions, retraits, remboursements, intégration FedaPay ou autre PSP.
- Messagerie chiffrée/WebSocket, participants, historique, ACL, product/order context.
- Notifications, tâches asynchrones, cron, événements, stockage fichiers.
- Adresses existantes, géographie, taxes, analytics, reporting et modération.
- Contraintes de concurrence, transactions DB, idempotence, webhooks et logs.

## Questions d'audit
1. Une commande peut-elle contenir plusieurs vendeurs ou colis ? Ne pas présumer.
2. Quand le paiement est-il considéré irrévocablement confirmé ?
3. Le Wallet est-il un ledger interne ou un véritable compte de paiement ?
4. Quels statuts sont déjà utilisés dans les vues, API et webhooks ?
5. Les packs vendeur couvrent-ils des zones, des prix ou seulement des intitulés ?
6. Peut-on réutiliser les conversations existantes avec ACL dynamiques ?
7. Les clients invités peuvent-ils commander ? Comment leur envoyer un lien sécurisé de suivi et de confirmation ?

## Sortie obligatoire
- Schéma de flux existant, inventaire de fichiers, risques de régression, migrations minimales.
- Liste des écarts et décisions bloquantes ; demander validation avant les changements financiers structurants.
- Aucun renommage massif ni refonte gratuite.
