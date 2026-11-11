# Feature — Paiement partiel du panier (sélection par article)

**Branche :** `feat/cart-partial-selection` (base : `fix/c3-payment-ledger-model` @ `b7c9717`, elle-même sur `fix/c2-payment-amount-verification` @ `053834b`, `fix/c1-idempotency-key-scoping` @ `4d48712`, sur `origin/main` @ `f7d6cf2`)

---

## 1. Le besoin, en une phrase

Avant, le panier était **tout ou rien** : ajouter un article au panier signifiait s'engager à tout acheter. Le client veut pouvoir **cocher ce qu'il achète** — un article, deux, ou tout — et payer uniquement cette sélection.

---

## 2. Ce qui a changé

| # | Fichier | Changement |
|---|---|---|
| 1 | `frontend/src/components/store/CartProvider.tsx` | État de sélection : `selectedKeys`, `selectedLines`, `selectedCount`, `selectedSubtotal`, `selectedTotal`, `toggleSelected`, `setAllSelected`, `removeLines`. Persistance dans le `localStorage` du panier. |
| 2 | `frontend/src/components/store/CartDrawer.tsx` | Case à cocher par ligne, barre « Tout sélectionner / Tout désélectionner », compteur de sélection, totaux calculés sur la sélection, CTA adapté, récapitulatif restreint à la sélection, retrait partiel du panier après paiement. |
| 3 | `frontend/src/components/store/CartProvider.test.tsx` | **Nouveau** : 8 tests unitaires de la sélection. |
| 4 | `frontend/src/components/store/CartDrawer.test.tsx` | **Nouveau** : 6 tests d'interface + correction du timeout du test de paiement (flaky pré-existant). |

---

## 3. Le comportement

### 3.1 Sélection

- **Tout est sélectionné par défaut.** Un panier qui existed avant la feature continue de se comporter comme avant : le client n'a rien à cocher. C'est le point clé pour ne pas casser l'habitude existante.
- Chaque ligne porte une **case à cocher** ; une ligne décochée est **atténuée** (opacité réduite) pour que le client voie d'un coup d'œil ce qui part et ce qui reste.
- Une **barre de sélection** en haut du panier affiche « 2 / 3 articles sélectionnés » et un bouton **Tout sélectionner / Tout désélectionner**.
- La sélection est **persistée** dans le `localStorage` du panier : elle survit à un rechargement de page. Les clés qui ne correspondent plus à une ligne existante sont écartées au chargement.
- Un article **ajouté** est sélectionné automatiquement (le client l'a voulu) ; un article **retiré** disparaît aussi de la sélection.

### 3.2 Totaux

Les totaux affichés (sous-total, total) portent sur la **sélection**, pas sur le panier entier. C'est cohérent avec le récapitulatif de l'étape « Vos coordonnées », qui ne liste lui aussi que les lignes sélectionnées.

Le badge du panier (nombre d'articles) continue d'annoncer le **panier entier** : il sert au client à savoir ce qu'il a, pas ce qu'il est en train de commander.

### 3.3 Paiement

Le bouton d'action s'adapte :

| Situation | Libellé |
|---|---|
| Tout le panier est sélectionné | `Passer la commande` |
| Une partie seulement | `Commander la sélection (1 article)` / `(2 articles)` |
| Rien de sélectionné | `Sélectionnez au moins un article` (bouton **désactivé**) |

### 3.4 Après le paiement

**Seules les lignes achetées sont retirées du panier.** Les articles non sélectionnés **restent disponibles** pour une commande ultérieure — c'est tout l'intérêt de la feature. Le pack de livraison choisi est conservé.

---

## 4. Pourquoi aucun changement backend n'a été nécessaire

`CreateOrderDto.items` est déjà un **tableau** de `{ productId, variantId, quantity }` : le backend sait depuis le début traiter un sous-ensemble de produits. Le client envoyait simplement toujours *toutes* les lignes du panier.

Deux garanties côté serveur, vérifiées :

1. **Les prix sont toujours recalculés en base** (`orders.service.ts` : `product.price + variant.priceDelta`), le `unitPrice` envoyé par le client est ignoré. Un panier partiel ne peut donc pas être manipulé côté prix.
2. **Le total de la commande** est reconstruit à partir des lignes reçues : le paiement partiel porte exactement sur le sous-ensemble commandé, et la livraison n'est facturée qu'une fois par commande.

La liaison facture ↔ commande reste celle du correctif C2 (`Order.paydunyaToken`) : un paiement partiel ne change rien à la réconciliation du correctif C3, qui travaille sur la commande entière.

---

## 5. Vérifications

| Vérification | Résultat |
|---|---|
| Typecheck frontend (`tsc --noEmit`) | ✅ exit 0 |
| Tests `CartProvider.test.tsx` | ✅ 19/19 (11 existants + 8 nouveaux) |
| Tests `CartDrawer.test.tsx` | ✅ 14/14 (8 existants + 6 nouveaux) |
| Suite frontend complète | ✅ sans régression |
| Build Next.js (`next build`) | ✅ exit 0 |

Le test de paiement Mobile Money a reçu un timeout explicite (20 s) : il simulait un flux de ~5 s face au timeout par défaut de 5 s, ce qui le rendait **flaky**. Il est désormais vert de façon stable.

---

## 6. Limites assumées

- **Le panier est mono-boutique** : il est stocké par `boutiqueSlug`, et le panier est vidé quand on change de boutique. La sélection s'applique donc dans une seule boutique à la fois — inchangé.
- **« Commander » depuis une fiche produit** ajoute le produit au panier et ouvre le checkout : si le panier contenait déjà d'autres articles, **ceux-ci sont commandés aussi** (comportement historique, inchangé). Pour n'acheter que ce produit, le client doit décocher les autres lignes depuis le panier.
- La livraison est facturée **une fois par commande**, même pour un panier partiel : c'est le comportement standard des e-commerces.
- La sélection n'est pas synchronizee entre appareils : elle vit dans le `localStorage` du navigateur, comme le panier lui-même.
