"use client";

import { useState, useEffect } from "react";
import { SupportedCurrency, CURRENCY_SYMBOLS } from "@/lib/utils";

const CURRENCIES: { code: SupportedCurrency; label: string; flag: string }[] = [
  { code: "XOF", label: "Franc CFA (UEMOA)", flag: "🇨🇮" },
  { code: "XAF", label: "Franc CFA (CEMAC)", flag: "🇨🇲" },
  { code: "KES", label: "Shilling Kenyan", flag: "🇰🇪" },
  { code: "NGN", label: "Naira", flag: "🇳🇬" },
  { code: "GHS", label: "Cedi", flag: "🇬🇭" },
  { code: "ZAR", label: "Rand", flag: "🇿🇦" },
];

export function CurrencySelector() {
  const [currency, setCurrency] = useState<SupportedCurrency>("XOF");

  useEffect(() => {
    const saved = localStorage.getItem("zennshop_curr") as SupportedCurrency;
    if (saved) {
      setCurrency(saved);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurr = e.target.value as SupportedCurrency;
    setCurrency(newCurr);
    localStorage.setItem("zennshop_curr", newCurr);
    window.location.reload(); // Simple et garantit la mise à jour de tous les affichages
  };

  return (
    <div className="relative flex items-center rounded-xl border-2 border-blue-600 bg-blue-50 overflow-hidden shadow-sm transition-colors hover:bg-blue-100">
      <select
        value={currency}
        onChange={handleChange}
        className="w-full appearance-none bg-transparent py-2 pl-3 pr-8 text-xs font-bold text-blue-900 focus:outline-none cursor-pointer"
        aria-label="Changer la devise"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-blue-600">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}
