"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shopsApi } from "@/lib/api";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";

export default function NouvelleBoutiquePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    city: "",
    phone: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Le nom de la boutique est requis.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await shopsApi.create({
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      // Redirect to the boutiques list
      router.push("/espace-vendeur/mes-boutiques");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la création.");
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-950 transition-all focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/50";
  const labelCls = "mb-1.5 block text-xs font-semibold text-ink-700";

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <PageHeader
        eyebrow="Multi-boutique"
        title="Nouvelle boutique"
        description="Créez une nouvelle vitrine pour segmenter votre offre ou cibler une nouvelle clientèle."
      />

      <DashboardCard className="p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Nom de la boutique *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Ma Super Boutique"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Slogan / Phrase d'accroche</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Ex: La qualité au meilleur prix"
              className={inputCls}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Ex: Abidjan"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Téléphone de contact</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ex: +225 07..."
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email de contact</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Ex: contact@maboutique.com"
              className={inputCls}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gold-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-gold-700 disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer la boutique"}
            </button>
          </div>
        </form>
      </DashboardCard>
    </div>
  );
}
