const fs = require('fs');
let content = fs.readFileSync('src/components/store/StoreHeader.tsx', 'utf8');

const hookReplacement = `  const [backHref, setBackHref] = useState("/marketplace");
  const [backLabel, setBackLabel] = useState("ZennShop");

  useEffect(() => {
    try {
      const user = getSessionUser();
      if (user?.role === "CLIENT") {
        setBackHref("/espace-client");
        setBackLabel("Mon Espace");
      } else if (user?.role === "ADMIN" || user?.role === "VENDEUR") {
        setBackHref("/espace-admin");
        setBackLabel("Console");
      }
    } catch (e) {}
  }, []);`;

content = content.replace(/  const \[backHref, setBackHref\] = useState\("\/marketplace"\);\n\n  useEffect\(\(\) => \{\n    try \{\n      const user = getSessionUser\(\);\n      if \(user\?\.role === "CLIENT"\) \{\n        setBackHref\("\/espace-client"\);\n      \} else if \(user\?\.role === "ADMIN" \|\| user\?\.role === "VENDEUR"\) \{\n        setBackHref\("\/espace-admin"\);\n      \}\n    \} catch \(e\) \{\}\n  \}, \[\]\);/g, hookReplacement);

content = content.replace(/<span className="font-display text-\[10px\] sm:text-\[11px\] font-bold uppercase tracking-wider">\n\s*ZennShop\n\s*<\/span>/g, `<span className="font-display text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">\n              {backLabel}\n            </span>`);

fs.writeFileSync('src/components/store/StoreHeader.tsx', content);
