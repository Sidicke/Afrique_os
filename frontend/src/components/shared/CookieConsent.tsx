"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const STORAGE_KEY = "zennshop:cookies-consent";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  preferences: boolean;
  date: string;
}

export function CookieConsent() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [preferences, setPreferences] = useState(true);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Affiche avec un léger délai élégant après le chargement
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage non disponible
    }
  }, []);

  // Écoute de l'événement personnalisé pour réouvrir la modal à tout moment
  useEffect(() => {
    const handleOpen = () => {
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener("open-cookie-settings", handleOpen);
    return () => window.removeEventListener("open-cookie-settings", handleOpen);
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Stockage inaccessible
    }
    setVisible(false);
    setShowDetails(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      preferences: true,
      date: new Date().toISOString(),
    });
  };

  const handleRejectNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      preferences: false,
      date: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    savePreferences({
      essential: true,
      analytics,
      preferences,
      date: new Date().toISOString(),
    });
  };

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
      className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-xl animate-in fade-in slide-in-from-bottom-6 duration-300 sm:bottom-6 sm:left-auto sm:right-6"
    >
      {/* Carte claire — fond blanc secondaire de la plateforme avec bordure douce et ombre élégante */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-white/95 p-5 sm:p-6 text-midnight-950 shadow-2xl shadow-midnight-950/12 backdrop-blur-xl">
        {/* Halo doré très doux en arrière-plan */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold-400/10 blur-3xl"
          aria-hidden="true"
        />

        {!showDetails ? (
          /* Vue Standard */
          <div className="relative z-10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold-500/25 bg-gold-50 text-gold-700 shadow-sm">
                <CookieIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 id="cookie-title" className="font-display text-base font-bold text-midnight-950 tracking-tight">
                    {t.cookies.title}
                  </h3>
                  <span className="rounded-full border border-gold-500/30 bg-gold-50 px-2 py-0.5 font-mono text-[9px] font-semibold text-gold-700">
                    {t.cookies.badge}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-ink-600">
                  {t.cookies.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-line">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="cursor-pointer text-center text-xs font-medium text-ink-500 transition-colors hover:text-midnight-950 underline-offset-4 hover:underline py-1 sm:py-0"
              >
                {t.cookies.continueWithoutAccepting}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="flex-1 sm:flex-initial cursor-pointer rounded-xl border border-line bg-paper px-3.5 py-2 text-xs font-semibold text-ink-800 transition-all hover:bg-white hover:border-gold-500/40 hover:text-midnight-950 shadow-sm"
                >
                  {t.cookies.customize}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-initial cursor-pointer rounded-xl bg-midnight-950 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-midnight-900 hover:shadow-lg hover:shadow-midnight-950/15 active:scale-[0.98]"
                >
                  {t.cookies.acceptAll}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Vue Personnalisation détaillée */
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-50 text-gold-700 border border-gold-500/20">
                  <CookieIcon className="h-4 w-4" />
                </div>
                <h3 className="font-display text-sm font-bold text-midnight-950">
                  {t.cookies.detailsTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="cursor-pointer rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-midnight-950 transition-colors"
                aria-label={t.cookies.back}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 text-xs">
              {/* Essentiels */}
              <div className="rounded-2xl border border-line bg-paper/70 p-3 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-midnight-950">{t.cookies.essentialTitle}</span>
                    <span className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[9px] text-ink-600 font-medium">
                      {t.cookies.essentialRequired}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-500 leading-normal">
                    {t.cookies.essentialDesc}
                  </p>
                </div>
                <div className="relative flex h-5 w-9 shrink-0 items-center rounded-full bg-gold-500/20 p-0.5 opacity-80 cursor-not-allowed">
                  <span className="h-4 w-4 translate-x-4 rounded-full bg-gold-600 shadow-sm" />
                </div>
              </div>

              {/* Analytiques */}
              <div className="rounded-2xl border border-line bg-paper/70 p-3 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-midnight-950">{t.cookies.analyticsTitle}</span>
                  <p className="text-[11px] text-ink-500 leading-normal">
                    {t.cookies.analyticsDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalytics((a) => !a)}
                  className={cn(
                    "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors",
                    analytics ? "bg-midnight-950" : "bg-ink-200"
                  )}
                  aria-pressed={analytics}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                      analytics ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Préférences */}
              <div className="rounded-2xl border border-line bg-paper/70 p-3 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-midnight-950">{t.cookies.preferencesTitle}</span>
                  <p className="text-[11px] text-ink-500 leading-normal">
                    {t.cookies.preferencesDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences((p) => !p)}
                  className={cn(
                    "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors",
                    preferences ? "bg-midnight-950" : "bg-ink-200"
                  )}
                  aria-pressed={preferences}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                      preferences ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="cursor-pointer text-xs font-semibold text-ink-500 hover:text-midnight-950 transition-colors"
              >
                {t.cookies.back}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="cursor-pointer rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-midnight-950 hover:border-gold-500/50 hover:bg-paper transition-all shadow-sm"
                >
                  {t.cookies.savePreferences}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="cursor-pointer rounded-xl bg-midnight-950 px-4 py-1.5 text-xs font-bold text-white hover:bg-midnight-900 transition-all shadow-sm"
                >
                  {t.cookies.acceptAll}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CookieIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01" />
      <path d="M16 15.5v.01" />
      <path d="M12 12v.01" />
      <path d="M11 17v.01" />
      <path d="M7 13v.01" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
