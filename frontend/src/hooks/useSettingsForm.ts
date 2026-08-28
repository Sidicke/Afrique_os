"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import type { ShopConfig } from "@/lib/shopConfig";

/**
 * Formulaire de configuration boutique — partagé par toutes les sections
 * de l'arborescence Paramètres (identité, visuels, contacts, livraison,
 * promotions). Chaque page de section appelle ce hook puis rend sa section :
 * la config est chargée une fois, le formulaire est prérempli et chaque
 * section dispose de son propre bouton d'enregistrement.
 */
export function useSettingsForm() {
  const { data, loading, saving, save } = useSettings();
  const [form, setForm] = useState<ShopConfig | null>(null);

  // Préremplit le formulaire dès que la config arrive (pattern React :
  // état dérivé pendant le rendu, sans effet ni setState synchrone).
  const [prevData, setPrevData] = useState<ShopConfig | null>(null);
  if (data && data !== prevData) {
    setPrevData(data);
    setForm(data);
  }

  const update = (patch: Partial<ShopConfig>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  /** Enregistre l'ensemble du formulaire (le bouton de section) */
  const saveAll = async (): Promise<boolean> => {
    if (!form) return false;
    const ok = await save(form);
    return ok;
  };

  /** Enregistre un patch ciblé (ex. notifications) */
  const savePatch = async (patch: Partial<ShopConfig>): Promise<boolean> => {
    const ok = await save(patch);
    return ok;
  };

  /** Annule les modifications en cours — retour aux valeurs enregistrées */
  const reset = () => setForm(data);

  return { form, loading, saving, update, saveAll, savePatch, reset };
}
