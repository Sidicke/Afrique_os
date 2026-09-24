"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft } from "@/components/client/icons";

export default function AskRefundPage() {
  const params = useParams();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simuler l'appel API
    setTimeout(() => {
      setIsSubmitting(false);
      alert("Votre demande de remboursement a bien été envoyée au vendeur et au service de résolution.");
      router.push(`/espace-client/commandes/${params.id}`);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link 
          href={`/espace-client/commandes/${params.id}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-midnight-950 transition-colors hover:bg-gray-200"
        >
          <IconArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-midnight-950">Demander un remboursement</h1>
          <p className="text-sm text-midnight-950/60">Commande #{params.id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-midnight-950/8 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-midnight-950">Motif de la demande *</label>
          <select 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-gray-50 p-3 text-sm focus:border-gold-mid focus:outline-none focus:ring-1 focus:ring-gold-mid"
          >
            <option value="">Sélectionnez un motif</option>
            <option value="DEFECTIVE">Produit défectueux ou cassé</option>
            <option value="NOT_AS_DESCRIBED">Produit différent de la description</option>
            <option value="NOT_RECEIVED">Colis non reçu</option>
            <option value="OTHER">Autre motif</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-midnight-950">Explications détaillées *</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Expliquez en détail le problème rencontré avec votre commande..."
            className="w-full rounded-xl border border-line bg-gray-50 p-3 text-sm focus:border-gold-mid focus:outline-none focus:ring-1 focus:ring-gold-mid"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-midnight-950">Photo justificative (optionnel)</label>
          <div className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-line bg-gray-50 p-6">
            <div className="text-center">
              <span className="mb-2 block text-sm font-medium text-midnight-950/60">Glissez une photo ici ou cliquez pour parcourir</span>
              <button type="button" className="rounded-lg bg-white border border-line px-4 py-2 text-xs font-semibold text-midnight-950 shadow-sm">
                Ajouter une photo
              </button>
            </div>
          </div>
          <p className="text-xs text-midnight-950/50 mt-1">Les photos accélèrent grandement le traitement de votre demande par nos services.</p>
        </div>

        <div className="border-t border-line pt-6">
          <button 
            type="submit" 
            disabled={!reason || !description || isSubmitting}
            className="w-full rounded-xl bg-midnight-950 py-3.5 text-sm font-bold text-gold-300 transition-colors hover:bg-midnight-800 disabled:opacity-50"
          >
            {isSubmitting ? "Envoi en cours..." : "Soumettre la demande"}
          </button>
        </div>
      </form>
    </div>
  );
}
