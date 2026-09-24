"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import useSWR from "swr";
import { refundsApi } from "@/lib/api/refunds";


export default function VendorRefundDetailPage() {
  const params = useParams();
  const { data: refundCase, isLoading } = useSWR(['vendorRefund', params.id], () => refundsApi.getVendorRequest(params.id as string));
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    refundsApi.vendorReply(params.id as string, comment).then(() => { setIsSubmitting(false); alert("Votre réponse a été envoyée."); router.push("/espace-vendeur/remboursements"); });
  };

  if (isLoading) return <div>Chargement...</div>;
  if (!refundCase) return <div>Introuvable</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/espace-vendeur/remboursements" className="rounded-lg border border-line p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-950">
          <Icon name="arrow-left" size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Dossier {params.id as string}</h1>
          <p className="text-sm text-ink-500">Commande {refundCase.order.id.slice(0, 8)}</p>
        </div>
      </div>

      <DashboardCard className="p-6 border-red-100 bg-red-50/10">
        <div className="mb-4 border-b border-line pb-4">
          <h3 className="font-display text-lg font-semibold text-ink-950">Plainte du client</h3>
        </div>
        <div className="space-y-4 text-sm text-ink-700">
          <div><span className="block font-semibold text-ink-950">Client:</span> {refundCase.client.name}</div>
          <div><span className="block font-semibold text-ink-950">Motif:</span> {refundCase.reason}</div>
          <div><span className="block font-semibold text-ink-950">Explications:</span> {refundCase.description}</div>
          {refundCase.evidenceUrl && (
            <div>
              <span className="block font-semibold text-ink-950 mb-2">Preuve:</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={refundCase.evidenceUrl} alt="Preuve" className="rounded-xl border border-line max-h-64 object-cover" />
            </div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard className="p-6">
        <div className="mb-4 border-b border-line pb-4">
          <h3 className="font-display text-lg font-semibold text-ink-950">Votre défense</h3>
          <p className="text-sm text-ink-500">Fournissez vos explications pour aider ZennShop à trancher.</p>
        </div>
        
        {refundCase.status !== "PENDING" ? (
          <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700 border border-line">
            Votre réponse a déjà été soumise. Dossier en cours d'examen.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-ink-950">Commentaire / Preuves de bonne foi *</label>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                rows={4}
                placeholder="Ex: Le colis a été expédié en parfait état avec une double couche de papier bulle..."
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={!comment || isSubmitting}
                className="rounded-xl bg-ink-950 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Envoi..." : "Soumettre ma réponse"}
              </button>
            </div>
          </form>
        )}
      </DashboardCard>
    </div>
  );
}
