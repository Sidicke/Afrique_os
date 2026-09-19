const fs = require('fs');

function patchFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    
    if (!content.includes('import { PublicVisibilityGuard }')) {
        content = content.replace('import ProductPage', 'import { PublicVisibilityGuard } from "@/components/shared/PublicVisibilityGuard";\nimport ProductPage');
    }

    content = content.replace(/<Navbar \/>/g, '<PublicVisibilityGuard hideForRole="CLIENT">\n        <Navbar />\n      </PublicVisibilityGuard>');
    content = content.replace(/<Footer \/>/g, '<PublicVisibilityGuard hideForRole="CLIENT">\n        <Footer />\n      </PublicVisibilityGuard>');
    
    fs.writeFileSync(filepath, content);
}

patchFile('src/app/produit/[slug]/page.tsx');
patchFile('src/app/b/[boutiqueSlug]/produit/[productSlug]/page.tsx');
