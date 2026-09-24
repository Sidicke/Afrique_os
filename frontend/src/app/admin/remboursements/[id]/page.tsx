"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import useSWR from "swr";
import { refundsApi } from "@/lib/api/refunds";


export default function RefundDetailPage() {
  const params = useParams();
  const { data: refundCase, isLoading, mutate } = useSWR(['adminRefund', params.id], () => refundsApi.getAdminRequest(params.id as string));
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleDecision = async () => {
    if (!decision || !resolutionText.trim()) {
      setToast("Le motif de résolution est obligatoire.");
      return;
    }
    setIsSubmitting(true);
    
    refundsApi.adminDecide(params.id as string, decision, resolutionText)
      .then(() => { 
        setIsSubmitting(false); 
        setDecision(null); 
        setToast("Dossier clôturé avec succès."); 
        mutate(); 
      })
      .catch(e => { 
        setIsSubmitting(false); 
        setToast("Erreur lors de la clôture."); 
      });
  };

  if (isLoading) return <div>Chargement...</div>;
  if (!refundCase) return <div>Introuvable</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/remboursements" className="rounded-lg border border-line p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-950">
          <Icon name="arrow-left" size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Dossier {params.id as string}</h1>
          <p className="text-sm text-ink-500">Litige Commande {refundCase.order.id.slice(0, 8)}</p>
        </div>
      </div>

      {toast && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-800 border border-blue-200">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne Client */}
        <DashboardCard className="p-6 border-red-100 bg-red-50/10">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
            <h3 className="font-display text-lg font-semibold text-ink-950">Version du Client</h3>
            <span className="rounded-full bg-ink-100 px-3 py-1 font-mono text-[10px] font-bold text-ink-700">{refundCase.client.name}</span>
          </div>
          <div className="space-y-4 text-sm text-ink-700">
            <div>
              <span className="block font-semibold text-ink-950">Motif de la demande</span>
              <p className="mt-1">{refundCase.reason}</p>
            </div>
            <div>
              <span className="block font-semibold text-ink-950">Explications</span>
              <p className="mt-1">{refundCase.description}</p>
            </div>
            {refundCase.evidenceUrl && (
              <div>
                <span className="block font-semibold text-ink-950 mb-2">Preuve attachée</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={refundCase.evidenceUrl} alt="Preuve" className="rounded-xl border border-line w-full object-cover max-h-64" />
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Colonne Vendeur */}
        <DashboardCard className="p-6 border-blue-100 bg-blue-50/10">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
            <h3 className="font-display text-lg font-semibold text-ink-950">Défense du Vendeur</h3>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-mono text-[10px] font-bold text-blue-700">{refundCase.boutique?.name || "Boutique inconnue"}</span>
          </div>
          <div className="space-y-4 text-sm text-ink-700">
            {refundCase.vendorComment ? (
              <div>
                <span className="block font-semibold text-ink-950">Commentaire du vendeur</span>
                <p className="mt-2 rounded-xl bg-white p-4 border border-line leading-relaxed">{refundCase.vendorComment}</p>
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center text-ink-400">
                <Icon name="clock" size={24} className="mb-2 opacity-50" />
                <p>En attente de la réponse du vendeur...</p>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Bloc Décision (Arbitrage) */}
      <DashboardCard className="p-6 border-gold-soft/60">
        <div className="mb-4 border-b border-line pb-4">
          <h3 className="font-display text-lg font-semibold text-ink-950">Arbitrage ZennShop</h3>
          <p className="text-sm text-ink-500">Tranchez ce litige en vous basant sur la politique de remboursement.</p>
        </div>
        
        {refundCase.status === "APPROVED" || refundCase.status === "REJECTED" ? (
          <div className="rounded-xl bg-ink-50 p-6 text-center text-sm font-medium text-ink-700">
            Ce litige a déjà été clôturé ({refundCase.status}).
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-ink-950">Motif de votre décision (obligatoire)</label>
              <textarea 
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="Expliquez pourquoi vous donnez raison au client ou au vendeur..."
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                rows={3}
              />
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setDecision("APPROVE")}
                className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-all ${decision === "APPROVE" ? "border-green-600 bg-green-50 text-green-700 ring-1 ring-green-600" : "border-line bg-surface text-ink-600 hover:bg-ink-50"}`}
              >
                ✓ Approuver (Donner raison au Client)
              </button>
              <button 
                onClick={() => setDecision("REJECT")}
                className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-all ${decision === "REJECT" ? "border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600" : "border-line bg-surface text-ink-600 hover:bg-ink-50"}`}
              >
                ✗ Rejeter (Donner raison au Vendeur)
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleDecision}
                disabled={!decision || !resolutionText || isSubmitting}
                className="rounded-xl bg-ink-950 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : "Confirmer la décision"}
              </button>
            </div>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
