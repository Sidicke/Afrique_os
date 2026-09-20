"use client";

import { useState, useEffect } from "react";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { Icon } from "@/components/dashboard/icons";
import { Toast } from "@/components/dashboard/ui/Toast";
import { useSession } from "@/lib/useSession";
import { EditableCard } from "./EditableCard";
import { cn } from "@/lib/utils";
import type { ShopConfig } from "@/lib/shopConfig";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  channel: "email" | "security" | "marketing";
  category: "sales" | "security" | "marketing";
  enabled: boolean;
}

const DEFAULT_VENDOR_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: "new_order_email",
    label: "Alerte de nouvelle commande (Email)",
    description: "Recevez un email instantané dès qu'un client passe commande sur l'une de vos boutiques.",
    channel: "email",
    category: "sales",
    enabled: true,
  },
  {
    id: "low_stock_email",
    label: "Alerte de stock critique ou rupture",
    description: "Soyez notifié dès qu'un produit de l'une de vos enseignes atteint le seuil d'alerte ou est épuisé.",
    channel: "email",
    category: "sales",
    enabled: true,
  },
  {
    id: "weekly_digest_email",
    label: "Rapport hebdomadaire des ventes",
    description: "Synthèse consolidée chaque lundi matin : chiffre d'affaires global, visites et produits phares.",
    channel: "email",
    category: "sales",
    enabled: true,
  },
  {
    id: "security_alert_email",
    label: "Alertes de sécurité et connexions",
    description: "Notification immédiate en cas de nouvelle connexion sur un appareil inconnu ou de changement de mot de passe.",
    channel: "security",
    category: "security",
    enabled: true,
  },
  {
    id: "platform_tips_email",
    label: "Nouveautés ZennShop & conseils e-commerce",
    description: "Recommandations d'experts pour optimiser vos boutiques et annonces des nouvelles fonctionnalités.",
    channel: "marketing",
    category: "marketing",
    enabled: false,
  },
];

export interface NotificationsSectionProps {
  form?: ShopConfig;
  update?: (patch: Partial<ShopConfig>) => void;
  saving?: boolean;
  savePatch?: (patch: Partial<ShopConfig>) => Promise<boolean>;
  reset?: () => void;
}

export function NotificationsSection({
  form,
  update,
  saving,
  savePatch,
  reset,
}: NotificationsSectionProps = {}) {
  const session = useSession();
  const userId = session?.user?.id || "vendor";
  const storageKey = `zennshop_vendor_notifications_${userId}`;

  const [notifications, setNotifications] = useState<NotificationSetting[]>(DEFAULT_VENDOR_NOTIFICATIONS);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications((prev) =>
          prev.map((item) => {
            const found = parsed.find((p: any) => p.id === item.id);
            return found ? { ...item, enabled: Boolean(found.enabled) } : item;
          })
        );
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleToggle = (id: string, enabled: boolean) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, enabled } : n));
    setNotifications(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setToast("Préférence de notification mise à jour.");
  };

  // Si un formulaire boutique contrôlé est passé (mode boutique ou tests unitaires)
  if (form && update && savePatch && reset) {
    const updateNotifications = (id: string, enabled: boolean) => {
      update({
        notifications: form.notifications.map((n) =>
          n.id === id ? { ...n, enabled } : n
        ),
      });
    };

    return (
      <div className="flex flex-col gap-6">
        <EditableCard
          title="Préférences de notification"
          subtitle="Choisissez les alertes que vous souhaitez recevoir"
          view={
            <div className="divide-y divide-line/70">
              {form.notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-950">{n.label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{n.description}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                      n.enabled ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-400"
                    )}
                  >
                    {n.enabled ? "Activée" : "Désactivée"}
                  </span>
                </div>
              ))}
            </div>
          }
          onSave={() => savePatch({ notifications: form.notifications })}
          onCancel={reset}
          saving={saving}
        >
          <div className="divide-y divide-line/70">
            {form.notifications.map((n) => (
              <div key={n.id} className="py-4 first:pt-0 last:pb-0">
                <Toggle
                  checked={n.enabled}
                  onChange={(checked) => updateNotifications(n.id, checked)}
                  label={n.label}
                  description={n.description}
                />
              </div>
            ))}
          </div>
        </EditableCard>
      </div>
    );
  }

  // Mode autonome Compte Vendeur Général
  const salesNotifications = notifications.filter((n) => n.category === "sales");
  const securityNotifications = notifications.filter((n) => n.category === "security");
  const marketingNotifications = notifications.filter((n) => n.category === "marketing");

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête informatif vendeur global */}
      <div className="rounded-2xl border border-line bg-gradient-to-r from-blue-50/60 via-white to-blue-50/20 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Icon name="bell" size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-ink-950">
              Paramètres généraux des notifications
            </h3>
            <p className="mt-0.5 text-xs text-ink-600 leading-relaxed">
              Ces préférences s&apos;appliquent à votre compte vendeur principal ({session?.user?.email || "votre email"}).
              Vous recevrez les alertes pour l&apos;ensemble de vos boutiques créées sur la plateforme.
            </p>
          </div>
        </div>
      </div>

      {/* Ventes et Commandes */}
      <DashboardCard className="p-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Icon name="basket" size={18} className="text-gold-strong" />
              Activité des commandes & des stocks
            </span>
          }
          subtitle="Alertes relatives aux achats clients et aux niveaux d'inventaire sur vos boutiques"
        />
        <div className="mt-5 divide-y divide-line/70">
          {salesNotifications.map((n) => (
            <div key={n.id} className="py-4 first:pt-0 last:pb-0">
              <Toggle
                checked={n.enabled}
                onChange={(checked) => handleToggle(n.id, checked)}
                label={n.label}
                description={n.description}
              />
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Sécurité et Compte */}
      <DashboardCard className="p-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Icon name="lock" size={18} className="text-blue-600" />
              Sécurité & Gestion du compte
            </span>
          }
          subtitle="Alertes de protection de votre accès commerçant"
        />
        <div className="mt-5 divide-y divide-line/70">
          {securityNotifications.map((n) => (
            <div key={n.id} className="py-4 first:pt-0 last:pb-0">
              <Toggle
                checked={n.enabled}
                onChange={(checked) => handleToggle(n.id, checked)}
                label={n.label}
                description={n.description}
              />
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Conseils & Actualités */}
      <DashboardCard className="p-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Icon name="sparkle" size={18} className="text-purple-600" />
              Conseils & Communication ZennShop
            </span>
          }
          subtitle="Communications d'optimisation de vos ventes et de la plateforme"
        />
        <div className="mt-5 divide-y divide-line/70">
          {marketingNotifications.map((n) => (
            <div key={n.id} className="py-4 first:pt-0 last:pb-0">
              <Toggle
                checked={n.enabled}
                onChange={(checked) => handleToggle(n.id, checked)}
                label={n.label}
                description={n.description}
              />
            </div>
          ))}
        </div>
      </DashboardCard>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
