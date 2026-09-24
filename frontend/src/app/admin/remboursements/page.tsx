"use client";

import { useState } from "react";
import Link from "next/link";

import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import useSWR from "swr";
import { refundsApi, ApiRefundRequest } from "@/lib/api/refunds";


const STATUS_CONFIG = {
  PENDING: { label: "Nouveau", className: "bg-blue-100 text-blue-700" },
  VENDOR_REPLIED: { label: "Réponse vendeur", className: "bg-amber-100 text-amber-700" },
  REVIEWING: { label: "En examen", className: "bg-purple-100 text-purple-700" },
  APPROVED: { label: "Approuvé", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-600" },
  COMPLETED: { label: "Clôturé", className: "bg-ink-100 text-ink-700" },
};

export default function RefundsPage() {
  const { data: refunds = [], isLoading } = useSWR('adminRefunds', refundsApi.getAdminRequests);
  const [filter, setFilter] = useState("ALL");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Remboursements & Litiges</h1>
          <p className="text-sm text-ink-500">Centre de résolution des conflits entre clients et vendeurs.</p>
        </div>
      </div>

      <DashboardCard className="p-0 overflow-hidden">
        <div className="flex items-center gap-4 border-b border-line p-4">
          <button 
            onClick={() => setFilter("ALL")}
            className={`text-sm font-semibold ${filter === "ALL" ? "text-blue-700" : "text-ink-500 hover:text-ink-950"}`}
          >
            Tous les dossiers
          </button>
          <button 
            onClick={() => setFilter("ACTION_REQUIRED")}
            className={`text-sm font-semibold flex items-center gap-1.5 ${filter === "ACTION_REQUIRED" ? "text-amber-700" : "text-ink-500 hover:text-ink-950"}`}
          >
            Action requise
            <span className="flex h-5 items-center rounded-full bg-amber-100 px-1.5 font-mono text-[10px] text-amber-700">1</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-700">
            <thead className="border-b border-line bg-surface text-xs uppercase text-ink-500">
              <tr>
                <th className="px-6 py-4 font-semibold">ID Dossier</th>
                <th className="px-6 py-4 font-semibold">Commande</th>
                <th className="px-6 py-4 font-semibold">Boutique & Client</th>
                <th className="px-6 py-4 font-semibold">Motif</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {refunds.map((refund: ApiRefundRequest) => (
                <tr key={refund.id} className="transition-colors hover:bg-ink-50/50">
                  <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-ink-950">
                    {refund.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-ink-600">
                    <Link href={`/admin/orders/${refund.order.id.slice(0, 8).replace('#', '')}`} className="hover:text-blue-600 hover:underline">
                      {refund.order.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-ink-950">{refund.boutique?.name || "Boutique inconnue"}</div>
                    <div className="text-xs text-ink-500">Client: {refund.client.name}</div>
                  </td>
                  <td className="px-6 py-4 text-ink-600">
                    {refund.reason}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${STATUS_CONFIG[refund.status as keyof typeof STATUS_CONFIG].className}`}>
                      {STATUS_CONFIG[refund.status as keyof typeof STATUS_CONFIG].label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link 
                      href={`/admin/remboursements/${refund.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-colors hover:border-blue-600 hover:text-blue-700"
                    >
                      <Icon name="eye" size={14} />
                      Examiner
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
