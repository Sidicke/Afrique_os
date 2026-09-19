const fs = require('fs');
let usersService = fs.readFileSync('../backend/src/users/users.service.ts', 'utf8');

usersService = usersService.replace(
  "else if (boutiques.some(b => b.plan === 'business')) highestPlan = 'business';",
  "else if (boutiques.some(b => b.plan === 'business')) highestPlan = 'business';\n    else if (boutiques.some(b => b.plan === 'pro')) highestPlan = 'pro';"
);

fs.writeFileSync('../backend/src/users/users.service.ts', usersService);
