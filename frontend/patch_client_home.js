const fs = require('fs');

const overviewHTML = `
      {/* ——— Tableau de bord client épuré ——— */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/espace-client/commandes" className="group flex flex-col justify-between rounded-2xl border border-midnight-950/8 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-wash text-gold-strong transition-colors group-hover:bg-gold-200">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-midnight-950">Mes Commandes</h3>
              <p className="text-sm font-medium text-ink-500">Suivre et gérer</p>
            </div>
          </div>
        </Link>

        <Link href="/espace-client/discussions" className="group flex flex-col justify-between rounded-2xl border border-midnight-950/8 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-wash text-gold-strong transition-colors group-hover:bg-gold-200">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-midnight-950">Discussions</h3>
              <p className="text-sm font-medium text-ink-500">Contacter les vendeurs</p>
            </div>
          </div>
        </Link>

        <Link href="/espace-client/compte" className="group flex flex-col justify-between rounded-2xl border border-midnight-950/8 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-md sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-wash text-gold-strong transition-colors group-hover:bg-gold-200">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-midnight-950">Mon Compte</h3>
              <p className="text-sm font-medium text-ink-500">Profil et sécurité</p>
            </div>
          </div>
        </Link>
      </div>
`;

let content = fs.readFileSync('src/app/espace-client/page.tsx', 'utf8');

// Supprimer l'import de MarketplaceHome
content = content.replace(/import MarketplaceHome from "@\/components\/marketplace\/MarketplaceHome";\n/g, '');

// Remplacer l'inclusion de MarketplaceHome par notre tableau de bord
content = content.replace(/\{\/\* ——— Le marketplace — accueil commercial complet ——— \*\/\}\n\s*\{\/\* Espace client connecté : pas de CTA « Créer une boutique 30 jours gratuits » \*\/\}\n\s*<MarketplaceHome hideSellerBanner \/>/g, overviewHTML);

// Remplacer le texte descriptif dans la bannière
content = content.replace(/Prêt à découvrir de nouvelles pépites \? Explorez les boutiques, profitez des offres du jour et gérez toutes vos commandes au même endroit\./g, "Bienvenue dans votre espace personnel. Gérez vos commandes, reprenez vos paniers en attente et échangez facilement avec vos vendeurs.");

fs.writeFileSync('src/app/espace-client/page.tsx', content);
