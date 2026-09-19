const fs = require('fs');
let content = fs.readFileSync('src/components/ui/BackButton.tsx', 'utf8');

if (!content.includes('import { getSessionUser }')) {
    content = content.replace('import { cn } from "@/lib/utils";', 'import { cn } from "@/lib/utils";\nimport { getSessionUser } from "@/lib/api/session";');
}

const newGoBack = `  const goBack = () => {
    if (typeof window !== "undefined") {
      // Pour éviter de retourner sur un site externe (Google etc.), on vérifie si
      // on peut intelligemment forcer le fallback applicatif pour un utilisateur connecté.
      // S'il n'y a pas d'historique local fiable, on utilise le fallback.
      if (window.history.length > 2) {
        router.back();
      } else {
        const user = getSessionUser();
        if (user?.role === "CLIENT") {
          router.push("/espace-client");
        } else if (user?.role === "ADMIN" || user?.role === "VENDEUR") {
          router.push("/espace-admin");
        } else {
          router.push(fallbackUrl);
        }
      }
    }
  };`;

content = content.replace(/  const goBack = \(\) => \{\n    if \(typeof window !== "undefined" && window\.history\.length > 1\) \{\n      router\.back\(\);\n    \} else \{\n      router\.push\(fallbackUrl\);\n    \}\n  \};/g, newGoBack);

fs.writeFileSync('src/components/ui/BackButton.tsx', content);
