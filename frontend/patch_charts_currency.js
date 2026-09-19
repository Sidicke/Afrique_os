const fs = require('fs');

function replaceCurrency(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('import { formatCurrency } from "@/lib/utils";', 'import { useTranslation } from "@/lib/i18n";');
  
  if (content.includes('export default function MultiStoreRevenueChart')) {
    content = content.replace(
      'export default function MultiStoreRevenueChart({ data = DEMO_DATA }: { data?: StoreRevenueStat[] }) {',
      'export default function MultiStoreRevenueChart({ data = DEMO_DATA }: { data?: StoreRevenueStat[] }) {\n  const { formatPrice } = useTranslation();'
    );
  } else if (content.includes('export default function TopProductsCrossStore')) {
    content = content.replace(
      'export default function TopProductsCrossStore({ products = DEMO_PRODUCTS }: { products?: CrossStoreProduct[] }) {',
      'export default function TopProductsCrossStore({ products = DEMO_PRODUCTS }: { products?: CrossStoreProduct[] }) {\n  const { formatPrice } = useTranslation();'
    );
  }
  
  content = content.replace(/formatCurrency\(/g, 'formatPrice(');
  fs.writeFileSync(file, content);
}

replaceCurrency('src/components/dashboard/analytics/MultiStoreRevenueChart.tsx');
replaceCurrency('src/components/dashboard/analytics/TopProductsCrossStore.tsx');
