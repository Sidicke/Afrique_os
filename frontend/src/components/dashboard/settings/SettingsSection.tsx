"use client";

import { useSettingsForm } from "@/hooks/useSettingsForm";
import { SettingsSkeleton } from "./SaveButton";
import { IdentitySection } from "./IdentitySection";
import { VisualsSection } from "./VisualsSection";
import { ContactsSection } from "./ContactsSection";
import { DeliverySection } from "./DeliverySection";
import { PromotionsSection } from "./PromotionsSection";
import { ProfileSection } from "./ProfileSection";
import { NotificationsSection } from "./NotificationsSection";
import { FormuleSection } from "./FormuleSection";
import { useSession } from "@/lib/useSession";

export type SettingsSectionName =
  | "identite"
  | "visuels"
  | "contacts"
  | "livraison"
  | "promotions"
  | "profil"
  | "notifications"
  | "formule";

/**
 * Charge la configuration boutique puis rend la section demandée.
 * Chaque page de l'arborescence Paramètres est un simple appel à ce composant.
 * Les sections « profil » et « danger » n'ont pas besoin de la config : elles
 * s'affichent immédiatement (les hooks sont tous appelés avant tout retour).
 */
import { Icon } from "@/components/dashboard/icons";

export function SettingsSection({ section }: { section: SettingsSectionName }) {
  const { form, loading, saving, update, saveAll, savePatch, reset } = useSettingsForm();
  const session = useSession();
  const boutiqueName = (session?.user as any)?.boutiqueName || session?.user?.boutiqueSlug;
  const isStandalone = section === "profil" || section === "formule" || section === "notifications";

  if (isStandalone) {
    if (section === "profil") return <ProfileSection />;
    if (section === "notifications") return <NotificationsSection />;
    return <FormuleSection />;
  }

  if (loading || !form) return <SettingsSkeleton />;

  let content: React.ReactNode;
  switch (section) {
    case "identite":
      content = <IdentitySection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
      break;
    case "visuels":
      content = <VisualsSection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
      break;
    case "contacts":
      content = <ContactsSection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
      break;
    case "livraison":
      content = <DeliverySection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
      break;
    case "promotions":
      content = <PromotionsSection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
      break;
    default:
      content = null;
  }

  return <>{content}</>;
}
