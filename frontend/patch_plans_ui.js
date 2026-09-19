const fs = require('fs');

// 1. Fix src/app/espace-vendeur/mes-boutiques/page.tsx
let mesBoutiques = fs.readFileSync('src/app/espace-vendeur/mes-boutiques/page.tsx', 'utf8');
const oldBoutiqueInfo = `<div className="rounded-2xl border border-gold-soft bg-gold-wash p-4">
        <p className="text-sm font-medium text-ink-700">
          💡 <strong>Plan Business</strong> : jusqu'à 3 boutiques simultanées. Passez en <strong>Enterprise</strong> pour des boutiques illimitées.
        </p>
      </div>`;
const newBoutiqueInfo = `<div className="rounded-2xl border border-gold-soft bg-gold-wash p-4">
        <p className="text-sm font-medium text-ink-700">
          💡 <strong>Plan actuel ({currentBoutiqueId ? boutiques.find(b => b.id === currentBoutiqueId)?.plan.toUpperCase() : "..."})</strong> : 
          Le plan <strong>Starter</strong> autorise 1 boutique. Passez au plan <strong>Business</strong> pour aller jusqu'à 3, ou <strong>Enterprise</strong> pour l'illimité.
        </p>
      </div>`;
mesBoutiques = mesBoutiques.replace(oldBoutiqueInfo, newBoutiqueInfo);
fs.writeFileSync('src/app/espace-vendeur/mes-boutiques/page.tsx', mesBoutiques);

// 2. Fix src/app/espace-vendeur/equipe/page.tsx
let equipe = fs.readFileSync('src/app/espace-vendeur/equipe/page.tsx', 'utf8');

// I need to read the plan from session. 
// For now, I'll just change the text to be more generic since this page is a demo.
const oldEquipeInfo = `          <div>
            <p className="text-sm font-semibold text-ink-800">Plan Business — 2 collaborateurs max</p>
            <p className="text-xs text-ink-500">{activeMembers.length} / 2 utilisés · Passez en Enterprise pour illimité</p>
          </div>`;
const newEquipeInfo = `          <div>
            <p className="text-sm font-semibold text-ink-800">Gestion de l'équipe (Option Business)</p>
            <p className="text-xs text-ink-500">Le plan Starter ne permet pas d'ajouter des collaborateurs. Passez en Business pour 2 accès, ou Enterprise pour illimité.</p>
          </div>`;
equipe = equipe.replace(oldEquipeInfo, newEquipeInfo);
fs.writeFileSync('src/app/espace-vendeur/equipe/page.tsx', equipe);

