# Règles de Sécurité et de Confidentialité

## 1. Interdiction stricte d'accéder aux fichiers de clés et secrets sans autorisation
- **NE JAMAIS lire, afficher, rechercher (`grep`/`cat`) ni modifier** des fichiers contenant des clés API, mots de passe, tokens ou variables d'environnement privées (notamment `.env`, `.env.*`, `cleapi.md`, `mdp.md`, ou tout fichier de secrets) **sans avoir demandé et obtenu l'accord explicite de l'utilisateur au préalable**.
- Pour configurer ou documenter des variables d'environnement, travailler **exclusivement** sur les fichiers modèles publics (`.env.example`, `.env.local.example`) et fournir les instructions à l'utilisateur pour qu'il mette à jour ses fichiers privés lui-même.
- Vérifier systématiquement que tout fichier de clés ou de secrets signalé est bien présent dans `.gitignore` afin d'éviter toute fuite dans Git.
