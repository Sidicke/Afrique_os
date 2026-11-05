# ZennShop — Charte & Guide du Système Logo (« Nexus Z »)

> **Votre commerce en pleine lumière — Du commerce dispersé au commerce connecté.**

---

## 1. Concept & Construction Géométrique (« Nexus Z »)

Le symbole **Nexus Z** de ZennShop est construit sur une grille géométrique exacte de `256 × 256` unités (`stroke` nul, 100 % chemins fermés, audit `svg_audit.py` : **100 / 100**).

- **Double Chevron Imbriqué à 45° (Symétrie de rotation à 180°)** :
  - **Chevron supérieur (`Zenn`)** : représente la **vitrine privée souveraine** du commerçant (son identité propre, son catalogue maîtrisé).
  - **Chevron inférieur (`Shop`)** : représente le **marketplace connecté** et le flux d'acheteurs qualifiés.
  - **Canal diagonal d'échange (espace négatif à 45°)** : incarne le **canal direct de confiance** (messagerie dédiée par commande, Mobile Money, paiement séquestre, suivi unifié).
- **Alignement optique des extrémités** : les 4 bords externes gauche/droite tombent sur deux colonnes verticales exactes (`x = 44..45` et `x = 211..212`), ce qui confère au monogramme la carrure architecturale d'un poinçon d'orfèvre sans nécessiter de cadre enfermant (aucun effet « boîte dans la boîte » dans les badges UI `rounded-xl`).
- **3 Coupes Optiques dédiées** :
  1. **Standard (`std`)** : pour fonds clairs (`Papier & Or`).
  2. **Inversée anti-irradiation (`rev`)** : canal central élargi de `+3.5 u` pour compenser le halo lumineux des teintes `ivory-50` et `gold-400` sur fond `midnight-950`.
  3. **Micro-taille (`small`)** : fûts épaissis (`52 u`) et canal élargi (`40 u`) pour une lisibilité chirurgicale de `16 px` (favicon) à `28 px`.

---

## 2. Les 6 Jeux de Couleurs Adaptatifs (100 % alignés sur `globals.css`)

| Jeu (`tone`) | Usage recommandé (Pages ZennShop) | Fond cible | Chevron Haut (`Zenn`) | Chevron Bas (`Shop`) | Contraste WCAG |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`light`** *(Papier & Or)* | Espace Vendeur, Espace Client, Admin, Boutique publique, Auth mobile | `#f6f8fb` (`--paper`), `#ffffff`, `#f7f2e8` (`--gold-wash`) | `#0b1626` (`ink-950`) | `#8f7c59` (`gold-600`) | **18.1 : 1** (AAA) |
| **`dark`** *(Nuit & Or)* | Landing Page, Navbar, Footer, Panneau marque Auth desktop | `#070f1a` (`midnight-950`), `#0b1626` (`midnight-900`) | `#f5f0eb` (`ivory-50`) | `#c4b697` (`gold-400`) | **17.0 : 1** / **9.6 : 1** |
| **`gold-duo`** *(Or Impérial)* | Cartes VIP, bannières prestige, plans Pro / Entreprise | `#070f1a` (`midnight-950`), `#101e33` (`midnight-800`) | `#d8cdb8` (`gold-300`) | `#a89674` (`gold-500`) | **12.2 : 1** / **6.8 : 1** |
| **`african`** *(Émeraude & Or)* | Paiement Mobile Money, badges « Marchand Vérifié », confiance | `#f5f0eb` (`ivory-50`), `#f7f2e8` (`gold-wash`) | `#2d6a4f` (`african-green`) | `#8f7c59` (`gold-600`) | **6.1 : 1** (AA+) |
| **`terracotta`** *(Terre & Encre)* | Collections artisanales, éditorial Afrique, temps forts | `#f5f0eb` (`ivory-50`), `#ede5db` (`ivory-100`) | `#0b1626` (`ink-950`) | `#c87a5a` (`terracotta`) | **16.7 : 1** (AAA) |
| **`mono`** / **`ink`** / **`white`** | Factures PDF, tampons, filigranes, gravure, impression 1 couleur | Tout fond clair ou sombre | `#0b1626` ou `#ffffff` | `#0b1626` ou `#ffffff` | **18.1 : 1** |

---

## 3. Zone de Protection & Tailles Minimales

- **Zone d'exclusion (Clear Space)** : laisser tout autour du logo un espace libre au moins égal à **`0.5 × H`** (où `H` est la hauteur du symbole `Nexus Z`), soit `2×` l'épaisseur d'un fût.
- **Tailles minimales** :
  - **Symbole seul (`symbol-small`)** : `16 × 16 px` (favicon, onglet navigateur).
  - **Badge UI (`variant="badge"`)** : `36 × 36 px` (`h-9 w-9` dans la Navbar / Topbar Client).
  - **Lockup Horizontal (`variant="horizontal"`)** : `110 px` de large (`28 px` de haut).
  - **Lockup Empilé (`variant="stacked"`)** : `72 px` de large.

---

## 4. Intégration React / Next.js (`<ZennShopLogo />`)

Le composant officiel est disponible dans `frontend/src/components/brand/ZennShopLogo.tsx` :

```tsx
import { ZennShopLogo } from "@/components/brand/ZennShopLogo";

// 1. Lockup horizontal complet sur fond clair (Papier & Or)
<ZennShopLogo variant="horizontal" tone="light" className="h-8 w-auto" />

// 2. Lockup horizontal complet sur fond sombre (Nuit & Or)
<ZennShopLogo variant="horizontal" tone="dark" className="h-9 w-auto" />

// 3. Badge d'en-tête avec effet verre doré au survol (Navbar, Footer, Auth desktop)
<ZennShopLogo variant="badge" badgeStyle="dark-glass" badgeClassName="h-10 w-10 rounded-xl" />

// 4. Badge Espace Vendeur (fond Gold Wash -> Gold Mid au survol)
<ZennShopLogo variant="badge" badgeStyle="gold-wash" badgeClassName="h-10 w-10 rounded-xl" />

// 5. Badge Espace Client / Admin (fond Midnight 950)
<ZennShopLogo variant="badge" badgeStyle="midnight" badgeClassName="h-10 w-10 rounded-xl" />

// 6. Symbole seul avec jeu de couleurs Émeraude & Or ou Terracotta
<ZennShopLogo variant="symbol" tone="african" className="h-8 w-8" />
<ZennShopLogo variant="symbol" tone="terracotta" className="h-8 w-8" />
```

---

## 5. Inventaire Complet des Fichiers Générés

- **Planche Showcase & Concepts (PNG & SVG)** :
  - `/home/aboubakar/Projet/branding/logo/zennshop-logo-showcase.png`
  - `/home/aboubakar/Projet/branding/logo/zennshop-logo-showcase.svg`
  - `/home/aboubakar/Projet/branding/logo/concepts.png`
- **Planches HTML Interactives** :
  - `/home/aboubakar/Projet/branding/logo/presentation.html` *(Présentation client 5 slides)*
  - `/home/aboubakar/Projet/branding/logo/preview.html` *(Feuille de test multi-tailles & multi-fonds)*
- **42 Masters SVG Vectoriels** :
  - `/home/aboubakar/Projet/branding/logo/final/svg/zennshop-{horizontal,stacked,symbol,symbol-small,wordmark}-{light,dark,gold-duo,african,terracotta,ink,black,white,gold}.svg`
- **Exports PNG Haute Résolution (1024 px)** :
  - `/home/aboubakar/Projet/branding/logo/final/png/zennshop-{horizontal,stacked,symbol}-{light,dark}.png`
- **Icônes Web, PWA & Réseaux Sociaux** :
  - `/home/aboubakar/Projet/branding/logo/final/icons/favicon.ico` *(multi-tailles 16/32/48 px)*
  - `/home/aboubakar/Projet/branding/logo/final/icons/icon.svg`
  - `/home/aboubakar/Projet/branding/logo/final/icons/apple-touch-icon.png` *(180×180)*
  - `/home/aboubakar/Projet/branding/logo/final/icons/icon-192.png` & `icon-512.png`
  - `/home/aboubakar/Projet/branding/logo/final/icons/maskable-512.png`
  - `/home/aboubakar/Projet/branding/logo/final/icons/social-avatar-1024.png`
