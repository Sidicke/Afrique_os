const fs = require('fs');

let pageTs = fs.readFileSync('src/app/espace-vendeur/mes-boutiques/page.tsx', 'utf8');

// We need to change the Link "Gérer" into a button that calls switchActiveBoutique
pageTs = pageTs.replace(
    'import { getBoutiqueId, getSessionUser } from "@/lib/api/session";',
    'import { getBoutiqueId, getSessionUser, switchActiveBoutique } from "@/lib/api/session";\nimport { useRouter } from "next/navigation";'
);

pageTs = pageTs.replace(
    'export default function MesBoutiquesPage() {',
    'export default function MesBoutiquesPage() {\n  const router = useRouter();'
);

const oldLink = `<Link
                      href={\`/espace-vendeur/mes-boutiques/\${b.id}\`}
                      className="flex-1 rounded-xl bg-blue-700 py-2 text-center text-xs font-semibold text-white transition hover:bg-blue-800"
                    >
                      Gérer
                    </Link>`;

const newLink = `<button
                      onClick={() => {
                        switchActiveBoutique(b.id, b.slug);
                        router.push("/espace-vendeur");
                      }}
                      className="flex-1 rounded-xl bg-blue-700 py-2 text-center text-xs font-semibold text-white transition hover:bg-blue-800"
                    >
                      Gérer
                    </button>`;

pageTs = pageTs.replace(oldLink, newLink);

fs.writeFileSync('src/app/espace-vendeur/mes-boutiques/page.tsx', pageTs);
