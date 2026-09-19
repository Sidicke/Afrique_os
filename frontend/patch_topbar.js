const fs = require('fs');

let topbar = fs.readFileSync('src/components/dashboard/layout/DashboardTopbar.tsx', 'utf8');

topbar = topbar.replace(
    'import { merchantProfile } from "@/services/dashboardService";',
    'import { merchantProfile } from "@/services/dashboardService";\nimport { getBoutiqueName } from "@/lib/api/session";'
);

topbar = topbar.replace(
    '{merchantProfile.shopName}',
    '{getBoutiqueName() || merchantProfile.shopName}'
);

fs.writeFileSync('src/components/dashboard/layout/DashboardTopbar.tsx', topbar);
