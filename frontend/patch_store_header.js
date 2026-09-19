const fs = require('fs');
let content = fs.readFileSync('src/components/store/StoreHeader.tsx', 'utf8');

if (!content.includes('import { getSessionUser }')) {
    content = content.replace('import { useTranslation } from "@/lib/i18n";', 'import { useTranslation } from "@/lib/i18n";\nimport { getSessionUser } from "@/lib/api/session";');
}

// Inside the component export default function StoreHeader
const stateHook = `  const [searchQuery, setSearchQuery] = useState("");
  const [backHref, setBackHref] = useState("/marketplace");

  useEffect(() => {
    try {
      const user = getSessionUser();
      if (user?.role === "CLIENT") {
        setBackHref("/espace-client");
      } else if (user?.role === "ADMIN" || user?.role === "VENDEUR") {
        setBackHref("/espace-admin");
      }
    } catch (e) {}
  }, []);`;

content = content.replace(/  const \[searchQuery, setSearchQuery\] = useState\(""\);/g, stateHook);

// Replace the specific links
content = content.replace(
    /href="\/marketplace"\n\s*title="Retourner sur ZennShop"/g,
    'href={backHref}\n            title="Retourner à l\'accueil"'
);

content = content.replace(
    /href="\/marketplace"\n\s*className="flex items-center gap-2 rounded-xl bg-midnight-950 p-3 text-sm font-semibold text-gold-300 transition-colors hover:bg-midnight-900"\n\s*onClick=\{closeMobile\}/g,
    'href={backHref}\n              className="flex items-center gap-2 rounded-xl bg-midnight-950 p-3 text-sm font-semibold text-gold-300 transition-colors hover:bg-midnight-900"\n              onClick={closeMobile}'
);

content = content.replace(/<span>Retourner sur ZennShop<\/span>/g, '<span>Retour</span>');

fs.writeFileSync('src/components/store/StoreHeader.tsx', content);
