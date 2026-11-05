# Machines à états séparées

## Commande (réutiliser états existants)
`pending_payment → paid → processing → fulfilled` ; `cancelled/refunded/disputed` selon règles existantes. Ne pas écraser les états du projet ; proposer une table de correspondance.

## Expédition
`draft → awaiting_preparation → ready_for_dispatch → awaiting_assignment → assigned → picked_up → in_transit → delivery_pending_verification → delivered_verified` ; branches `failed_attempt`, `returning`, `returned`, `lost`, `cancelled`, `under_review`.

## Mission
`offered → reserved/assigned → accepted → collecting → carrying → handover_pending → completed` ; branches `declined`, `expired`, `failed`, `cancelled`, `reassigned`.

## Transaction vendeur
`payment_pending → funds_confirmed_held_by_psp → awaiting_delivery → awaiting_buyer_acceptance → eligible_for_release → payout_requested → paid_out`; branches `on_hold`, `disputed`, `refunded`, `payout_failed`.

## Principes
- `delivered_verified` ≠ `buyer_accepted`.
- La confirmation du livreur seule ne produit jamais `delivered_verified`.
- Le délai configurable de 24 h commence à `delivered_verified`, pas à `courier_claimed_delivered`.
- Silence du client : libération uniquement si aucune contestation, signal antifraude, obligation légale ou blocage PSP ; délai à valider juridiquement.
- Les droits de remboursement du consommateur restent applicables après une éventuelle libération des fonds.
- Une mission interurbaine est terminée quand son segment est transféré avec preuve suffisante ; cela ne termine pas nécessairement l'expédition globale.
- Notifications et ledger sont déclenchés par transitions autorisées, avec idempotence.
