const fs = require('fs');
let content = fs.readFileSync('src/components/store/CartProvider.tsx', 'utf8');

content = content.replace(/import \{ useShopConfig \} from "@\/lib\/useShopConfig";/, 'import { useShopConfig } from "@/lib/useShopConfig";\nimport { useParams } from "next/navigation";');

const effectCode = `  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [deliveryPackId, setDeliveryPackId] = useState<string | null>(null);
  const [initialStep, setInitialStep] = useState<"cart" | "checkout">("cart");
  const config = useShopConfig();
  const params = useParams();
  const boutiqueSlug = params?.boutiqueSlug || params?.slug || "unknown";

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
  }, [boutiqueSlug]);

  // Save cart to local storage on changes
  useEffect(() => {
    if (boutiqueSlug !== "unknown") {
      localStorage.setItem("zennshop_cart", JSON.stringify({ boutiqueSlug, lines }));
    }
  }, [lines, boutiqueSlug]);`;

content = content.replace(/  const \[lines, setLines\] = useState<CartLine\[\]>\(\[\]\);\n  const \[isOpen, setIsOpen\] = useState\(false\);\n  const \[deliveryPackId, setDeliveryPackId\] = useState<string \| null>\(null\);\n  const \[initialStep, setInitialStep\] = useState<"cart" \| "checkout">\("cart"\);\n  const config = useShopConfig\(\);\n\n  \/\/ Load cart from local storage on mount\n  useEffect\(\(\) => \{\n    try \{\n      const saved = localStorage\.getItem\("zennshop_cart"\);\n      if \(saved\) \{\n        const parsed = JSON\.parse\(saved\);\n        if \(parsed\.boutiqueId === config\.id && Array\.isArray\(parsed\.lines\)\) \{\n          setLines\(parsed\.lines\);\n        \} else \{\n          \/\/ Si on change de boutique, on vide le panier de l'ancienne boutique !\n          localStorage\.removeItem\("zennshop_cart"\);\n        \}\n      \}\n    \} catch \(err\) \{\}\n  \}, \[config\.id\]\);\n\n  \/\/ Save cart to local storage on changes\n  useEffect\(\(\) => \{\n    if \(config\.id\) \{\n      localStorage\.setItem\("zennshop_cart", JSON\.stringify\(\{ boutiqueId: config\.id, lines \}\)\);\n    \}\n  \}, \[lines, config\.id\]\);/g, effectCode);

fs.writeFileSync('src/components/store/CartProvider.tsx', content);
