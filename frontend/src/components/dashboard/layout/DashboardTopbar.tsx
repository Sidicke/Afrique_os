"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, publicShopHref } from "@/lib/utils";
import { useSession } from "@/lib/useSession";
import { merchantProfile } from "@/services/dashboardService";
import { getBoutiqueName } from "@/lib/api/session";
import NotificationBell from "./NotificationBell";
import { CurrencySelector } from "./CurrencySelector";

interface TopbarProps {
  onOpenMobileSidebar?: () => void;
  dateFilter?: string;
  onDateFilterChange?: (filter: string) => void;
}

export default function DashboardTopbar({
  onOpenMobileSidebar,
  dateFilter = "30_days",
  onDateFilterChange,
}: TopbarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  // Vitrine publique du vendeur connecté (repli : la démo /boutique)
  const session = useSession();
  const shopHref = publicShopHref(session?.user.boutiqueSlug);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/espace-vendeur/commandes?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="shrink-0 z-30 flex h-16 w-full items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-xl sm:px-8">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-ink-600 hover:bg-ink-50 hover:text-ink-950 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-64 md:w-80">
          <svg
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une commande, produit..."
            className="w-full rounded-xl border border-line bg-ink-50 py-2 pl-10 pr-9 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
            ↵
          </kbd>
        </form>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Sélecteur de Devise */}
        <div className="w-24 sm:w-auto shrink-0">
          <CurrencySelector />
        </div>

        {/* Voir ma boutique — sortie discrète vers la vitrine réelle du vendeur */}
        <Link
          href={shopHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Voir ma boutique publique"
          title="Voir ma boutique publique"
          className="rounded-xl border border-line bg-surface p-2 text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>

        {/* Notification Bell (badge non-lues + panneau) */}
        <NotificationBell />

        {/* Merchant Profile Avatar */}
        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <div suppressHydrationWarning className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-gold-soft bg-gold-wash font-display text-sm font-bold text-gold-strong shadow-sm">
            {merchantProfile.avatarInitials}
          </div>
          <div className="hidden text-left xl:block">
            <p suppressHydrationWarning className="text-xs font-semibold leading-tight text-ink-950">{merchantProfile.name}</p>
            <p suppressHydrationWarning className="font-mono text-[10px] text-gold-strong">{(session?.user as any)?.boutiqueName || session?.user?.boutiqueSlug || getBoutiqueName() || merchantProfile.shopName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
