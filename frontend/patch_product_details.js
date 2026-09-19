const fs = require('fs');
let content = fs.readFileSync('src/components/marketplace/ProductPage.tsx', 'utf8');

// 1. Show rating unconditionally at the top
content = content.replace(
    /\{rating > 0 && \(\s*<span className="inline-flex items-center gap-1\.5 text-sm">\s*<Stars rating=\{rating\} \/>\s*<span className="font-semibold text-midnight-950\/70">\s*\{rating\.toFixed\(1\)\}\s*<\/span>\s*<span className="text-midnight-950\/40">\s*\(\s*\{product\.reviews\.length\}\s*\{product\.reviews\.length > 1\s*\? " avis"\s*: " avis"\}\s*\)\s*<\/span>\s*<\/span>\s*\)\}/g,
    `<span className="inline-flex items-center gap-1.5 text-sm">
                <Stars rating={rating} />
                <span className="font-semibold text-midnight-950/70">
                  {rating.toFixed(1)}
                </span>
                <span className="text-midnight-950/40">
                  ( {product.reviews.length} {product.reviews.length > 1 ? "avis" : "avis"} )
                </span>
              </span>`
);

// 2. Show Description unconditionally
content = content.replace(
    /\{\s*product\.description && \(\s*<div className="border-t border-midnight-950\/8 pt-6">\s*<h2 className="font-display text-lg font-bold text-midnight-950">\s*Description\s*<\/h2>\s*<p className="mt-2 text-sm leading-relaxed text-midnight-950\/65">\s*\{product\.description\}\s*<\/p>\s*<\/div>\s*\)\s*\}/g,
    `<div className="border-t border-midnight-950/8 pt-6">
              <h2 className="font-display text-lg font-bold text-midnight-950">
                Description
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-midnight-950/65 whitespace-pre-wrap">
                {product.description || "Aucune description fournie par le vendeur."}
              </p>
            </div>`
);

// 3. Show Reviews section unconditionally
content = content.replace(
    /\{\s*product\.reviews\.length > 0 && \(\s*<section aria-labelledby="product-reviews-title" className="mt-16">/g,
    `<section aria-labelledby="product-reviews-title" className="mt-16">`
);

content = content.replace(
    /<\/ul>\s*<\/section>\s*\)\s*\}/g,
    `</ul>
          {product.reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-midnight-950/15 bg-white/50 p-8 text-center">
              <p className="text-sm font-medium text-midnight-950/50">Aucun avis pour le moment.</p>
              <p className="mt-1 text-xs text-midnight-950/40">Soyez le premier à donner votre avis après l'achat !</p>
            </div>
          )}
        </section>`
);

fs.writeFileSync('src/components/marketplace/ProductPage.tsx', content);
