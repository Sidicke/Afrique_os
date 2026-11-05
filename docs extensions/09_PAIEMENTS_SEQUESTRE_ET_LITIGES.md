# Paiements, fonds retenus, commissions et litiges

## Avertissement de conception
Un Wallet interne et une retenue comptable ne constituent pas un **séquestre réglementaire**. Avant production, valider avec un prestataire de paiement habilité et un juriste local : qui encaisse, qui détient les fonds, délai autorisé de conservation, split payments, KYC, reversements, remboursements, obligations UMOA/BCEAO, fiscalité et responsabilité. Ne pas laisser ZennShop détenir librement des fonds clients sur son propre compte sans cadre approprié.

## Règles financières
- Au checkout : montant produit, livraison, frais éventuels, taxes, total et destinataires prévisionnels affichés.
- Après webhook PSP authentifié et idempotent : `payment_confirmed`, fonds retenus **chez le PSP selon contrat**, allocations internes en attente.
- Vendeur : montant net = prix produit – commission du plan applicable (ex. Starter 6,5 %, Business 3 %) – autres retenues contractuelles explicitement définies. Snapshot du taux et des montants à la transaction.
- Livraison : allocations par mission/segment à agence ou indépendant, pas au salarié d'agence. Paiement au prestataire après preuve validée et contrôles ; indépendamment de l'acceptation de conformité du produit.
- Vendeur : fonds libérables après acceptation du client OU après délai paramétré (proposition 24 h depuis remise vérifiée), si aucun litige, suspicion, blocage PSP ou obligation légale contraire.
- Ne pas confondre `eligible_for_release`, `payout_requested` et `payout_completed` ; les retraits peuvent échouer.
- Paiement externe du livreur personnel : marquer `externally_settled`, ne pas payer une deuxième fois.

## Ledger et fiabilité
Double écriture ou ledger équilibré selon architecture existante ; événements idempotents, montants en unités entières FCFA, devises explicites, aucun flottant. Réconciliation PSP quotidienne ; gestion webhook dupliqué/hors ordre, remboursements partiels, chargebacks, reversements échoués, retraits, commissions, coûts PSP et compensation.

## Litiges
Produit non conforme, non-livraison, perte, colis endommagé, fraude de confirmation, absence client, retour, remboursement. Distinguer litige **produit** et litige **prestation de livraison** ; ne pas bloquer indûment le livreur pour un défaut produit. Gel ciblé des allocations concernées ; traitement administratif avec preuves et délais.

## Exemples de tests financiers
Produit 20 000 + livraison 2 000 = 22 000 ; Starter 6,5 % du produit = 1 300 ; vendeur 18 700 ; livraison 2 000, hors frais PSP/taxes. Tester les arrondis, remboursements, double callback et changements de plan.
