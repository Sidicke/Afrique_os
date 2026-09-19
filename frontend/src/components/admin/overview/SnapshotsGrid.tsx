"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type {
  AdminOrdersSnapshot,
  AdminStoresSnapshot,
  AdminSubscriptionsSnapshot,
  AdminUsersSnapshot,
} from "@/types/admin";

/* ———————————————————————————————— Stores ———————————————————————————————— */

function StoresSnapshot({ data }: { data: AdminStoresSnapshot }) {
  const rows = [
    { label: "Actives", value: data.active, href: "/admin/stores", tone: "text-green-700 bg-green-100" },
    { label: "En attente", value: data.pending, href: "/admin/stores", tone: "text-gold-strong bg-gold-wash" },
    { label: "Suspendues", value: data.suspended, href: "/admin/stores", tone: "text-amber-700 bg-amber-100" },
    { label: "Bloquées", value: data.blocked, href: "/admin/stores", tone: "text-red-600 bg-red-100" },
  ];
  return (
    <SnapshotCard
      title="Stores overview"
      cta={{ label: "View all stores", href: "/admin/stores" }}
    >
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            className="rounded-xl border border-line bg-ink-50/50 px-3 py-2.5 transition-colors hover:border-gold-soft hover:bg-gold-wash/50"
          >
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              {r.label}
            </span>
            <span className={cn("mt-1 inline-block rounded-md px-1.5 py-0.5 font-display text-lg font-bold", r.tone)}>
              {r.value.toLocaleString("fr-FR")}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-green-700">
          ▲ {data.newStoresChangePercent}%
        </span>
        {data.newStores.toLocaleString("fr-FR")} nouvelles boutiques
      </div>
    </SnapshotCard>
  );
}

/* ———————————————————————————————— Users ———————————————————————————————— */

function UsersSnapshot({ data }: { data: AdminUsersSnapshot }) {
  const rows = [
    { label: "Total", value: data.total, tone: "text-ink-950" },
    { label: "Clients", value: data.clients, tone: "text-blue-700" },
    { label: "Vendeurs", value: data.merchants, tone: "text-gold-strong" },
    { label: "Nouveaux", value: data.newUsers, tone: "text-green-700" },
  ];
  return (
    <SnapshotCard title="Users overview" cta={{ label: "View users", href: "/admin/users" }}>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-line bg-ink-50/50 px-3 py-2.5">
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              {r.label}
            </span>
            <span className={cn("mt-1 block font-display text-lg font-bold", r.tone)}>
              {r.value.toLocaleString("fr-FR")}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-green-700">
          ▲ {data.newUsersChangePercent}%
        </span>
        nouveaux utilisateurs
      </div>
    </SnapshotCard>
  );
}

/* ———————————————————————————————— Orders ———————————————————————————————— */

function OrdersSnapshot({ data }: { data: AdminOrdersSnapshot }) {
  const total = data.pending + data.processing + data.completed + data.cancelled;
  const completedPct = total ? Math.round((data.completed / total) * 100) : 0;
  const rows = [
    { label: "En attente", value: data.pending, tone: "text-gold-strong bg-gold-wash" },
    { label: "En cours", value: data.processing, tone: "text-blue-700 bg-blue-100" },
    { label: "Livrées", value: data.completed, tone: "text-green-700 bg-green-100" },
    { label: "Annulées", value: data.cancelled, tone: "text-red-600 bg-red-100" },
  ];
  return (
    <SnapshotCard title="Orders overview" cta={{ label: "View platform orders", href: "/admin/orders" }}>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-line bg-ink-50/50 px-3 py-2.5">
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              {r.label}
            </span>
            <span className={cn("mt-1 inline-block rounded-md px-1.5 py-0.5 font-display text-lg font-bold", r.tone)}>
              {r.value.toLocaleString("fr-FR")}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div className="h-full rounded-full bg-green-600" style={{ width: `${completedPct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-500">{completedPct}% des commandes livrées</p>
      </div>
    </SnapshotCard>
  );
}

/* ———————————————————————————————— Subscriptions ———————————————————————————————— */

function SubscriptionsSnapshot({ data }: { data: AdminSubscriptionsSnapshot }) {
  const { formatPrice } = useTranslation();
  const rows = [
    { label: "Gratuit", value: data.free, tone: "text-ink-500" },
    { label: "Essai", value: data.trial, tone: "text-blue-700" },
    { label: "Pro", value: data.pro, tone: "text-gold-strong" },
    { label: "Business", value: data.business, tone: "text-green-700" },
  ];
  return (
    <SnapshotCard title="Subscriptions" cta={{ label: "Voir les revenus", href: "/admin/subscriptions" }}>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-line bg-ink-50/50 px-3 py-2.5">
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              {r.label}
            </span>
            <span className={cn("mt-1 block font-display text-lg font-bold", r.tone)}>
              {r.value.toLocaleString("fr-FR")}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-gold-soft bg-gold-wash px-3 py-2">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-500">MRR</span>
        <span className="font-display text-sm font-bold text-gold-strong">{formatPrice(data.mrrFcfa)}</span>
      </div>
    </SnapshotCard>
  );
}

/* ———————————————————————————————— Carte générique ———————————————————————————————— */

function SnapshotCard({
  title,
  cta,
  children,
}: {
  title: string;
  cta: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-ink-950/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink-950">{title}</h3>
        <Link
          href={cta.href}
          className="font-mono text-[10px] font-semibold text-blue-700 transition-colors hover:text-blue-600"
        >
          {cta.label} →
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface SnapshotsGridProps {
  stores: AdminStoresSnapshot;
  users: AdminUsersSnapshot;
  orders: AdminOrdersSnapshot;
  subscriptions: AdminSubscriptionsSnapshot;
}

/** Grille des 4 snapshots — doc 03 §16-19 */
export function SnapshotsGrid({ stores, users, orders, subscriptions }: SnapshotsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StoresSnapshot data={stores} />
      <UsersSnapshot data={users} />
      <OrdersSnapshot data={orders} />
      <SubscriptionsSnapshot data={subscriptions} />
    </div>
  );
}
