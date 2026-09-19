const fs = require('fs');
let content = fs.readFileSync('src/app/espace-vendeur/analytics/page.tsx', 'utf8');

// Update header
content = content.replace(
    /<h1 className="font-display text-2xl font-bold text-ink-950">Analytics Avancées<\/h1>/,
    '<h1 className="font-display text-3xl font-extrabold text-midnight-950 tracking-tight">Analytics <span className="text-gold-500">Multi-Boutique</span></h1>'
);
content = content.replace(
    /className="mt-1 text-sm text-ink-500"/,
    'className="mt-2 text-base text-ink-600"'
);

// Update selector
content = content.replace(
    /bg-blue-700 text-white/g,
    'bg-gold-500 text-white shadow-sm'
);

// Update KPIs
content = content.replace(
    /className="rounded-2xl border border-line bg-surface p-5 shadow-sm"/g,
    'className="rounded-[2rem] border border-gold-soft/50 bg-gradient-to-b from-white to-ivory-50/30 p-6 shadow-sm hover:shadow-md transition-shadow"'
);

// Note Plan
content = content.replace(
    /<div className="rounded-2xl border border-gold-soft bg-gold-wash p-4 flex items-start gap-2\.5">/g,
    '<div className="rounded-[2rem] border border-gold-300/50 bg-gradient-to-r from-gold-50 to-white p-6 flex items-start gap-4 shadow-sm">'
);
content = content.replace(
    /mt-0\.5/g,
    'mt-1'
);

fs.writeFileSync('src/app/espace-vendeur/analytics/page.tsx', content);
