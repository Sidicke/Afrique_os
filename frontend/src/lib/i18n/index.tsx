"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fr } from "./locales/fr";
import { en } from "./locales/en";
import { formatCurrency, SupportedCurrency } from "@/lib/utils";

export type Language = "fr" | "en";
export type Currency = SupportedCurrency;
type Dictionary = typeof fr;

export interface CurrencyConfig {
  code: Currency;
  label: string;
  symbol: string;
  flag: string;
}

export const AVAILABLE_CURRENCIES: CurrencyConfig[] = [
  { code: "XOF", label: "Franc CFA (XOF)", symbol: "FCFA", flag: "🌍" },
  { code: "XAF", label: "Franc CFA (XAF)", symbol: "FCFA", flag: "🌍" },
  { code: "NGN", label: "Naira (₦)", symbol: "₦", flag: "🇳🇬" },
  { code: "GHS", label: "Cedi (GH₵)", symbol: "GH₵", flag: "🇬🇭" },
  { code: "KES", label: "Shilling (KSh)", symbol: "KSh", flag: "🇰🇪" },
  { code: "ZAR", label: "Rand (R)", symbol: "R", flag: "🇿🇦" },
];

export const AVAILABLE_LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (amount: number | string, forceCurrency?: Currency) => string;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextType | null>(null);

const DICTIONARIES: Record<Language, Dictionary> = {
  fr,
  en,
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");
  const [currency, setCurrencyState] = useState<Currency>("XOF");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const storedLang = localStorage.getItem("zennshop_lang") as Language;
      if (storedLang === "fr") {
        setLanguageState(storedLang);
        document.documentElement.lang = storedLang;
      }
      const storedCurr = localStorage.getItem("zennshop_curr") as Currency;
      if (storedCurr && AVAILABLE_CURRENCIES.some((c) => c.code === storedCurr)) {
        setCurrencyState(storedCurr);
      }
    } catch {
      // localStorage indisponible
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "zennshop_lang" && (e.newValue === "fr" || e.newValue === "en")) {
        setLanguageState(e.newValue);
        document.documentElement.lang = e.newValue;
      }
      if (e.key === "zennshop_curr" && e.newValue && AVAILABLE_CURRENCIES.some((c) => c.code === e.newValue)) {
        setCurrencyState(e.newValue as Currency);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("zennshop_lang", lang);
      document.documentElement.lang = lang;
      window.dispatchEvent(new CustomEvent("zennshop:language-changed", { detail: lang }));
    } catch {
      // Ignorer
    }
  }, []);

  const setCurrency = useCallback((curr: Currency) => {
    setCurrencyState(curr);
    try {
      localStorage.setItem("zennshop_curr", curr);
      window.dispatchEvent(new CustomEvent("zennshop:currency-changed", { detail: curr }));
    } catch {
      // Ignorer
    }
  }, []);

  const formatPrice = useCallback(
    (amount: number | string, forceCurrency?: Currency) => {
      const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
      return formatCurrency(num, forceCurrency || currency);
    },
    [currency]
  );

  const t = DICTIONARIES[language] || fr;

  return (
    <I18nContext.Provider value={{ language, setLanguage, currency, setCurrency, formatPrice, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

export const useI18n = useTranslation;
