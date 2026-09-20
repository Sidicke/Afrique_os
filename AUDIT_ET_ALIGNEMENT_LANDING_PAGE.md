# 🌍 ZennShop (Afrique OS) — Audit & Plan d'Alignement Philosophique de la Landing Page

Ce document constitue la **source de vérité** pour épurer, corriger et aligner l'ensemble des contenus de la Landing Page de **ZennShop**. 

Chaque section, chaque phrase et chaque mot doit répondre à une exigence stricte : **avoir une raison d'exister et servir la philosophie fondamentale de la plateforme**.

---

## 1. Philosophie Fondatrice de la Plateforme

### Le Problème Réel du Terrain
En Afrique francophone et subsaharienne, plus de 90 % du commerce digital informel se déroule sur WhatsApp, Facebook, Instagram et TikTok. Ce modèle artisanal atteint rapidement ses limites :
- **Perte de commandes :** Des dizaines de discussions mélangées, messages non lus, oublis de relance.
- **Friction extrême :** Répondre 50 fois par jour au prix et à la disponibilité en message privé ("prix en PV").
- **Défiance et peur de l'arnaque :** Les acheteurs craignent d'envoyer de l'argent par Mobile Money sans garantie ; les vendeurs craignent d'expédier sans paiement.
- **Gestion aveugle :** Aucun suivi de stock réel (risque de survente), aucune comptabilité, carnet papier facilement égaré.
- **Inadaptation des solutions occidentales :** Shopify, WooCommerce ou Prestashop exigent une carte bancaire internationale (Visa/Mastercard), des abonnements mensuels récurrents en devises étrangères, et des compétences de développeur.

### La Vision ZennShop ("L'OS du Commerce Africain")
ZennShop n'est pas un simple créateur de site web. C'est l'**infrastructure commerciale complète, souveraine et accessible** conçue pour les réalités africaines :
1. **Démarrage immédiat sans barrière :** 0 FCFA pour ouvrir sa boutique, sans carte bancaire, sans abonnement obligatoire.
2. **Mobile-First absolu :** 100 % de l'activité (création, photos, commandes, stock, encaissements, retraits) se gère depuis un smartphone.
3. **Paiements locaux natifs :** Mobile Money (Wave, Orange Money, MTN, Moov) et cartes bancaires sécurisées.
4. **Double force commerciale :**
   - Une **vitrine privée personnalisée** (`zennshop.com/boutique/nom`) à partager en bio TikTok, Instagram et statut WhatsApp.
   - Un **Marketplace central connecté** qui offre aux commerçants une audience et du trafic dès le premier jour.
5. **Confiance et sécurité vérifiées :** Badge de vérification (KYC / Registre de commerce) pour rassurer l'acheteur, messagerie chiffrée, traçabilité des livraisons.

---

## 2. Scan Global : Ce qu'on doit changer côté par côté

| Pôle | Périmètre technique | Problèmes actuels & Transformations requises |
| :--- | :--- | :--- |
| **1. Landing Page & Vitrine** | `frontend/src/app/page.tsx`<br>`src/components/home/*`<br>`src/components/sections/*` | **(Priorité actuelle)** Éliminer les logos erronés (`AC`), supprimer les faux emails (`support@plateforme.com`), expurger les questions de levée de fonds/pitch deck de la FAQ, clarifier la promesse "0 FCFA sans carte bancaire" et aligner le cockpit vendeur sur les vraies fonctionnalités. |
| **2. Côté Acheteur & Marketplace** | `/marketplace`<br>`/boutique/[slug]`<br>`/recherche`<br>`/espace-client` | Assurer un flux d'achat ultra fluide sans création de compte obligatoire (commande directe avec numéro de téléphone), harmoniser le panier multi-articles, fiabiliser le sélecteur de devise locale et optimiser le chat chiffré acheteur-vendeur. |
| **3. Côté Vendeur (Merchant OS)** | `/espace-admin`<br>`/produits`<br>`/commandes`<br>`/portefeuille` | Éliminer la confusion d'URL (`/espace-admin` vs `/vendeur`), simplifier la vue mobile du tableau de bord, automatiser les demandes de retrait Mobile Money vers Wave/Orange/MTN et standardiser les formulaires de variantes de produits (tailles, couleurs). |
| **4. Côté Plateforme & Admin** | `/admin`<br>`backend/src/*`<br>`backend/prisma/*` | Renforcer la modération des boutiques suspectes, fiabiliser la validation KYC (badges vérifiés), automatiser les webhooks FedaPay avec réconciliation atomique et surveiller les litiges de livraison. |

---

## 3. Inventaire des Éléments Brouillons & Vestiges de Test sur la Landing Page

Voici la liste exhaustive des éléments factices ou inadaptés relevés dans le code source actuel :

| # | Composant & Ligne | Élément Détecté | Nature du Problème | Correction Requise |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `Navbar.tsx` (L.88)<br>`Footer.tsx` (L.90) | Badge doré avec le monogramme **`AC`** | Vestige d'un ancien nom (*"Afrique Commerce"*). Le nom du produit est **ZennShop**. | Remplacer par **`ZS`** ou l'icône officielle de ZennShop. |
| **2** | `Footer.tsx` (L.35) | `support@plateforme.com` | Adresse email de test générique détruisant la crédibilité. | Remplacer par `contact@zennshop.com` (ou variable d'environnement). |
| **3** | `Footer.tsx` (L.39) | `const CITIES = "Abidjan · Dakar..."` | Variable de code orpheline, non rendue à l'écran, vestige de maquette. | Nettoyer ou intégrer dans un bandeau de présence géographique pertinent. |
| **4** | `Navbar.tsx` (L.125-154) | Sélecteurs `FR / EN` et `Devises` | Forcent un rechargement mais la Landing Page a tous ses textes et montants codés en dur en français et FCFA. | Soit connecter les textes via `useTranslation()`, soit masquer le sélecteur d'anglais sur la landing tant que les traductions ne sont pas intégrées. |
| **5** | `UnifiedValueProp.tsx` (L.243) | `zennshop.com/espace-vendeur` | URL fictive affichée dans la barre de navigateur mockée (la vraie route est `/espace-admin`). | Remplacer par `zennshop.com/espace-vendeur` aligné avec les routes publiques ou pointer sur `zennshop.com/boutique/votre-nom`. |
| **6** | `UnifiedValueProp.tsx` (L.23) | `zennshop.com/votre-nom` | Route fictive : la vraie structure est `/boutique/[slug]` ou `/b/[slug]`. | Harmoniser avec la réalité : `zennshop.com/boutique/votre-boutique`. |
| **7** | `Navbar.tsx` (L.248)<br>`FinalCTA.tsx` (L.136) | Mention récurrente : *"Business dès 12 500 FCFA/m"* | Contredit le message central "0 FCFA pour démarrer / gratuit". Crée la crainte d'un piège payant. | Remplacer par la réassurance d'accessibilité : *"0 FCFA pour démarrer · Sans carte bancaire"*. |
| **8** | `UnifiedValueProp.tsx` (L.58) | Badge stat : *"2% de commission seulement (Business)"* | Omet d'indiquer que le plan Starter gratuit est à 5%. Risque de créer une incompréhension tarifaire. | Préciser clairement : *"5% en Starter (0 FCFA/m) · 2% en Business"*. |
| **9** | `VisionFAQ.tsx` (L.14-16) | Questions 07, 08 et 09 : *"Quels partenaires ?", "Pourquoi nous rejoindre ?", "Construire ensemble ?"* | Discours de pitch deck orienté banques, investisseurs et partenaires institutionnels. Totalement déconnecté des questions d'un commerçant ou client. | Remplacer par une FAQ 100% commerçant/client : retraits Mobile Money, absence de frais fixes, fonctionnement des commandes, badges vérifiés, livraison. |
| **10** | `HomeHero.tsx` (L.182-193) | Compteur dynamique `{stats.shops} boutiques actives` | Si la base de données de production ou de test n'a que 1 ou 2 boutiques, affiche un état désertique peu flatteur. | Ajouter un seuil de sécurité d'affichage ou formuler de manière qualitative et robuste. |
| **11** | `HomeHero.tsx` (L.32-48) | Particules créées via DOM direct sans cleanup | Fuite mémoire et duplication de divs à chaque navigation retour sur l'accueil. | Ajouter une fonction de nettoyage dans le `useEffect`. |

---

## 4. Matrice Chirurgicale : Section par Section & Mot par Mot

---

### SECTION 1 : Barre de Navigation (`Navbar.tsx`)

#### A. Diagnostic
- Logo affichant `AC` au lieu de `ZS` ou ZennShop.
- Le bandeau scrollé pousse le plan payant à 12 500 FCFA/mois.
- Pas d'accès direct différencié pour l'acheteur qui cherche des produits vs le commerçant qui veut gérer sa boutique.

#### B. Texte Réaligné
- **Logo :**
  ```tsx
  <span className="... font-display text-sm font-bold text-gold-300 ...">
    ZS
  </span>
  <span>Zenn<span className="text-gold-300">Shop</span></span>
  ```
- **Bandeau scrollé (Notification Bar) :**
  - *Avant :* `Business dès 12 500 FCFA/mois · Lancer ma boutique en ligne →`
  - *Après :* `⚡ Ouvrez votre boutique en ligne à 0 FCFA · Sans carte bancaire · En 5 minutes →`
- **Rôle philosophique :** Accueillir le vendeur sans barrière financière et poser la marque avec fierté.

---

### SECTION 2 : Hero Principal (`HomeHero.tsx`)

#### A. Diagnostic
- Le titre actuel *"Donnez à votre commerce la vitrine qu'il mérite"* est esthétique mais ne met pas assez en avant la notion de **système de vente complet** (gestion, encaissement, fin du désordre WhatsApp).
- Les 4 éléments de rassurance doivent immédiatement lever les 4 grandes peurs du commerçant africain : l'argent, la technique, les délais et le paiement.

#### B. Texte Réaligné
- **Titre Principal (H1) :**
  > **Structurez votre commerce.**  
  > <span className="text-gold-gradient">Donnez-lui la vitrine qu’il mérite.</span>
- **Sous-titre :**
  > Créez votre boutique professionnelle en **5 minutes** depuis votre téléphone. Partagez votre catalogue, encaissez par **Mobile Money** et développez vos ventes sans perdre une seule commande.
- **Barre de Recherche Hero :**
  - *Placeholder :* `Rechercher un produit, une boutique, une marque, une ville…`
- **Boutons d'Action (CTAs) :**
  - **Bouton 1 (Or) :** `Lancer ma boutique gratuitement` *(Lien vers /inscription)*
  - **Bouton 2 (Secondaire) :** `Explorer le marketplace` *(Lien vers /marketplace)*
- **Micro-Rassurances sous le bouton :**
  - `✔ 0 FCFA pour démarrer`
  - `✔ Sans carte bancaire`
  - `✔ Sans engagement`
- **Les 4 Preuves Clés (Bandeau de confiance) :**
  1. ⚡ **Boutique en ligne en 5 min** *(Zéro code, 100% autonome sur mobile)*
  2. 📱 **Mobile Money natif** *(Wave, Orange Money, MTN, Moov & Cash)*
  3. 📦 **Gestion stock & commandes** *(Fini les carnets et les messages perdus)*
  4. 🌍 **Marketplace connecté** *(Vos produits visibles par des milliers d'acheteurs)*

---

### SECTION 3 : Marketplace en Direct (`LiveMarketplace.tsx`)

#### A. Diagnostic
- Cette section est cruciale : elle prouve que ZennShop n'est pas un logiciel vide mais un **marché vivant**.
- Le visiteur doit comprendre en un instant qu'en ouvrant sa boutique, il rejoint une communauté active et que les acheteurs peuvent commander immédiatement.

#### B. Texte Réaligné
- **Surtitre :** `LE MARCHÉ CONNECTÉ, EN TEMPS RÉEL`
- **Titre (H2) :** `De vrais commerçants. De vrais produits.`
- **Sous-titre :**
  > Découvrez les boutiques partenaires, parcourez les nouveautés et commandez en toute confiance avec livraison locale et paiement sécurisé.
- **Bouton :** `Voir tout le marketplace →`

---

### SECTION 4 : Proposition de Valeur Unifiée (`UnifiedValueProp.tsx`)

#### A. Diagnostic
- C'est le cœur argumentaire de la plateforme. 
- Il doit confronter la douleur du commerçant (la jungle de WhatsApp/Instagram) et lui montrer la solution (le Cockpit ZennShop).
- Corriger les URL fictives (`zennshop.com/espace-vendeur` et `zennshop.com/votre-nom`).

#### B. Texte Réaligné

##### Bloc 1 : L'Antidote au Chaos
- **Surtitre :** `POURQUOI LES COMMERÇANTS CHOISISSENT ZENNSHOP`
- **Titre (H2) :**
  > **Arrêtez de vendre dans le désordre.**  
  > <span className="text-gold-gradient">Vendez avec un vrai système.</span>
- **Sous-titre :**
  > Répondre aux prix en message privé, chercher les captures de paiement dans sa galerie, compter ses articles de tête... Vous perdez du temps et des clients chaque jour. ZennShop transforme votre activité en un commerce moderne, automatisé et serein.

##### Les 4 Raisons Majeures :
1. **Démarrage en 5 minutes :** Votre boutique est prête immédiatement depuis votre smartphone, sans frais d'entrée ni carte bancaire.
2. **Conçu pour le terrain africain :** Mobile Money intégré, prix en FCFA, devises régionales, logistique souple et interface en français.
3. **Votre audience dès le 1er jour :** Votre propre lien à partager à vos clients, plus la force de frappe du marketplace pour en toucher de nouveaux.
4. **Tout piloter sur smartphone :** Commandes, stocks, messages clients et retraits d'argent directement au creux de votre main.

##### Bloc 2 : Le Cockpit Interactif (Les 4 Piliers Fonctionnels)

* **Barre de simulation navigateur :**
  `zennshop.com/boutique/votre-commerce · Live`

* **Onglet 1 : Votre Vitrine Personnalisée**
  - *Titre :* Votre boutique en ligne professionnelle en 5 min
  - *Stat clé :* `< 5 min` *(pour être en ligne)*
  - *Description :* Plus besoin d'agence ni de développeur. Choisissez votre nom, personnalisez vos couleurs et obtenez un lien propre à partager partout.
  - *Points clés :*
    - Lien officiel : `zennshop.com/boutique/votre-nom`
    - Vitrine ultra rapide optimisée pour smartphone
    - Visible sur le marketplace dès le premier jour
    - Compatible avec votre bio Instagram, TikTok et WhatsApp

* **Onglet 2 : Catalogue & Gestion des Stocks**
  - *Titre :* Gérez l'ensemble de vos articles sans erreur
  - *Stat clé :* `0 survente` *(stocks synchronisés)*
  - *Description :* Ajoutez vos produits avec photos HD, prix en FCFA, variantes (tailles, pointures, couleurs) et gérez vos quantités en temps réel.
  - *Points clés :*
    - Variantes complètes : tailles, couleurs, modèles
    - Alertes automatiques de stock faible
    - Promotions et prix barrés en un clic
    - Fiches produits claires avec détails de livraison

* **Onglet 3 : Encaissement & Portefeuille Mobile Money**
  - *Titre :* Encaissez facilement, retirez votre argent instantanément
  - *Stat clé :* `0 FCFA/mois` *(en plan Starter)*
  - *Description :* Vos clients règlent par Wave, Orange Money, MTN, Moov, carte bancaire ou à la livraison. Vos fonds sont sécurisés et retirables à tout moment.
  - *Points clés :*
    - Intégration native Wave, Orange Money, MTN, Moov
    - Paiements sécurisés par carte bancaire
    - Portefeuille marchand sécurisé et transparent
    - Demande de retrait rapide vers votre numéro de téléphone

* **Onglet 4 : Pilotage & Suivi des Commandes**
  - *Titre :* Suivez chaque commande et fidélisez vos clients
  - *Stat clé :* `1 écran` *(pour tout maîtriser)*
  - *Description :* Un tableau de bord clair pour savoir exactement ce que vous vendez, qui sont vos meilleurs clients et quelles commandes doivent être expédiées aujourd'hui.
  - *Points clés :*
    - Suivi en direct : payé, en cours de préparation, livré
    - Historique et coordonnées de chaque client
    - Statistiques de ventes et chiffre d'affaires quotidien
    - Messagerie interne chiffrée avec vos acheteurs

---

### SECTION 5 : Comment ça marche & CTA Final (`FinalCTA.tsx`)

#### A. Diagnostic
- Le parcours en 4 étapes est pertinent et clair.
- En revanche, la mention récurrente du prix Business (*12 500 FCFA/mois*) sous le bouton principal sabote l'onboarding du plan gratuit Starter.

#### B. Texte Réaligné

* **Les 4 Étapes Claires :**
  1. **01. Créez votre compte :** En 30 secondes avec votre adresse e-mail et votre numéro de téléphone.
  2. **02. Personnalisez votre boutique :** Choisissez votre nom, ajoutez votre logo et votre contact WhatsApp.
  3. **03. Ajoutez vos articles :** Téléchargez vos photos, indiquez vos prix et quantités directement depuis votre smartphone.
  4. **04. Commencez à encaisser :** Partagez votre lien, recevez vos commandes et retirez vos gains sur votre Mobile Money.

* **Le Bloc d'Appel à l'Action Final :**
  - *Badge social :* `⚡ L'infrastructure du commerce africain moderne`
  - *Titre H2 :*
    > **Passez au commerce moderne.**  
    > <span className="text-gold-gradient">Votre boutique en ligne prête aujourd'hui.</span>
  - *Sous-titre :*
    > Rejoignez les commerçants et entrepreneurs qui ont structuré leur activité, gagné la confiance de leurs clients et développé leurs ventes avec ZennShop.
  - *Bouton Principal :* `Créer ma boutique gratuitement` *(Lien vers /inscription)*
  - *Bouton Secondaire :* `Consulter les tarifs & formules` *(Lien vers /tarifs)*
  - *Garanties micro-textes :*
    `Sans carte bancaire` · `0 FCFA pour commencer` · `Sans engagement` · `Assistance en français`
  - *Note tarifaire sous le bouton :*
    - *Supprimer la focalisation sur le plan payant 12 500 FCFA.*
    - *Remplacer par :* `Formule Starter gratuite sans limite de temps · Évoluez vers nos outils Business quand votre activité grandit.`

---

### SECTION 6 : Refonte Intégrale de la FAQ (`VisionFAQ.tsx`)

#### A. Diagnostic
- Actuellement, les questions 7, 8 et 9 parlent de banques, de partenariats stratégiques et de levée de fonds.
- **Règle absolue :** La FAQ d'une Landing Page doit répondre aux interrogations légitimes du **commerçant qui veut vendre** et de l'**acheteur qui veut commander**.

#### B. Les 8 Nouvelles Questions/Réponses Indispensables

```markdown
Q1. Est-ce vraiment gratuit pour ouvrir une boutique ?
R1. Oui. Le plan Starter est à 0 FCFA par mois, sans frais d'ouverture et sans aucune carte bancaire requise. Vous pouvez créer votre boutique, ajouter jusqu'à 20 produits et commencer à vendre dès aujourd'hui. Une commission transparente de 5 % est prélevée uniquement sur les ventes finalisées. Si vous ne vendez rien, vous ne payez rien.

Q2. Comment mes clients peuvent-ils payer leurs achats ?
R2. Vos clients peuvent régler leurs commandes instantanément via leurs moyens de paiement habituels : Mobile Money (Wave, Orange Money, MTN, Moov) ou carte bancaire. Vos fonds sont immédiatement crédités et sécurisés sur votre portefeuille vendeur.

Q3. Comment puis-je retirer l'argent de mes ventes ?
R3. Chaque commande validée crédite automatiquement votre portefeuille ZennShop. Vous pouvez demander un retrait vers votre compte Mobile Money (Wave, Orange, MTN, Moov) à tout moment en quelques clics depuis votre espace vendeur.

Q4. Mes clients doivent-ils créer un compte pour commander ?
R4. Non. L'expérience d'achat est pensée pour supprimer toute friction : vos clients cliquent sur votre lien, sélectionnent leurs articles, renseignent leur numéro de téléphone et leur adresse de livraison, et valident leur commande en quelques secondes, sans mot de passe à retenir.

Q5. Quelle est la différence entre ma boutique privée et le Marketplace ?
R5. Vous bénéficiez du meilleur des deux mondes :
1. Une vitrine privée avec votre lien exclusif (zennshop.com/boutique/votre-nom) à partager sur vos réseaux sociaux (WhatsApp, Instagram, TikTok).
2. Vos produits sont également référencés sur le Marketplace public ZennShop pour vous apporter de nouveaux acheteurs qui ne vous connaissaient pas encore.

Q6. Comment se déroule la livraison des produits ?
R6. Vous gardez le contrôle total : vous définissez vos zones de livraison, vos tarifs (standard, express, gratuit dès un certain montant) et vos délais. Lors d'une commande, l'adresse et le numéro du client vous sont immédiatement transmis dans votre espace de gestion pour l'expédition.

Q7. Comment obtenir le badge « Boutique Vérifiée » ?
R7. La confiance est le premier moteur du commerce africain. Pour rassurer vos acheteurs contre les arnaques, vous pouvez soumettre une pièce d'identité ou votre registre de commerce depuis vos paramètres. Une fois validé par notre équipe, le badge doré « Boutique Vérifiée » apparaît sur votre vitrine et sur toutes vos fiches produits.

Q8. Puis-je gérer toute mon activité depuis mon téléphone ?
R8. Absolument. ZennShop a été développé en priorité pour les smartphones : prendre une photo de votre article, renseigner le prix, ajuster votre stock, discuter avec vos clients et demander vos retraits se fait à 100 % depuis le navigateur de votre téléphone, sans rien installer.
```

---

### SECTION 7 : Pied de Page (`Footer.tsx`)

#### A. Diagnostic
- Logo `AC` à remplacer par `ZS`.
- L'e-mail `support@plateforme.com` doit devenir `contact@zennshop.com`.
- Absence de mentions de réassurance commerciale et de transparence locale.

#### B. Texte Réaligné
- **Identité de marque :** Monogramme `ZS` · `ZennShop`.
- **Descriptif sous le logo :**
  > *L'infrastructure du commerce africain moderne. Chaque commerçant trouve sa vitrine, chaque client achète en toute sérénité.*
- **Canal de support officiel :** `contact@zennshop.com`
- **Présence géographique affirmée :** 
  > *Conçu pour l'écosystème commercial africain · Abidjan · Dakar · Douala · Cotonou · Lomé · Bamako*
- **Liens utiles et légaux :**
  - Plateforme : *Marketplace, Recherche, Tarifs*
  - Commerçants : *Créer une boutique, Espace Vendeur, Aide & FAQ*
  - Acheteurs : *Suivre ma commande, Espace Client, Sécurité des paiements*

---

## 5. Grille de Contrôle Philosophique

Avant d'écrire ou de modifier le moindre mot sur la Landing Page, chaque phrase doit passer ce test en 4 questions :

1. **Test de Simplicité :** Un commerçant de marché ou une créatrice vendant depuis chez elle comprend-elle cette phrase sans jargon technique étranger ?
2. **Test d'Ancrage Local :** Fait-on référence aux vrais leviers de la région (Mobile Money, FCFA, WhatsApp, livraison de quartier, badge vérifié) ?
3. **Test de Confiance :** Cette phrase lève-t-elle une crainte (peur de l'arnaque, crainte des frais bancaires cachés, blocage technique) ?
4. **Test de Vérité :** Ce qui est promis sur la Landing Page est-il rigoureusement codé et fonctionnel dans l'application ?

---

## 6. Prochaines Étapes d'Exécution

1. **Validation du document :** Vous pouvez annoter ou ajuster ce document Markdown selon vos préférences de tonalité.
2. **Application chirurgicale :**
   - Remplacement du monogramme `AC` par `ZS` et nettoyage des emails dans `Navbar.tsx` et `Footer.tsx`.
   - Mise à jour des textes du Hero (`HomeHero.tsx`) et fiabilisation des compteurs/particules.
   - Refonte des 4 onglets du Cockpit vendeur et correction des URLs dans `UnifiedValueProp.tsx`.
   - Remplacement complet des questions de la FAQ dans `VisionFAQ.tsx`.
   - Alignement des promesses tarifaires dans `FinalCTA.tsx`.
   - [x] **Composants d'animation (`Reveal.tsx`)** : Remplacement des décalages trop amples (16px -> 10px) et des marges de déclenchement pour une réactivité instantanée sur mobile sans écran blanc lors du défilement rapide.
   - [x] **Système d'onglets (`UnifiedValueProp.tsx`)** : Élimination du glissement horizontal gauche-droite (`x: 24`) au profit d'un fondu vertical subtil (`y: 8 -> 0` en 200ms) sans débordement ni saccade. Suppression du délai décalé de 80ms sur les puces pour affichage immédiat. Suppression du titre résiduel "Ce que vous obtenez".
   - [x] **Accordéon FAQ (`VisionFAQ.tsx`)** : Remplacement de l'animation CSS `max-h-96` (sujette aux retards lors de la fermeture) par une transition native pure `grid-rows-[0fr] -> grid-rows-[1fr]` fluide à 60/120fps sur tous les téléphones.
   - [x] **Transitions entre sections** : Adoucissement des jonctions entre sections sombres et le Marketplace fond papier via des dégradés subtils.
   - [x] **Micro-interactions tactiles** : Ajout de retours tactiles (`active:scale-[0.98]`) sur tous les boutons d'action (Hero, Tabs, CTA final, FAQ). Suppression des délais artificiels (`delay-700`, `delay-1000`) dans le Hero.
3. **Passage au volet suivant :** Une fois la Landing Page assainie, passage au scan et à l'optimisation du volet suivant (Marketplace ou Cockpit Vendeur).
