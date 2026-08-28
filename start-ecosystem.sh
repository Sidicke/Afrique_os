#!/bin/bash

# Définition des couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Lancement de l'écosystème Afrique Commerce OS...${NC}\n"

# 1. Gérer le conflit de port PostgreSQL
echo -e "${YELLOW}🔍 Vérification du port 5432...${NC}"
if ss -tln 2>/dev/null | grep -q ":5432 " ; then
    echo -e "${YELLOW}⚠️  Le port 5432 est utilisé (probablement par le PostgreSQL de votre système).${NC}"
    echo -e "${YELLOW}🛑 Tentative d'arrêt du service local (votre mot de passe administrateur sera demandé) :${NC}"
    sudo systemctl stop postgresql || echo -e "${RED}❌ L'arrêt a échoué. Le lancement de Docker risque d'échouer.${NC}"
else
    echo -e "${GREEN}✅ Port 5432 libre.${NC}"
fi

# 2. Lancer la base de données avec Docker
echo -e "\n${YELLOW}🐳 Démarrage de la base de données (Docker)...${NC}"
cd backend || exit
docker compose down
docker compose up -d

echo -e "${YELLOW}⏳ Attente de l'initialisation de la base de données (5s)...${NC}"
sleep 5

# 3. Générer le client Prisma et appliquer les migrations
echo -e "\n${YELLOW}🗄️  Mise à jour de la base de données (Prisma)...${NC}"
npx prisma generate
npx prisma db push --accept-data-loss

# 4. Lancement des serveurs en parallèle
echo -e "\n${GREEN}🔥 Lancement du Backend et du Frontend...${NC}"

# Lancer le backend en arrière-plan
npm run start:dev &
BACKEND_PID=$!
echo -e "⚙️  Backend démarré (PID: $BACKEND_PID)"

# Aller dans le frontend et le lancer en arrière-plan
cd ../frontend || exit
npm run dev -- -p 3001 &
FRONTEND_PID=$!
echo -e "🎨 Frontend démarré (PID: $FRONTEND_PID)"

echo -e "\n${GREEN}✅ Écosystème en cours d'exécution !${NC}"
echo -e "👉 Frontend : http://localhost:3001"
echo -e "👉 Backend  : http://localhost:3000/api/docs"
echo -e "\n${RED}🛑 Appuyez sur CTRL+C pour tout arrêter proprement.${NC}"

# Intercepter le CTRL+C pour tuer les deux processus Node
trap "echo -e '\n${RED}🛑 Arrêt des serveurs...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Attendre indéfiniment que les processus se terminent
wait $BACKEND_PID $FRONTEND_PID
