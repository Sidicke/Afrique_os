"use client";

import Link from "next/link";
import { Order } from "@/types/dashboard";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { StatusBadge } from "@/components/dashboard/ui/Badges";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { Icon } from "@/components/dashboard/icons";
import { formatCurrency } from "@/lib/utils";

interface RecentOrdersCardProps {
  orders: Order[];
}

/** Dernières commandes reçues — la question « que dois-je préparer ? » */
export function RecentOrdersCard({ orders }: RecentOrdersCardProps) {
  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Commandes récentes"
        subtitle="Les dernières commandes reçues"
        action={
          <Link
            href="/espace-vendeur/commandes"
            className="flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-100/40 px-3 py-1.5 font-mono text-xs font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-100/70"
          >
            Tout voir <Icon name="chevronRight" size={13} strokeWidth={2} />
          </Link>
        }
      />

      <ul className="mt-2 divide-y divide-line/70">
        {orders.map((order) => (
          <li
            key={order.id}
            className="group flex items-center gap-3.5 py-3 transition-colors hover:bg-ink-50/70"
          >
            <Avatar name={order.customerName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                  {order.customerName}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-ink-400">{order.orderNumber}</span>
              </div>
              <p className="truncate text-xs text-ink-500">
                {order.quantity}× {order.productName} · {order.city}
              </p>
            </div>
            <div className="hidden sm:block">
              <StatusBadge status={order.status} />
            </div>
            <div className="w-24 text-right">
              <p className="font-mono text-xs font-bold text-ink-950">{formatCurrency(order.totalPriceFcfa)}</p>
              <p className="text-[10px] text-ink-400">{order.createdAt}</p>
            </div>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
