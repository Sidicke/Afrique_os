const fs = require('fs');
let sessionTs = fs.readFileSync('src/lib/api/session.ts', 'utf8');

// Replace persist logic to use localStorage instead of sessionStorage
sessionTs = sessionTs.replace(
  `        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(current));`,
  `        window.localStorage.setItem(SESSION_KEY, JSON.stringify(current));`
);

sessionTs = sessionTs.replace(
  `        window.sessionStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(SESSION_KEY);`,
  `        window.localStorage.removeItem(SESSION_KEY);`
);

// Replace read logic to use localStorage
const oldRead = `    // Migration sécurisée : privilégie sessionStorage (effacé à la fermeture de l'onglet)
    const raw =
      window.sessionStorage.getItem(SESSION_KEY) ||
      window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.accessToken !== "string" || !parsed.user) return null;

    // Nettoie l'ancien localStorage si présent
    if (window.localStorage.getItem(SESSION_KEY)) {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.setItem(SESSION_KEY, raw);
    }`;

const newRead = `    // Lecture depuis localStorage pour partager la session entre les onglets
    let raw = window.localStorage.getItem(SESSION_KEY);
    // Rétrocompatibilité si c'était dans sessionStorage
    if (!raw) {
      raw = window.sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        window.localStorage.setItem(SESSION_KEY, raw);
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.accessToken !== "string" || !parsed.user) return null;`;

sessionTs = sessionTs.replace(oldRead, newRead);
fs.writeFileSync('src/lib/api/session.ts', sessionTs);
