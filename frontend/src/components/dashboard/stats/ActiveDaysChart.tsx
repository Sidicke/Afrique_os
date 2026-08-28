"use client";

import { DayActivityPoint } from "@/types/dashboard";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { cn } from "@/lib/utils";

interface ActiveDaysChartProps {
  days: DayActivityPoint[];
}

/** Ventes par jour de la semaine — barres discrètes, jour de pointe en or */
export function ActiveDaysChart({ days }: ActiveDaysChartProps) {
  const max = Math.max(...days.map((d) => d.ordersCount), 1);

  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Activité par jour"
        subtitle="Commandes reçues chaque jour de la semaine"
        action={
          <span className="rounded-full border border-gold-soft bg-gold-wash px-2.5 py-1 font-mono text-[10px] font-semibold text-gold-strong">
            Pointe : {days.find((d) => d.isPeakDay)?.day ?? "-"}
          </span>
        }
      />

      <div className="mt-6 flex items-end justify-between gap-3 sm:gap-6">
        {days.map((day) => (
          <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
            <span className="font-mono text-[10px] text-ink-400">{day.ordersCount}</span>
            <div className="flex h-40 w-full max-w-10 items-end rounded-lg bg-ink-100/70">
              <div
                className={cn(
                  "w-full rounded-lg transition-all duration-700 ease-out",
                  day.isPeakDay
                    ? "bg-gradient-to-t from-gold-mid to-gold-soft shadow-lg shadow-gold-mid/25"
                    : "bg-gradient-to-t from-ink-200 to-ink-100 hover:from-gold-mid/70 hover:to-gold-soft/70"
                )}
                style={{ height: `${(day.ordersCount / max) * 100}%` }}
              />
            </div>
            <span
              className={cn(
                "font-mono text-[10px]",
                day.isPeakDay ? "font-bold text-gold-strong" : "text-ink-500"
              )}
            >
              {day.day}
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
