const fs = require('fs');

let layout = fs.readFileSync('src/app/espace-vendeur/layout.tsx', 'utf8');

layout = layout.replace(
  'export default function DashboardLayout',
  'import { LiveNotificationProvider } from "@/components/dashboard/ui/LiveNotificationProvider";\n\nexport default function DashboardLayout'
);

layout = layout.replace(
  'return (\n    <div className="flex h-screen w-full',
  'return (\n    <LiveNotificationProvider>\n    <div className="flex h-screen w-full'
);

layout = layout.replace(
  '    </div>\n  );\n}',
  '    </div>\n    </LiveNotificationProvider>\n  );\n}'
);

fs.writeFileSync('src/app/espace-vendeur/layout.tsx', layout);
