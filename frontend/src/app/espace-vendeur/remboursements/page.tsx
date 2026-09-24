"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import useSWR from "swr";
import { refundsApi, ApiRefundRequest } from "@/lib/api/refunds";



const STATUS_CONFIG = {
  PENDING: { label: "Action requise", className: "bg-red-100 text-red-700" },
  VENDOR_REPLIED: { label: "Votre réponse envoyée", className: "bg-blue-100 text-blue-700" },
  REVIEWING: { label: "En examen ZennShop", className: "bg-purple-100 text-purple-700" },
  APPROVED: { label: "Approuvé (Remboursé)", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté (Fermé)", className: "bg-ink-100 text-ink-700" },
};

export default function VendorRefundsPage() {
  const { data: refunds = [], isLoading } = useSWR('vendorRefunds', refundsApi.getVendorRequests);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Litiges & Remboursements</h1>
        <p className="text-sm text-ink-500">Gérez les demandes de remboursement de vos clients.</p>
      </div>

      <DashboardCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-700">
            <thead className="border-b border-line bg-surface text-xs uppercase text-ink-500">
              <tr>
                <th className="px-6 py-4 font-semibold">ID Dossier</th>
                <th className="px-6 py-4 font-semibold">Commande</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Motif</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {refunds.map((refund: ApiRefundRequest) => (
                <tr key={refund.id} className="transition-colors hover:bg-ink-50/50">
                  <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-ink-950">{refund.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-blue-600 hover:underline">
                    <Link href={`/espace-vendeur/commandes/${refund.order.id}`}>{refund.order.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-ink-950">{refund.client.name}</td>
                  <td className="px-6 py-4 text-ink-600">{refund.reason}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${STATUS_CONFIG[refund.status as keyof typeof STATUS_CONFIG].className}`}>
                      {STATUS_CONFIG[refund.status as keyof typeof STATUS_CONFIG].label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link 
                      href={`/espace-vendeur/remboursements/${refund.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm hover:border-blue-600 hover:text-blue-700"
                    >
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-ink-500">
                    Aucune demande de remboursement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
