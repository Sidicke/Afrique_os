const fs = require('fs');

let content = fs.readFileSync('src/components/store/CartProvider.tsx', 'utf8');

const oldCode = `  // Load cart from local storage on mount
  useEffect(() => {
    try {
      if (boutiqueSlug === "unknown") return;
      const saved = localStorage.getItem("zennshop_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.boutiqueSlug === boutiqueSlug && Array.isArray(parsed.lines)) {
          setLines(parsed.lines);
        } else if (parsed.boutiqueSlug !== boutiqueSlug) {
          // Si on change de boutique, on vide le panier de l'ancienne boutique !
          localStorage.removeItem("zennshop_cart");
        }
      }
    } catch (err) {}
  }, [boutiqueSlug]);

  // Save cart to local storage on changes
  useEffect(() => {
    if (boutiqueSlug !== "unknown") {
      localStorage.setItem("zennshop_cart", JSON.stringify({ boutiqueSlug, lines }));
    }
  }, [lines, boutiqueSlug]);`;

const newCode = `  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from local storage on mount
  useEffect(() => {
    try {
      if (boutiqueSlug === "unknown") return;
      const saved = localStorage.getItem("zennshop_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.boutiqueSlug === boutiqueSlug && Array.isArray(parsed.lines)) {
          setLines(parsed.lines);
        } else if (parsed.boutiqueSlug !== boutiqueSlug) {
          // Si on change de boutique, on vide le panier de l'ancienne boutique !
          localStorage.removeItem("zennshop_cart");
        }
      }
    } catch (err) {}
    setIsLoaded(true);
  }, [boutiqueSlug]);

  // Save cart to local storage on changes
  useEffect(() => {
    if (boutiqueSlug !== "unknown" && isLoaded) {
      localStorage.setItem("zennshop_cart", JSON.stringify({ boutiqueSlug, lines }));
    }
  }, [lines, boutiqueSlug, isLoaded]);`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/components/store/CartProvider.tsx', content);
