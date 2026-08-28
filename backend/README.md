# Backend — Plateforme e-commerce multi-vendeur

API **NestJS** (TypeScript) de la plateforme, conforme aux décisions d'architecture
(`docs/architecture/`). Le frontend Next.js (`plateforme/`) consomme cette API :
REST pour les opérations classiques, **WebSocket** (Socket.IO) pour la messagerie
acheteur ↔ vendeur en temps réel.

## Stack

| Élément | Choix |
|---|---|
| Framework | NestJS 11 (Node 24, TypeScript) |
| Base de données | PostgreSQL 16 (Docker) |
| ORM | Prisma 6 |
| Auth | JWT access (15 min) + refresh token **cookie httpOnly** (7 j) avec rotation |
| Sécurité | Helmet, CORS strict, validation stricte (whitelist), rate limiting (`@nestjs/throttler`) |
| Temps réel | WebSocket natif Socket.IO — **sans Redis** (mono-instance, conforme aux docs) |
| Docs API | Swagger sur `/api/docs` |

## Démarrage rapide

```bash
# 1. Base de données (PostgreSQL 16 dans Docker)
docker-compose up -d postgres  # ou npm run db:up

# 2. Variables d'environnement
cp .env.example .env

# 3. Migration + seed
npx prisma migrate deploy
npm run prisma:seed

# 4. Lancer l'API (http://localhost:3000/api/v1)
npm run start:dev

# 5. Tests e2e (PostgreSQL requis)
npm run test:e2e
```

### Comptes de démo (seed)

| Rôle | Boutique | Email | Mot de passe |
|---|---|---|---|
| Super Admin | — | `admin@plateforme.com` | `admin1234` |
| Vendeur | `aziz-tech` (Aziz Tech, active) | `vendeur@aziztech.com` | `vendeur1234` |
| Vendeur | `wax-style` (Wax & Style) | `vendeur@waxstyle.com` | `vendeur1234` |
| Vendeur | `beaute-naturelle` (Beauté Naturelle) | `vendeur@beautenaturelle.com` | `vendeur1234` |
| Vendeur | `maison-du-cuir` (Maison du Cuir, **PENDING** vérification) | `vendeur@maisonducuir.com` | `vendeur1234` |
| Client | — | `client@demo.com` / `client@plateforme.fr` | `client1234` |
| Vendeur (test) | `test-shop` | `teste@plateforme.com` | `test1234` |

Ports : API sur `3000` (`/api/v1`, Swagger `/api/docs`), frontend sur `3001`,
PostgreSQL sur `5432` (local ou Docker — conteneur `platforme-postgres` mappé 5432:5432). Voir le [README racine](../README.md) pour le
tableau complet des accès de vérification.

## Architecture des modules

```
src/
├── app.module.ts          # Module racine + guards globaux (JWT, Rôles, Throttler)
├── main.ts                # Helmet, CORS, ValidationPipe, préfixe /api/v1, Swagger
├── prisma/                # PrismaService (connexion partagée)
├── common/                # @Public, @Roles, @CurrentUser, JwtAuthGuard, RolesGuard, WsAuthGuard
├── auth/                  # register, login, refresh (cookie), logout — rate limiting
├── users/                 # GET/PATCH /users/me (profil MerchantProfile)
├── boutiques/             # Multi-vendeur : cycle de vie + BoutiqueOwnerGuard
├── categories/            # Catégories par boutique (admin + vitrine publique)
├── products/              # Produits/variantes/avis (admin + catalogue public)
├── orders/                # Commandes : total recalculé serveur, stock, statuts
├── notifications/         # Notifications vendeur (annulation client, …)
├── dashboard/             # Overview, stats par période, clients (agrégations)
├── messaging/             # WebSocket (Gateway) + REST (conversations, historique)
├── admin/                 # Console Super Admin (23 endpoints, tout @Roles('ADMIN')) :
│                          #   overview, verification, stores, users, orders, subscriptions,
│                          #   analytics, moderation, settings globaux, notes internes, profil
└── newsletter/            # Inscription/désinscription à la newsletter
```

### Modèle de données (extraits)

- **User** — compte de base (`ADMIN`, `VENDEUR`, `CLIENT`), possède 1..N **Boutique**
- **Boutique** — statut `PENDING → ACTIVE → SUSPENDED → CLOSED`, config vitrine complète
  (identité, contacts, visuels, packs de livraison, promotions, notifications)
- **Product / Variant / Review / Category** — catalogue scopé boutique
- **Order / OrderItem** — statuts `pending | paid | shipping | delivered | cancelled`,
  paiements `mobile_money | cash_on_delivery | card | whatsapp_direct` (contrats frontend)
- **Conversation / Message** — messagerie persistant en base, historique garanti
- **Module admin** — `Plan`, `Subscription`, `ModerationReport`, `AdminLog` (journal d'audit),
  `AdminNote` (notes internes), `VerificationDocument`, `PlatformSettings`, `User.status`

### Isolation des données (multi-vendeur)

Tout accès vendeur passe par `BoutiqueOwnerGuard` : la boutique du paramètre
(`:boutiqueId` ou `:id`) doit appartenir à `req.user.id`, sinon **403**.
Les requêtes Prisma sont systématiquement scopées `where: { boutiqueId }`.

## Endpoints principaux

### Auth (`/api/v1/auth`)
| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | Inscription (VENDEUR : + boutique PENDING · CLIENT : compte acheteur) |
| POST | `/auth/login` | Connexion → accessToken + refresh en cookie httpOnly |
| POST | `/auth/refresh` | Nouvel access token via le cookie (rotation) |
| POST | `/auth/logout` | Révoque le refresh token |

### Boutiques (`/api/v1/boutiques`)
| Méthode | Route | Accès |
|---|---|---|
| POST | `/boutiques` | VENDEUR — crée une boutique (PENDING) |
| GET | `/boutiques/my` | VENDEUR — ses boutiques |
| PATCH | `/boutiques/:id` | Propriétaire — mise à jour |
| PATCH | `/boutiques/:id/status` | ADMIN — cycle de vie |
| GET | `/boutiques/public/:slug` | Public — profil complet vitrine (config + produits + catégories) |

### Catalogue public (vitrine)
| Méthode | Route |
|---|---|
| GET | `/products/public/boutique/:slug?category=&search=&minPrice=&maxPrice=&sort=&page=&limit=` |
| GET | `/products/public/boutique/:slug/:id` |
| GET | `/products/public/whatsapp-link?boutiqueSlug=&productId=` |
| GET | `/categories/public/:slug` |
| POST | `/orders/boutique/:boutiqueId` — création commande (total recalculé serveur) |
| POST | `/newsletter/subscribe/:slug` |

### Dashboard vendeur (Bearer token)
| Méthode | Route |
|---|---|
| GET | `/dashboard/boutique/:boutiqueId/overview` |
| GET | `/dashboard/boutique/:boutiqueId/stats?period=7_days\|30_days\|this_year` |
| GET | `/dashboard/boutique/:boutiqueId/customers` |
| GET/POST | `/products/boutique/:boutiqueId` (+ `/products/boutique/:boutiqueId/:id`) |
| GET/PATCH | `/orders/boutique/:boutiqueId` (+ `/orders/boutique/:boutiqueId/:id/status`) |
| GET | `/categories/boutique/:boutiqueId` |
| GET | `/users/me` |
| GET | `/notifications/boutique/:boutiqueId` |
| GET | `/notifications/boutique/:boutiqueId/unread-count` |
| POST | `/notifications/boutique/:boutiqueId/:id/read` |
| POST | `/notifications/boutique/:boutiqueId/read-all` |
| DELETE | `/notifications/boutique/:boutiqueId` (tout supprimer) |

## Messagerie temps réel (sans Redis)

**WebSocket** — namespace `/messaging`, authentifié au **handshake** par JWT
(middleware Socket.IO : connexion **refusée** si le token est absent/invalide,
`WsAuthGuard` en seconde ligne sur chaque handler)
(`auth.token` ou header `Authorization`). Un socket invalide est déconnecté.

| Événement (client → serveur) | Payload |
|---|---|
| `joinConversation` | `{ conversationId }` |
| `sendMessage` | `{ conversationId, content }` |
| `typing` | `{ conversationId, isTyping }` |

**Événement serveur → client** : `newMessage { conversationId, message }`

Les messages sont **persistés en base avant diffusion** (`MessagingService.addMessage`) :
si le destinataire est hors ligne, il les retrouve dans son historique à la reconnexion.

**REST complémentaire** : `GET /conversations`, `POST /conversations/start/:boutiqueId`,
`GET /conversations/:id/messages?cursor=&limit=`, `POST /conversations/:id/messages`,
`POST /conversations/:id/read`.

> Conforme aux docs : tant que l'application tourne sur une seule instance, les
> clients connectés sont gérés en mémoire (rooms Socket.IO). Le jour où le backend
> scale sur plusieurs instances, on branche l'adaptateur Redis (pub/sub) sans
> réécrire la logique métier.

## Notifications vendeur

La **cloche du dashboard** liste les événements importants de la boutique,
chacun avec un type distinct :

| Type | Déclencheur | Contenu |
|---|---|---|
| `new_order` | Nouvelle commande créée | N° + client + montant |
| `order_cancelled` | Annulation par le client | N° + **motif** saisi |
| `new_message` | Le CLIENT écrit à la boutique | Nom du client + début du message |
| `low_stock` | Produit/variante tombe à 0 | Nom du produit (plusieurs regroupés) |

- **Création** : fire-and-forget dans `orders.service.create` (`new_order` +
  `low_stock`, détecté dans la transaction lors du décrément du stock) et
  `orders.service.cancelByCustomer` (`order_cancelled`) ; dans
  `messaging.service.addMessage` (`new_message`, uniquement quand l'expéditeur
  est un **CLIENT** — le vendeur ne se notifie pas lui-même). Un échec de
  création ne remet jamais en cause l'opération métier.
- **Préférences par type** : chaque type peut être **activé/désactivé** dans
  Paramètres → Notifications (champ JSON `notifications` de la boutique,
  éditée via `PATCH /boutiques/:id`). `NotificationsService.create` vérifie la
  préférence du type avant de créer : désactivé → aucune notification. Une
  préférence **absente** est traitée comme activée (rétrocompatibilité).
- **Isolation** : toutes les routes passent par `BoutiqueOwnerGuard` — un
  vendeur ne voit que les notifications de **sa** boutique (403 sinon).
- **Purge automatique (30 jours)** : les notifications de plus de
  `NOTIFICATION_RETENTION_DAYS` (défaut 30) sont supprimées **paresseusement**
  à chaque accès (`create` / `findAll` / `unread-count`) — aucune tâche
  planifiée requise, la première lecture après 30 jours nettoie. La purge ne
  jette jamais (elle ne peut pas casser l'événement qui l'a déclenchée).
- **« Tout supprimer »** : `DELETE /notifications/boutique/:boutiqueId` vide le
  panneau de la boutique (bouton du panneau, après confirmation côté front).
- **Modèle** : `Notification` (boutiqueId, type, title, message?, orderReference?,
  readAt?, createdAt).

## Sécurité

- **Access token** : 15 min, envoyé dans `Authorization: Bearer <token>`.
- **Refresh token** : 7 jours, cookie `httpOnly` (inaccessible au JS → protection XSS),
  rotation à chaque renouvellement (réutilisation détectée → session révoquée).
- **Guards globaux** : toutes les routes exigent un JWT valide, `@Public()` les
  contourne, `@Roles('VENDEUR','ADMIN')` restreint par rôle.
- **Validation** : `class-validator` + `class-transformer`, `whitelist: true`,
  `forbidNonWhitelisted: true` (champs inconnus rejetés).
- **Rate limiting** : limite globale configurable (`.env`), limites renforcées sur
  `login` (10/min), `register` (5/min), newsletter (10/min).
- **Helmet + CORS strict** : seule l'origine du frontend (`CORS_ORIGINS`) est acceptée,
  `credentials: true` pour le cookie.

## E-mail transactionnel (Resend)

Trois e-mails, tous en **dry-run** sans `RESEND_API_KEY` et **fire-and-forget**
(un échec d'envoi ne casse jamais l'opération) :

1. **Confirmation de commande au client** — quand le paiement est validé
   (`PATCH /orders/boutique/:id/:orderId/status` → `PAID`) :
   sujet « Votre commande #AC-… est confirmée », en-tête verte, récapitulatif
   complet, mention du contact de la boutique. Envoyé uniquement à la **transition**
   (pas de doublon si le statut est re-affecté) et si `customerEmail` renseigné.
2. **Confirmation d'annulation au client** (si `customerEmail` renseigné,
   `PATCH /orders/boutique/:id/:orderId/cancel`) : sujet
   « Votre commande #AC-… a été annulée », récapitulatif complet, motif rappelé.
3. **Alerte au vendeur** (si la boutique a un `email`) : sujet
   « Commande #AC-… annulée par <client> », destinataire = e-mail de la
   boutique, avec client + téléphone + **motif** + récapitulatif (articles
   remis en stock).

Le **motif d'annulation optionnel** (`reason`) saisi par le client est stocké
sur la commande (`cancellationReason`), rappelé dans les e-mails d'annulation,
et exposé au vendeur (liste Commandes + commandes récentes du dashboard).

- **Provider** : [Resend](https://resend.com) — SDK Node, gratuit en démarrage.
- **Dry-run** : sans `RESEND_API_KEY`, aucun e-mail n'est envoyé (log en
  console) — le reste de l'application fonctionne normalement (dev, tests).
- **Fire-and-forget** : un échec d'envoi ne remet jamais en cause l'annulation.
- **`MAIL_FROM`** doit être un domaine **vérifié** chez Resend
  (⚠️ `onboarding@resend.dev` ne livre que vers votre propre boîte).

```bash
# .env
RESEND_API_KEY=re_xxx
MAIL_FROM=noreply@votre-domaine.com
MAIL_FROM_NAME=Aziz Tech
```

## Tests

```bash
npm run test:unit         # 27 tests unitaires (MailService : contenus client/vendeur/confirmation, dry-run, résilience SDK)
npm run test:e2e          # 96 tests — auth, boutiques (isolation), catalogue/commandes, messagerie (WS), e-mails, notifications vendeur, admin (overview, vérification, boutiques, utilisateurs, commandes, abonnements, modération)
npm run lint:check        # ESLint (0 erreur)
npm run build             # Compilation (0 erreur)
```

Les tests e2e couvrent notamment :
- rotation du refresh token (cookie httpOnly) et révocation au logout
- isolation multi-vendeur (403 sur la boutique d'un autre)
- cycle de vie des boutiques (transitions valides/invalides)
- total de commande **recalculé côté serveur** (le client ne force pas le prix)
- décrément de stock à la commande
- **WebSocket** : diffusion d'un message en temps réel + persistance vérifiée en REST

## ✅ Branchement du frontend — TERMINÉ

Le frontend Next.js (`frontend/`) est **entièrement branché sur cette API**
(plus de mocks) : chaque surface du dashboard, de l'authentification, de la
vitrine et de la messagerie passe par la couche `frontend/src/lib/api/`.

| Couche frontend | Endpoint backend |
|---|---|
| `dashboardService.getOverview()` | `GET /dashboard/boutique/:id/overview` |
| `dashboardService.getOrders()` | `GET /orders/boutique/:id` |
| `dashboardService.getProducts()` | `GET /products/boutique/:id` |
| `dashboardService.getCustomers()` | `GET /dashboard/boutique/:id/customers` |
| `dashboardService.getStats(period)` | `GET /dashboard/boutique/:id/stats?period=` |
| `dashboardService.getSettings()` | `GET /boutiques/:id` |
| `dashboardService.updateSettings()` | `PATCH /boutiques/:id` |
| `dashboardService.updateOrderStatus()` | `PATCH /orders/boutique/:id/:orderId/status` |
| `dashboardService.addProduct()` | `POST /products/boutique/:id` |
| `accountStore.registerAccount()` | `POST /auth/register` + `POST /auth/login` |
| `customerStore.placeCustomerOrder()` | `POST /orders/boutique/:id` |
| `customerStore.cancelCustomerOrder()` | `PATCH /orders/boutique/:id/:orderId/cancel` |
| `customerStore.fetchOrderByReference()` | `GET /orders/boutique/:id/reference/:ref` |
| `useMessaging` (REST + WS) | `GET /conversations` · `POST /conversations/start/:boutiqueId` · WS `/messaging` |
| `useNotifications` (cloche) | `GET /notifications/boutique/:id` (+ read / read-all / delete) |
| `newsletterSubscribe()` (vitrine) | `POST /newsletter/subscribe/:slug` |
| `PublicShopLoader` (vitrine) | `GET /boutiques/public/:slug` (repli local si backend injoignable) |

> Les replis locaux restants (`shopConfig.ts`, `catalogueStore.ts`) servent
> uniquement de **cache/fallback hors-ligne** — la source de vérité est le backend.
