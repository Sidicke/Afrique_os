const fs = require('fs');

let pageTs = fs.readFileSync('src/app/espace-vendeur/commandes/page.tsx', 'utf8');

// We need to import useSearchParams
pageTs = pageTs.replace(
    'import { useMemo, useState } from "react";',
    'import { useMemo, useState, useEffect } from "react";\nimport { useSearchParams } from "next/navigation";'
);

pageTs = pageTs.replace(
    'export default function CommandesPage() {',
    'export default function CommandesPage() {\n  const searchParams = useSearchParams();\n  const initialQuery = searchParams.get("search") || "";'
);

pageTs = pageTs.replace(
    'const [query, setQuery] = useState("");',
    'const [query, setQuery] = useState(initialQuery);\n\n  useEffect(() => {\n    if (searchParams.get("search")) setQuery(searchParams.get("search") || "");\n  }, [searchParams]);'
);

fs.writeFileSync('src/app/espace-vendeur/commandes/page.tsx', pageTs);
