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
export function SettingsSection({ section }: { section: SettingsSectionName }) {
  const { form, loading, saving, update, saveAll, savePatch, reset } = useSettingsForm();
  const isStandalone = section === "profil" || section === "formule";

  if (isStandalone) {
    if (section === "profil") return <ProfileSection />;
    return <FormuleSection />;
  }

  if (loading || !form) return <SettingsSkeleton />;

  switch (section) {
    case "identite":
      return <IdentitySection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
    case "visuels":
      return <VisualsSection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
    case "contacts":
      return <ContactsSection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
    case "livraison":
      return <DeliverySection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
    case "promotions":
      return <PromotionsSection form={form} update={update} saving={saving} saveAll={saveAll} reset={reset} />;
    case "notifications":
      return (
        <NotificationsSection
          form={form}
          update={update}
          saving={saving}
          savePatch={savePatch}
          reset={reset}
        />
      );
    default:
      return null;
  }
}
