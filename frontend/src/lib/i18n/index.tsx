"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fr } from "./locales/fr";
import { en } from "./locales/en";

export type Language = "fr" | "en";
export type Currency = "XOF" | "XAF" | "NGN" | "GHS" | "KES" | "ZAR";
type Dictionary = typeof fr;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedLang = localStorage.getItem("zennshop_lang") as Language;
    if (storedLang && (storedLang === "fr" || storedLang === "en")) {
      setLanguageState(storedLang);
    }
    const storedCurr = localStorage.getItem("zennshop_curr") as Currency;
    if (storedCurr && ["XOF", "XAF", "NGN", "GHS", "KES", "ZAR"].includes(storedCurr)) {
      setCurrencyState(storedCurr);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("zennshop_lang", lang);
  };

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem("zennshop_curr", curr);
  };

  const t = DICTIONARIES[language];

  return (
    <I18nContext.Provider value={{ language, setLanguage, currency, setCurrency, t }}>
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

