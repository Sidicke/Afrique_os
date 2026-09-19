const fs = require('fs');

let layout = fs.readFileSync('src/app/espace-vendeur/layout.tsx', 'utf8');

layout = layout.replace(
  'return (\n    <LiveNotificationProvider>) => {\n      cancelled = true;\n    };',
  'return () => {\n      cancelled = true;\n    };'
);

fs.writeFileSync('src/app/espace-vendeur/layout.tsx', layout);
