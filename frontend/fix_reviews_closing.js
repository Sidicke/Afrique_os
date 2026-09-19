const fs = require('fs');
let content = fs.readFileSync('src/components/marketplace/ProductPage.tsx', 'utf8');

content = content.replace(
    /<\/div>\s*<\/section>\s*\)\}/g,
    `</div>
          {product.reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-midnight-950/15 bg-white/50 p-8 text-center mt-5">
              <p className="text-sm font-medium text-midnight-950/50">Aucun avis pour le moment.</p>
              <p className="mt-1 text-xs text-midnight-950/40">Soyez le premier à donner votre avis après l'achat !</p>
            </div>
          )}
        </section>`
);

fs.writeFileSync('src/components/marketplace/ProductPage.tsx', content);
