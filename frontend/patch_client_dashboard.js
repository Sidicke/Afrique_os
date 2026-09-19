const fs = require('fs');

const cartComponent = `

/** Carte du dernier panier en cours (lu depuis localStorage) */
function LastCartCard() {
  const [cartState, setCartState] = useState<{ boutiqueSlug: string; count: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zennshop_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.boutiqueSlug && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          const totalQty = parsed.lines.reduce((acc, line) => acc + line.qty, 0);
          setCartState({ boutiqueSlug: parsed.boutiqueSlug, count: totalQty });
        }
      }
    } catch (e) {}
  }, []);

  if (!cartState) return null;

  return (
    <div className="mt-6 lg:mt-0 lg:ml-auto w-full lg:w-72 flex shrink-0 rounded-2xl border border-gold-soft/50 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-terracotta">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <div className="ml-3.5 flex flex-col justify-center">
        <h3 className="font-display text-sm font-bold text-midnight-950">Panier en attente</h3>
        <p className="text-[11px] font-medium text-ink-600 mb-1.5 line-clamp-1">
          {cartState.count} article{cartState.count > 1 ? "s" : ""} chez <span className="capitalize">{cartState.boutiqueSlug.replace(/-/g, ' ')}</span>
        </p>
        <import_Link href={\`/b/\${cartState.boutiqueSlug}\`} className="text-[11px] font-bold text-gold-700 hover:text-terracotta transition-colors inline-flex items-center gap-1">
          Reprendre ma commande 
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </import_Link>
      </div>
    </div>
  );
}
`;

let content = fs.readFileSync('src/app/espace-client/page.tsx', 'utf8');

// Insert LastCartCard before EspaceClientHome
content = content.replace('export default function EspaceClientHome() {', cartComponent.replace(/import_Link/g, 'Link') + '\nexport default function EspaceClientHome() {');

// Inject the component in the banner
content = content.replace('</div>\n        </div>\n      </section>', '</div>\n          <LastCartCard />\n        </div>\n      </section>');

// Verify if Link is imported, if not add it
if (!content.includes('import Link from "next/link";')) {
    content = content.replace('import { useEffect, useState } from "react";', 'import { useEffect, useState } from "react";\nimport Link from "next/link";');
}

fs.writeFileSync('src/app/espace-client/page.tsx', content);
