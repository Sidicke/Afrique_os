const fs = require('fs');
let content = fs.readFileSync('src/components/marketplace/ProductPage.tsx', 'utf8');

// The second occurrence broke the similar section closing tag.
// Let's replace the broken similar section end.
content = content.replace(
    /<\/div>\n\s*\{product\.reviews\.length === 0 && \(\n\s*<div className="rounded-2xl border border-dashed border-midnight-950\/15 bg-white\/50 p-8 text-center mt-5">\n\s*<p className="text-sm font-medium text-midnight-950\/50">Aucun avis pour le moment\.<\/p>\n\s*<p className="mt-1 text-xs text-midnight-950\/40">Soyez le premier à donner votre avis après l'achat !<\/p>\n\s*<\/div>\n\s*\)\}\n\s*<\/section>\n\s*<\/Container>/g,
    `</div>\n        </section>\n      )}\n    </Container>`
);

fs.writeFileSync('src/components/marketplace/ProductPage.tsx', content);
