const fs = require('fs');
let content = fs.readFileSync('src/app/espace-vendeur/statistiques/page.tsx', 'utf8');

const oldBanner = `<DashboardCard className="relative overflow-hidden flex flex-col items-center justify-center p-12 text-center mt-6 border-gold-strong/20 bg-gold-wash/10">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-wash text-gold-strong">
                <Icon name="star" size={28} />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-ink-950">Analytics Avancées</h3>
              <p className="mb-6 max-w-md text-sm text-ink-600">
                La segmentation des clients, les rapports de fidélisation et les meilleures ventes sont exclusifs au plan Business. Passez à Business pour mieux piloter votre croissance.
              </p>
              <a
                href="/espace-vendeur/parametres/formule"
                className="rounded-xl bg-gold-strong px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-gold-900"
              >
                Passer à Business — 12 500 FCFA/mois
              </a>
            </DashboardCard>`;

const newBanner = `<div className="relative mt-12 overflow-hidden rounded-[2.5rem] bg-midnight-950 p-8 sm:p-12 shadow-2xl">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/20 blur-[80px] pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20 blur-[80px] pointer-events-none" />
              
              <div className="relative flex flex-col items-center text-center max-w-2xl mx-auto">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/30">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h3 className="mb-4 font-display text-3xl font-extrabold text-white tracking-tight">
                  Passez à la vitesse supérieure
                </h3>
                <p className="mb-8 text-lg text-ivory-50/70 leading-relaxed">
                  Débloquez la <strong className="text-gold-300 font-semibold">segmentation client</strong>, les rapports de fidélisation et l'analyse de vos <strong className="text-gold-300 font-semibold">meilleures ventes</strong> en passant au plan supérieur. Prenez des décisions basées sur des données précises.
                </p>
                <a
                  href="/espace-vendeur/parametres/formule"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-sm font-bold text-midnight-950 transition-all hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/25 hover:-translate-y-0.5 active:scale-95"
                >
                  Découvrir nos offres
                  <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </a>
              </div>
            </div>`;

content = content.replace(oldBanner, newBanner);
fs.writeFileSync('src/app/espace-vendeur/statistiques/page.tsx', content);
