const fs = require('fs');

let content = fs.readFileSync('src/app/espace-client/page.tsx', 'utf8');

const regex = /\{\/\* ——— Tableau de bord client épuré ——— \*\/\}\n\s*<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">[\s\S]*?<\/Link>\n\s*<\/div>/;

content = content.replace(regex, '');

fs.writeFileSync('src/app/espace-client/page.tsx', content);
