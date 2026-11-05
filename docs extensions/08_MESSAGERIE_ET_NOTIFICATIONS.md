# Messagerie client ↔ livreur : accès lié à la mission

## Règle produit validée
Une conversation client–livreur est utilisable uniquement pendant une mission active. Dès la **livraison effectivement vérifiée** (pas simple clic du livreur), fermer l'écriture et l'accès opérationnel au fil. Si le **même livreur** livre de nouveau au **même client**, le fil historique peut être réactivé pour cette nouvelle mission, même si l'adresse change.

## Modèle d'autorisation
- Identité du fil : couple stable `customer_identity_id + courier_user_id`, si le client est authentifié ; pour invité, utiliser identité/contact vérifié et consentement adapté, sans fusion hasardeuse de personnes partageant un numéro.
- Autorisation : au moins une mission attribuée et active reliant exactement ce livreur et ce destinataire. Pas de permission globale fondée uniquement sur l'existence d'un ancien fil.
- À la clôture : révoquer écriture, accès temps réel et abonnements WebSocket ; conserver l'historique selon politique de rétention et accès réglementaire/administratif.
- Nouvelle mission même couple : réactiver la conversation ou créer un nouveau contexte dans le fil ; afficher clairement la mission en cours. **Ne pas exposer automatiquement des informations d'anciennes adresses** au livreur si elles ne sont plus nécessaires.
- Si mission réattribuée, révoquer immédiatement l'accès de l'ancien livreur ; le nouveau livreur obtient son propre fil autorisé.
- Les messages peuvent être conservés pour preuve et litige selon règles de confidentialité ; fermeture ≠ suppression.

## Exceptions
Litige après livraison : créer canal support distinct, ou réouverture exceptionnelle contrôlée, tracée et limitée ; pas de réouverture libre du chat livreur.

## Notifications
Attribution, collecte, remise au transporteur, arrivée gare, prise en charge livreur B, arrivée, code/confirmation, livraison vérifiée, fenêtre de conformité, litige, libération de fonds. Aucun OTP en clair dans les logs ; notifications sans données personnelles excessives.
