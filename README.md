# 🌍 ZennShop (v2)

Plateforme e-commerce et marketplace modulaire, multi-vendeurs et haute performance conçue pour l'écosystème commercial africain (Mobile Money, paiements FedaPay, messagerie chiffrée, gestion de stocks temps réel et vitrines marchandes).

---

## 🏗️ Architecture Technique

```text
ZennShop_v2/
├── backend/                  # API REST & WebSockets (NestJS 11, Prisma 6.19, PostgreSQL)
│   ├── src/                  # Contrôleurs, services, modules & cryptographie
│   ├── prisma/               # Schéma de base de données & migrations
│   └── test/                 # Suites de tests E2E, sécurité & stress benchmark
│
├── frontend/                 # Application Web & Vitrines (Next.js 16.3 Turbopack, React 19, TailwindCSS)
│   ├── src/app/              # App Router (Marketplace, Boutiques, Espaces Marchands/Clients/Admin)
│   ├── src/components/       # Composants UI, recherche intelligente (SearchAutocomplete), vitrines
│   └── public/               # Assets et médias optimisés
│
├── AUDIT_SECURITE.md         # Rapport d'audit de sécurité complet (Score: 99.8/100)
├── RAPPORT_GENERAL_SECURITE_ET_AMELIORATIONS.md # Bilan général et guide de production
└── start-ecosystem.sh        # Script de démarrage unifié
```

---

## 🔐 Sécurité & Chiffrement de Bout en Bout

* **Messagerie Chiffrée (AES-256-GCM) :** Zéro message stocké en clair en base de données. Chaque message est protégé avec un vecteur d'initialisation unique (IV de 96 bits) et un tag d'authentification de 128 bits anti-falsification.
* **Isolation Multi-Boutiques (Anti-BOLA / IDOR) :** Gardes stricts empêchant tout vendeur ou client d'accéder aux données d'autrui (`BoutiqueOwnerGuard` ➔ `403 Forbidden`).
* **Protection Anti-Concurrence (Anti-Race Condition) :** Transactions atomiques isolées (`$transaction`) garantissant l'absence de double-dépense sur les retraits de portefeuille et de survente sur les stocks.
* **Paiements Sécurisés :** Validation des webhooks FedaPay par signature cryptographique HMAC SHA-256 à temps constant.
* **Protection Anti-DDoS :** Throttler actif (`ThrottlerGuard` ➔ `429 Too Many Requests`) bloquant les attaques de force brute et le scraping intensif.

---

## ⚡ Performance & Capacité en Charge

* **Débit Brut Moteur :** **~345 requêtes / seconde** sur une seule instance Node.js.
* **Capacité Simultanée :** **1 750 à 3 500 utilisateurs actifs en même temps** (~70 000 à 120 000 visites uniques par jour).
* **Latence Médiane :** **114 ms à 275 ms**.
* **Empreinte Mémoire :** Inférieure à **150 MB** de RAM sous forte charge.

---

## 🚀 Démarrage Rapide (Développement Local)

### 1. Prérequis
* **Node.js :** 20+ ou 24
* **npm :** 10+
* **PostgreSQL :** 15+ (ou SQLite en local)

### 2. Installation des Dépendances

```bash
# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### 3. Variables d'Environnement
Copiez les fichiers `.env.example` vers `.env` :

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local  # ou configurez NEXT_PUBLIC_API_URL
```

### 4. Lancement des Serveurs

```bash
# Terminal 1 : Backend (Port 3000)
cd backend
npm run start:dev

# Terminal 2 : Frontend (Port 3001)
cd frontend
npm run dev
```

---

## 🧪 Exécution des Tests

```bash
# Tests de Sécurité E2E (BOLA, Race conditions, RBAC)
cd backend
npx jest --config ./test/jest-e2e.json security-resilience.e2e-spec.ts

# Tests de Chiffrement AES-256-GCM
npx jest --config ./test/jest-e2e.json message-encryption.e2e-spec.ts

# Tests de Résistance & Stress Testing
npx jest --config ./test/jest-e2e.json rate-limiting-stress.e2e-spec.ts
```

---

## 📜 Rapports et Documentation
- [Rapport Général de Sécurité et Améliorations](RAPPORT_GENERAL_SECURITE_ET_AMELIORATIONS.md)
- [Audit de Sécurité et Scorecard](AUDIT_SECURITE.md)
