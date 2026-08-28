"use client";

import { useMemo, useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { SegmentBadge } from "@/components/dashboard/ui/Badges";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { formatFcfa, cn } from "@/lib/utils";
import { Customer } from "@/types/dashboard";

type SegmentFilter = "all" | Customer["segment"];

const SEGMENT_TABS: Array<{ value: SegmentFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "VIP", label: "VIP" },
  { value: "Fidèle", label: "Fidèles" },
  { value: "Régulier", label: "Réguliers" },
  { value: "Nouveau", label: "Nouveaux" },
];

export default function ClientsPage() {
  const { data, loading } = useCustomers();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const list = data.filter((c) => {
      const matchSegment = segment === "all" || c.segment === segment;
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);
      return matchSegment && matchQuery;
    });
    return [...list].sort((a, b) =>
      sortDesc ? b.totalSpentFcfa - a.totalSpentFcfa : a.totalSpentFcfa - b.totalSpentFcfa
    );
  }, [data, query, segment, sortDesc]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const totalSpent = list.reduce((sum, c) => sum + c.totalSpentFcfa, 0);
    const totalOrders = list.reduce((sum, c) => sum + c.ordersCount, 0);
    return {
      total: list.length,
      vip: list.filter((c) => c.segment === "VIP").length,
      totalSpent,
      avgBasket: totalOrders ? Math.round(totalSpent / totalOrders) : 0,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Relation client"
        title="Clients"
        description="Identifiez vos meilleurs clients, fidélisez vos acheteurs réguliers et développez votre réseau."
        actions={
          <button
            onClick={() => setQuery("")}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
          >
            <Icon name="download" size={14} /> Exporter la liste
          </button>
        }
      />

      {/* Bandeau de chiffres */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon="users" label="Clients" value={String(stats.total)} tone="gold" />
        <MiniStat icon="star" label="Clients VIP" value={String(stats.vip)} tone="blue" />
        <MiniStat icon="wallet" label="CA clients" value={formatFcfa(stats.totalSpent)} tone="green" />
        <MiniStat icon="basket" label="Panier moyen" value={formatFcfa(stats.avgBasket)} tone="ivory" />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {SEGMENT_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setSegment(t.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                segment === t.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
      </div>

      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} client${filtered.length > 1 ? "s" : ""}`}
          subtitle="Triez par montant total dépensé"
          action={
            <button
              onClick={() => setSortDesc((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong"
            >
              <Icon name="chart" size={13} />
              {sortDesc ? "CA décroissant" : "CA croissant"}
            </button>
          }
        />

        {loading || !data ? (
          <div className="mt-2">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title="Aucun client trouvé"
            description="Modifiez votre recherche ou votre filtre de segment."
          />
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs text-ink-700">
              <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-2 py-3">CLIENT</th>
                  <th className="px-2 py-3">VILLE</th>
                  <th className="px-2 py-3 text-right">COMMANDES</th>
                  <th className="px-2 py-3 text-right">TOTAL DÉPENSÉ</th>
                  <th className="px-2 py-3">SEGMENT</th>
                  <th className="px-2 py-3">DERNIÈRE COMMANDE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="group transition-colors hover:bg-ink-50/70">
                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={customer.name} size="sm" />
                        <div>
                          <p className="font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                            {customer.name}
                          </p>
                          <p className="text-[10px] text-ink-400">{customer.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-ink-600">{customer.city}</td>
                    <td className="px-2 py-3.5 text-right font-mono font-semibold text-ink-950">
                      {customer.ordersCount}
                    </td>
                    <td className="px-2 py-3.5 text-right font-mono font-bold text-gold-strong">
                      {formatFcfa(customer.totalSpentFcfa)}
                    </td>
                    <td className="px-2 py-3.5">
                      <SegmentBadge segment={customer.segment} />
                    </td>
                    <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                      {customer.lastOrderDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
