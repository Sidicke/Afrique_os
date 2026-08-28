"use client";

import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";

interface RepeatCustomerGaugeProps {
  rate: number;
}

export default function RepeatCustomerGauge({ rate }: RepeatCustomerGaugeProps) {
  return (
    <DashboardCard className="flex flex-col justify-between p-5">
      <CardHeader
        title="Taux de Réachat Client"
        subtitle="Part des clients qui reviennent commander"
        action={
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-green-700">
            Fidélisation
          </span>
        }
      />

      {/* SVG Circular Gauge */}
      <div className="relative my-4 flex flex-col items-center justify-center">
        <svg width="150" height="100" viewBox="0 0 100 65" className="overflow-visible">
          {/* Background Track */}
          <path
            d="M 10,50 A 40,40 0 0,1 90,50"
            fill="none"
            stroke="#e8edf4"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Gradient Track */}
          <path
            d="M 10,50 A 40,40 0 0,1 90,50"
            fill="none"
            stroke="url(#gaugeGoldGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 - (125.6 * (rate / 100))}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gaugeGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1f5c43" />
              <stop offset="50%" stopColor="#a8936f" />
              <stop offset="100%" stopColor="#8a7449" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute top-8 flex flex-col items-center">
          <span className="font-display text-3xl font-bold text-ink-950">{rate}%</span>
          <span className="font-mono text-[10px] font-semibold text-blue-700">Objectif 80%</span>
        </div>
      </div>

      <button className="w-full rounded-xl border border-blue-100 bg-blue-100/40 py-2 font-mono text-xs font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-100/70">
        Voir détails fidélité
      </button>
    </DashboardCard>
  );
}
