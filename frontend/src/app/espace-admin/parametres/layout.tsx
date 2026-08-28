"use client";

import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { Icon } from "@/components/dashboard/icons";
import { merchantProfile } from "@/services/dashboardService";

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Configuration"
        title="Paramètres"
        description="Gérez l'identité de votre boutique, votre profil et vos préférences de notification."
        actions={
          <span className="flex items-center gap-2 rounded-xl border border-gold-soft bg-gold-wash px-3.5 py-2 font-mono text-xs font-semibold text-gold-strong">
            <Icon name="shield" size={13} /> {merchantProfile.plan}
          </span>
        }
      />
      {children}
    </div>
  );
}
