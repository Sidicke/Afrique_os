# Architecture d'intégration — propositions, non prescriptions

## Principe
Conserver `Order`, `Payment`, `Wallet`, `Conversation`, `Notification` existants. Ajouter uniquement les abstractions manquantes, avec noms adaptés au dépôt :

- `Shipment` : expédition liée à une commande ou à un sous-ensemble de lignes, vendeur, destinataire, mode, adresses figées, prix figé, état.
- `DeliveryLeg` : segment ordonné (collecte, transport interurbain, dernier kilomètre, retrait gare) ; peut ne pas être nécessaire pour un colis local simple, mais garder un modèle uniforme.
- `DeliveryMission` : travail attribuable à une agence, un livreur indépendant ou un livreur vendeur.
- `DeliveryAgency`, `AgencyMembership`, `CourierProfile` : entités logistiques et rattachements ; réutiliser le User existant.
- `AddressSnapshot`, `DeliveryZone`, `DeliveryRateRule`, `Station` : localisation, tarifs et gares.
- `HandoverEvidence`, `DeliveryEvent` : preuves, chaîne de garde, transitions et auteurs.
- `ShipmentConversationAccess` ou permission équivalente : autorisation temporelle d'accès à un fil existant.
- `SettlementAllocation`, `PayoutInstruction`, `Dispute` : uniquement si absents du modèle financier existant.

## Relations et cardinalités
`Order 1..n Shipment`; `Shipment 1..n DeliveryLeg`; `DeliveryLeg 0..n DeliveryMission` (une seule attribution active à un instant donné) ; `Agency 1..n Membership`; `Mission 0..1 Courier` ; `Shipment 0..n Evidence`.

## Invariants
- Ne pas déduire l'état financier de l'état de livraison sans événements validés.
- Adresses, tarifs et bénéficiaires doivent être snapshotés au checkout ou à la réservation, puis modifiés uniquement par procédure contrôlée.
- Chaque événement : acteur, horodatage UTC, objet, ancienne/nouvelle valeur, corrélation, source et justification.
- Contraintes d'unicité et transactions sur attribution active, preuve à usage unique et instructions de versement.
- Prévoir plusieurs colis/vendeurs sans obliger à l'implémenter dans la première phase si le checkout actuel ne le permet pas.
- Préserver la compatibilité API ; migrations additives et réversibles quand possible.

## Événements de domaine (noms illustratifs)
`payment.confirmed`, `shipment.created`, `mission.offered`, `mission.assigned`, `parcel.picked_up`, `leg.handed_over`, `parcel.delivered_verified`, `buyer.accepted`, `dispute.opened`, `settlement.eligible`, `payout.confirmed`.

Éviter que plusieurs listeners déclenchent des paiements en double : clé d'idempotence et état unique de règlement.
