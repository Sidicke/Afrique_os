# Acteurs, capacités et règles

## Acteurs
- **Client** (avec ou sans compte) : choisit adresse, gare, mode et prix avant paiement ; suit le colis ; confirme la réception/conformité ; ouvre un litige.
- **Vendeur** : prépare commande, choisit parmi les modes éligibles, peut désigner son livreur habituel, suit missions ; n'obtient pas automatiquement les fonds après paiement.
- **Livreur indépendant** : profil vérifié, peut voir et accepter les missions publiques éligibles, exécute, transmet les preuves ; bénéficiaire de sa rémunération.
- **Agence** : compte professionnel, reçoit/accepte des missions, gère ses livreurs, affecte les missions, reçoit les revenus de ses prestations.
- **Livreur d'agence** : compte individuel et rattachement actif à UNE agence dans V1 ; exécute uniquement les missions attribuées par cette agence ; aucune mission publique.
- **Administrateur ZennShop** : paramétrage des zones, prix, vérifications, litiges, incidents, suspensions, audit et arbitrage avec justification.
- **Transporteur occasionnel/chauffeur** : pas de compte obligatoire ; transfert attesté par preuves, contact professionnel facultatif et données minimales.
- **Prestataire de paiement habilité** : détient/gère les fonds et les règlements conformément à son contrat ; ZennShop tient un registre interne réconcilié.

## Règles transversales
- Un compte utilisateur peut porter plusieurs capacités, sans multiplier les identités, sous réserve des conflits de rôles.
- Livreur lié à agence : interdiction API et UI de prendre une mission publique, même en contournant l'interface.
- Agence peut affecter uniquement ses livreurs actifs ; livreur doit accepter la mission selon configuration.
- Vendeur peut demander un livreur précis d'agence ; affectation nécessite approbation de l'agence.
- Départ d'agence : préserver historique et contrôler les missions en cours ; conversion en indépendant après vérification.
- Missions publiques : acceptation atomique par un seul livreur ; éligibilité, couverture, disponibilité et capacité vérifiées.
- Vendeur peut choisir livreur personnel ; distinguer paiement par ZennShop vs paiement externe au vendeur.
- La livraison et la conformité du produit sont deux validations distinctes.
- Toute décision sensible doit laisser une trace d'audit non modifiable par les utilisateurs.
