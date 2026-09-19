const fs = require('fs');

const newContent = `"use client";

import { useTranslation, Currency, AVAILABLE_CURRENCIES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PreferenceSelectorProps {
  variant?: "navbar" | "mobile" | "footer";
  className?: string;
}

export function PreferenceSelector({ variant = "navbar", className }: PreferenceSelectorProps) {
  const { currency, setCurrency } = useTranslation();

  const handleCurrencyChange = (newCurr: Currency) => {
    if (newCurr !== currency) {
      setCurrency(newCurr);
    }
  };

  if (variant === "footer") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}>
        {/* Sélecteur de devise */}
        <div className="relative inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-ivory-50/70 hover:border-gold-400/40 hover:text-gold-300 transition-colors">
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
            aria-label="Sélectionner la devise"
            className="cursor-pointer bg-transparent pr-4 text-xs font-medium focus:outline-none [&>option]:bg-midnight-950 [&>option]:text-white"
          >
            {AVAILABLE_CURRENCIES.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.flag} {curr.code} ({curr.symbol})
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-1.5 text-[10px] text-ivory-50/40">▾</span>
        </div>
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div className={cn("flex items-center gap-3 py-2", className)}>
        <div className="relative flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-ivory-50/50 mb-0.5">
            Devise
          </label>
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
            className="w-full cursor-pointer bg-transparent text-sm font-semibold text-ivory-50 focus:outline-none [&>option]:bg-midnight-950 [&>option]:text-white"
          >
            {AVAILABLE_CURRENCIES.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.flag} {curr.code} ({curr.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Variant navbar (desktop)
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Sélecteur de devise */}
      <div className="relative inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-ivory-50/80 transition-all hover:border-gold-400/40 hover:bg-white/10 hover:text-gold-300">
        <select
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
          aria-label="Changer de devise"
          className="cursor-pointer bg-transparent pr-3.5 text-xs font-medium focus:outline-none [&>option]:bg-midnight-950 [&>option]:text-white"
        >
          {AVAILABLE_CURRENCIES.map((curr) => (
            <option key={curr.code} value={curr.code}>
              {curr.code} ({curr.symbol})
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 text-[9px] text-ivory-50/40">▾</span>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/shared/PreferenceSelector.tsx', newContent);
console.log('PreferenceSelector.tsx fixed.');
