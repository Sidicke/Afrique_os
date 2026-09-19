const fs = require('fs');

let layout = fs.readFileSync('src/app/espace-vendeur/parametres/layout.tsx', 'utf8');

layout = layout.replace(
    'import { merchantProfile } from "@/services/dashboardService";',
    'import { merchantProfile } from "@/services/dashboardService";\nimport { getBoutiqueName } from "@/lib/api/session";'
);

layout = layout.replace(
    'title={`Paramètres - ${merchantProfile.shopName}`}',
    'title={`Paramètres - ${getBoutiqueName() || merchantProfile.shopName}`}'
);

fs.writeFileSync('src/app/espace-vendeur/parametres/layout.tsx', layout);
