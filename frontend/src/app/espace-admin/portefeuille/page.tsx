"use client";

import { useEffect, useState } from "react";
import { formatFcfa } from "@/lib/utils";
import { shopsApi } from "@/lib/api";
import { getSessionUser } from "@/lib/api/session";

export default function PortefeuillePage() {
  const [wallet, setWallet] = useState<{ balance: number; withdrawals: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [requesting, setRequesting] = useState(false);
  const user = getSessionUser();

  const load = async () => {
    if (!user?.boutiqueId) return;
    try {
      const res = await shopsApi.wallet(user.boutiqueId);
      setWallet(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paymentInfo || !user?.boutiqueId) return;
    setRequesting(true);
    try {
      await shopsApi.requestWithdrawal(user.boutiqueId, parseInt(amount, 10), paymentInfo);
      setAmount("");
      setPaymentInfo("");
      await load();
      alert("Demande de retrait envoyée !");
    } catch (err) {
      alert("Erreur lors de la demande");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">Mon Portefeuille</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow p-6 border border-line">
          <h2 className="text-sm font-semibold text-ink-500 mb-2">Solde disponible</h2>
          <p className="text-4xl font-bold text-gold-600">{formatFcfa(wallet?.balance || 0)}</p>
          <p className="text-xs text-ink-400 mt-2">
            Ce solde inclut l'argent des achats payés en points (Cashback) par vos clients, couvert par la plateforme.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border border-line">
          <h2 className="text-sm font-semibold text-ink-950 mb-4">Demander un retrait</h2>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Montant (FCFA)</label>
              <input 
                type="number" 
                min="100" 
                max={wallet?.balance || 0}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Informations de paiement (ex: Wave 0707...)</label>
              <input 
                type="text" 
                required
                value={paymentInfo}
                onChange={(e) => setPaymentInfo(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm" 
              />
            </div>
            <button 
              type="submit" 
              disabled={requesting || !amount || parseInt(amount, 10) > (wallet?.balance || 0)}
              className="w-full rounded-lg bg-midnight-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Retirer les fonds
            </button>
          </form>
        </div>
      </div>

      <h2 className="text-lg font-bold mt-10 mb-4">Historique des retraits</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden border border-line">
        {wallet?.withdrawals?.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-500">Aucun retrait pour le moment.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-ink-950">Date</th>
                <th className="px-4 py-3 font-semibold text-ink-950">Montant</th>
                <th className="px-4 py-3 font-semibold text-ink-950">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {wallet?.withdrawals.map((w: any) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 text-ink-600">{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{formatFcfa(w.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${w.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      w.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {w.status === 'PENDING' ? 'En attente' : w.status === 'APPROVED' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
