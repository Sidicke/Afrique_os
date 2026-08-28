"use client";

import { CustomerSegmentBreakdown } from "@/types/dashboard";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";

interface CustomerSegmentsProps {
  segments: CustomerSegmentBreakdown;
}

export default function CustomerSegments({ segments }: CustomerSegmentsProps) {
  return (
    <DashboardCard className="p-5">
      <CardHeader
        title="Segmentation Clients"
        subtitle="Répartition de votre clientèle"
        action={
          <span className="font-mono text-[10px] uppercase tracking-wider text-gold-strong">Typologie</span>
        }
      />

      <div className="mt-4 flex flex-col gap-3">
        {/* Détaillants */}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-ink-700">Particuliers / Détaillants</span>
            <span className="font-mono font-bold text-gold-strong">{segments.retailersPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gold-mid transition-all duration-500"
              style={{ width: `${segments.retailersPercent}%` }}
            />
          </div>
        </div>

        {/* Distributeurs */}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-ink-700">Distributeurs Régionaux</span>
            <span className="font-mono font-bold text-green-700">{segments.distributorsPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-green-700 transition-all duration-500"
              style={{ width: `${segments.distributorsPercent}%` }}
            />
          </div>
        </div>

        {/* Grossistes */}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-ink-700">Grossistes / Boutiques</span>
            <span className="font-mono font-bold text-blue-700">{segments.wholesalersPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${segments.wholesalersPercent}%` }}
            />
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
