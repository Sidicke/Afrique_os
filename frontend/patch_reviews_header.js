const fs = require('fs');
let content = fs.readFileSync('src/components/marketplace/ProductPage.tsx', 'utf8');

content = content.replace(
    /\{rating > 0 && \(\s*<span className="inline-flex items-center gap-1\.5">\s*<Stars rating=\{rating\} \/>\s*<span className="text-sm font-semibold text-midnight-950\/70">\s*\{rating\.toFixed\(1\)\}\s*<\/span>\s*<\/span>\s*\)\}/g,
    `<span className="inline-flex items-center gap-1.5">
                <Stars rating={rating} />
                <span className="text-sm font-semibold text-midnight-950/70">
                  {rating.toFixed(1)} sur 5
                </span>
              </span>`
);

fs.writeFileSync('src/components/marketplace/ProductPage.tsx', content);
