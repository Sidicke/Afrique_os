import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # Fix duplicate `t`
    if 'const { formatPrice, t } = useTranslation();' in content and 'const { t } = useTranslation();' in content:
        content = content.replace('const { t } = useTranslation();\n', '')
        content = content.replace('const { t } = useTranslation();', '')

    # Inject `const { t } = useTranslation();` for MarketplaceHero if missing
    if 'export function MarketplaceHero' in content and 'const { t } = useTranslation()' not in content:
        content = re.sub(r'(export function MarketplaceHero\([^)]*\)\s*\{)', r'\1\n  const { t } = useTranslation();', content)
        
    # Inject `const { t } = useTranslation();` for PromoBanner if missing
    if 'export function PromoBanner' in content and 'const { t } = useTranslation()' not in content:
        content = re.sub(r'(export function PromoBanner\([^)]*\)\s*\{)', r'\1\n  const { t } = useTranslation();', content)
        
    # Inject `const { t } = useTranslation();` for TrustBar if missing
    if 'export function TrustBar' in content and 'const { t } = useTranslation()' not in content:
        content = re.sub(r'(export function TrustBar\([^)]*\)\s*\{)', r'\1\n  const { t } = useTranslation();', content)
        
    if 'import { useTranslation } from "@/lib/i18n";' not in content:
        content = 'import { useTranslation } from "@/lib/i18n";\n' + content

    with open(path, 'w') as f:
        f.write(content)

fix_file('src/components/marketplace/MarketplaceDailyDeals.tsx')
fix_file('src/components/marketplace/MarketplaceLatestProducts.tsx')
fix_file('src/components/marketplace/MarketplaceHero.tsx')
fix_file('src/components/marketplace/PromoBanner.tsx')
fix_file('src/components/marketplace/TrustBar.tsx')
print("Fixed component definitions")
