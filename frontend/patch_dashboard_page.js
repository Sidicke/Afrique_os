const fs = require('fs');

let page = fs.readFileSync('src/app/espace-vendeur/page.tsx', 'utf8');

page = page.replace(
  'import { useDashboard } from "@/hooks/useDashboard";',
  'import { useDashboard } from "@/hooks/useDashboard";\nimport { useLiveNotifications } from "@/components/dashboard/ui/LiveNotificationProvider";'
);

page = page.replace(
  'const { data, loading, error, refreshData } = useDashboard();',
  'const { data, loading, error, refreshData } = useDashboard();\n  const { notify } = useLiveNotifications();'
);

page = page.replace(
  '  useEffect(() => {\n    const t = window.setTimeout(() => {\n      setGreet(greeting());\n      setToday(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()));\n    }, 10);\n    return () => clearTimeout(t);\n  }, []);',
  `  useEffect(() => {
    const t = window.setTimeout(() => {
      setGreet(greeting());
      setToday(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()));
    }, 10);
    return () => clearTimeout(t);
  }, []);

  // DEMO : Simulate a new order incoming for the user
  useEffect(() => {
    const timer = setTimeout(() => {
      notify({
        title: "Nouvelle Commande ! 🎉",
        message: "Oumar vient de passer une commande de 45 000 FCFA.",
        href: "/espace-vendeur/commandes",
        tone: "success",
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [notify]);`
);

fs.writeFileSync('src/app/espace-vendeur/page.tsx', page);
