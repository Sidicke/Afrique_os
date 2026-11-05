# Chaîne de garde, preuves et gares

## Livraison locale
1. Livreur accepte ; 2. collecte prouvée chez vendeur ; 3. acheminement ; 4. livreur déclare arrivée ; 5. client fournit un code de remise à usage unique ou confirme via lien authentifié ; 6. système valide la preuve et marque `delivered_verified` ; 7. ouvre fenêtre de conformité.

Le code ne prouve pas la conformité du produit. Anti-fraude : expiration, tentatives limitées, rate limiting, interdiction d'accès au code par le livreur, audit, contestation.

## Interurbain : 3 segments facultatifs
A. collecte vendeur → gare départ ; B. gare départ → gare arrivée ; C. gare arrivée → domicile. Si retrait gare, C absent.

## Chauffeur sans compte
Le livreur A renseigne compagnie/ligne, gare, reçu/référence, horaire estimé, contact professionnel si nécessaire ; téléverse photo du reçu. `handover_declared` tant qu'aucune preuve indépendante n'est obtenue. Option de confirmation par SMS/lien à usage unique par transporteur (sans compte) si réaliste. Ne jamais considérer une photo seule comme preuve incontestable.

## Retrait à la gare
Le client choisit une gare desservie avant paiement. À l'arrivée : notification ; le client récupère le colis et confirme depuis son compte ou un lien sécurisé envoyé au contact vérifié pour commande invitée. OTP facultatif pour renforcer la confirmation. Sans confirmation, statut `pickup_confirmation_pending` puis relances et revue manuelle ; **pas** de libération automatique 24 h sur simple déclaration d'arrivée.

## Livraison à domicile depuis gare
Livreur B accepte mission, confirme la prise en charge du colis à la gare avec référence/contrôle, livre au client avec preuve de remise ; le transporteur n'a pas besoin de compte. Prévoir réclamations de perte, dommage, retard et transfert contesté.

## Rémunération
Chaque segment peut avoir un bénéficiaire et une rémunération distincts, conditionnés à sa preuve de prestation et aux règles de litige/PSP ; ne pas payer sur une simple auto-déclaration. La somme des segments doit correspondre au devis approuvé, hors frais explicitement séparés.
