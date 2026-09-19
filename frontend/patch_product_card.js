const fs = require('fs');
let content = fs.readFileSync('src/components/client/ProductCard.tsx', 'utf8');

// The bottom buttons
content = content.replace(
    /href=\{shopHref\}\n\s*className="flex min-h-\[40px\] sm:min-h-\[44px\] flex-1 items-center justify-center gap-1\.5 rounded-full border border-midnight-950\/15 px-2\.5 sm:px-3 py-2 text-xs font-semibold text-midnight-950\/70 transition-all duration-200 hover:border-gold-400\/70 hover:bg-gold-400\/5 hover:text-midnight-950"\n\s*>\n\s*<IconStore className="h-3\.5 w-3\.5 shrink-0 text-gold-600" \/>\n\s*<span className="truncate">Boutique<\/span>/g,
    `href={productHref}
          className="flex min-h-[40px] sm:min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-midnight-950/15 px-2.5 sm:px-3 py-2 text-xs font-semibold text-midnight-950/70 transition-all duration-200 hover:border-gold-400/70 hover:bg-gold-400/5 hover:text-midnight-950"
        >
          <IconStore className="h-3.5 w-3.5 shrink-0 text-gold-600" />
          <span className="truncate">Voir le produit</span>`
);

fs.writeFileSync('src/components/client/ProductCard.tsx', content);
