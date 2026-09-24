"use client";

import { useAdminOverview } from "@/hooks/useAdminOverview";
import { RecentActivity } from "@/components/admin/overview/RecentActivity";

export default function ActivitePage() {
  const { data, loading, error } = useAdminOverview();

  if (loading) return <div className="p-8 text-center text-ink-500">Chargement du journal...</div>;
  if (error || !data) return <div className="p-8 text-center text-red-500">Erreur de chargement</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Journal d'Activité</h1>
          <p className="text-sm text-ink-500">Historique complet des événements importants sur la plateforme.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-950 focus:outline-none focus:ring-1 focus:ring-blue-600">
            <option>Tous les événements</option>
            <option>Par Boutique</option>
            <option>Par Date</option>
          </select>
          <button 
            className="flex items-center gap-2 rounded-xl bg-ink-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            onClick={() => {
              const headers = "Date,Acteur,Description,Type\n";
              const rows = data.activity.map(e => `"${new Date(e.timestamp).toLocaleString()}","${e.actor}","${e.description}","${e.type}"`).join("\n");
              const blob = new Blob([headers + rows], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.setAttribute('href', url);
              a.setAttribute('download', 'journal-activite.csv');
              a.click();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exporter CSV
          </button>
        </div>
      </div>
      <RecentActivity events={data.activity} />
    </div>
  );
}
