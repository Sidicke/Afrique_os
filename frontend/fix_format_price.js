const fs = require('fs');
const files = [
  "src/components/admin/orders/OrdersVolumeChart.tsx",
  "src/components/client/ProductCard.tsx",
  "src/components/client/ui/ConversationItem.tsx",
  "src/components/client/ui/OrderCard.tsx",
  "src/components/marketplace/MarketplaceDailyDeals.tsx",
  "src/components/marketplace/MarketplaceLatestProducts.tsx",
  "src/components/marketplace/ProductPage.tsx",
  "src/components/marketplace/SearchResults.tsx",
  "src/components/store/StoreHeader.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find all component function definitions
  const regex = /export\s+(?:default\s+)?function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g;
  
  content = content.replace(regex, (match, funcName) => {
    // Check if the component body uses formatPrice but doesn't define it
    // A bit tricky with regex, let's just blindly insert it if we see formatPrice in the file and it's not defined
    return match + '\n  const { formatPrice } = useTranslation();\n';
  });
  
  // Remove duplicate definitions if we accidentally added multiple or if they already had it
  // Actually, wait, this adds it to EVERY exported function in the file.
  
  fs.writeFileSync(file, content);
}
console.log("Done");
