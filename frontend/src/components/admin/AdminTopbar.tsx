"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, initials } from "@/lib/utils";
import { useSession } from "@/lib/useSession";
import { setAdminPeriod, useAdminPeriod } from "@/lib/useAdminPeriod";
import { useAdminVerifications } from "@/hooks/useAdminVerifications";
import { adminService } from "@/services/adminService";

interface AdminTopbarProps {
  onOpenMobileSidebar?: () => void;
}

/** Options de période du dashboard (doc 03 — §8) */
const PERIODS: Array<{ value: "7_days" | "30_days" | "90_days" | "this_year"; label: string }> = [
  { value: "7_days", label: "7 j" },
  { value: "30_days", label: "30 j" },
  { value: "90_days", label: "90 j" },
  { value: "this_year", label: "Année" },
];

/** Entité indexée par la recherche globale (doc 02 — §16) — construite à la volée depuis l'API */
interface SearchEntry {
  kind: "Store" | "User" | "Order";
  label: string;
  sub: string;
  href: string;
}

export default function AdminTopbar({
  onOpenMobileSidebar,
}: AdminTopbarProps) {
  const router = useRouter();
  const session = useSession();
  const period = useAdminPeriod();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState<SearchEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const indexLoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Garde de démontage (même pattern que useAsyncResource) : jamais de
  // setState après unmount si l'utilisateur navigue pendant le chargement.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Badge cloche = vraies vérifications en attente (doc 04)
  const { data: verifications } = useAdminVerifications();
  const pendingVerifications = verifications?.kpis.pending ?? 0;

  /**
   * Index de recherche construit depuis les vraies listes API (une seule fois,
   * au premier usage) : boutiques + utilisateurs + commandes de la plateforme.
   */
  const loadSearchIndex = useCallback(async () => {
    if (indexLoadedRef.current) return;
    indexLoadedRef.current = true;
    setSearchLoading(true);
    try {
      const [stores, users, orders] = await Promise.all([
        adminService.getStores(),
        adminService.getUsers(),
        adminService.getOrders(),
      ]);
      if (!mountedRef.current) return;
      const entries: SearchEntry[] = [
        ...stores.rows.map((s) => ({
          kind: "Store" as const,
          label: s.name,
          sub: s.merchantName,
          href: `/admin/stores/${s.id}`,
        })),
        ...users.rows.map((u) => ({
          kind: "User" as const,
          label: u.name,
          sub: u.email,
          href: `/admin/users/${u.id}`,
        })),
        ...orders.rows.map((o) => ({
          kind: "Order" as const,
          label: o.reference,
          sub: `${o.customer.name} · ${o.amountFcfa.toLocaleString("fr-FR")} FCFA`,
          href: `/admin/orders/${o.id}`,
        })),
      ];
      setSearchIndex(entries);
    } catch (err) {
      console.warn("[AdminTopbar] index de recherche indisponible :", err);
      indexLoadedRef.current = false;
    } finally {
      if (mountedRef.current) setSearchLoading(false);
    }
  }, []);

  // Raccourci clavier ⌘K / Ctrl+K → ouvre la recherche globale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => {
          const next = !o;
          if (next) void loadSearchIndex();
          return next;
        });
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loadSearchIndex]);

  // Focus automatique de l'input + fermeture au clic extérieur
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
    const onPointerDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchIndex.slice(0, 5);
    return searchIndex
      .filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.sub.toLowerCase().includes(q) ||
          r.kind.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, searchIndex]);

  const navigate = (href: string) => {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  };

  const name = session?.user?.name ?? "Super Admin";

  return (
    <header className="shrink-0 z-30 flex h-16 w-full items-center justify-between border-b border-line bg-white/95 px-3.5 backdrop-blur-xl sm:px-8">
      {/* Left : toggle mobile + recherche globale */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-xl border border-line bg-surface p-2 text-ink-600 hover:bg-ink-50 hover:text-ink-950 lg:hidden shrink-0"
          aria-label="Ouvrir le menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Bouton recherche mobile */}
        <button
          type="button"
          onClick={() => {
            setSearchOpen(true);
            void loadSearchIndex();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-600 hover:border-blue-600 hover:text-blue-700 sm:hidden shrink-0"
          aria-label="Recherche rapide"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Recherche globale desktop (doc 02 §16) */}
        <div ref={searchRef} className="relative hidden sm:block w-60 md:w-80">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              void loadSearchIndex();
            }}
            aria-label="Recherche globale"
            aria-expanded={searchOpen}
            aria-haspopup="dialog"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-ink-50 py-2 pl-3.5 pr-3 text-left text-xs text-ink-400 shadow-sm transition-colors hover:border-blue-600 hover:text-ink-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-400">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Rechercher… (Stores, Users, Orders)
            <kbd className="ml-auto rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
              ⌘K
            </kbd>
          </button>

          {searchOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-ink-950/10">
              <div className="border-b border-line p-2">
                <div className="flex items-center gap-2.5 rounded-xl bg-ink-50 px-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-400">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Stores, utilisateurs, commandes…"
                    className="w-full bg-transparent py-2 text-xs text-ink-950 placeholder-ink-400 focus:outline-none"
                  />
                  <kbd className="font-mono text-[10px] text-ink-400">Échap</kbd>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5">
                <p className="px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Résultats
                </p>
                {searchLoading && searchIndex.length === 0 ? (
                  <p className="px-2.5 py-4 text-center text-xs text-ink-400">
                    Chargement des données…
                  </p>
                ) : results.length === 0 ? (
                  <p className="px-2.5 py-4 text-center text-xs text-ink-400">
                    Aucun résultat pour « {query} »
                  </p>
                ) : (
                  <ul>
                    {results.map((r) => (
                      <li key={r.label}>
                        <button
                          type="button"
                          onClick={() => navigate(r.href)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-ink-50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface font-mono text-[9px] font-semibold uppercase text-ink-500">
                            {r.kind.slice(0, 4)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-ink-950">{r.label}</span>
                            <span className="block truncate text-[10px] text-ink-400">{r.sub}</span>
                          </span>
                          <span className="text-ink-300">↗</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal recherche mobile */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 bg-ink-950/45 backdrop-blur-sm sm:hidden">
          <div className="w-full mt-12 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line p-3">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-ink-50 px-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-400">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full bg-transparent py-2 text-xs text-ink-950 placeholder-ink-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-lg p-1.5 text-xs text-ink-500 hover:text-ink-950"
              >
                Fermer
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="py-4 text-center text-xs text-ink-400">Aucun résultat</p>
              ) : (
                <ul>
                  {results.map((r) => (
                    <li key={r.label}>
                      <button
                        type="button"
                        onClick={() => navigate(r.href)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-ink-50"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface font-mono text-[9px] font-semibold uppercase text-ink-500">
                          {r.kind.slice(0, 4)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-ink-950">{r.label}</span>
                          <span className="block truncate text-[10px] text-ink-400">{r.sub}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right : période, notifications, profil */}
      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        {/* Sélecteur de période desktop (doc 03 §8) */}
        <div className="hidden items-center gap-1.5 rounded-xl border border-line bg-ink-50 p-1 md:flex">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setAdminPeriod(p.value)}
              className={cn(
                "cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[11px] transition-colors",
                period === p.value
                  ? "bg-blue-700 font-semibold text-white"
                  : "text-ink-600 hover:text-ink-950"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sélecteur de période mobile */}
        <div className="flex md:hidden">
          <select
            value={period}
            onChange={(e) => setAdminPeriod(e.target.value as any)}
            className="rounded-xl border border-line bg-surface px-2 py-1.5 font-mono text-[10px] text-ink-700 focus:outline-none"
            aria-label="Période"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Voir le site public */}
        <Link
          href="/marketplace"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Voir le site public"
          title="Voir le site public"
          className="rounded-xl border border-line bg-surface p-2 text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700 shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>

        {/* Notifications admin — badge = vérifications en attente (données réelles) */}
        <Link
          href="/admin/verification"
          className="relative rounded-xl border border-line bg-surface p-2 text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700"
          aria-label={
            pendingVerifications > 0
              ? `Notifications administrateur (${pendingVerifications} vérifications en attente)`
              : "Notifications administrateur"
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {pendingVerifications > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white shadow-sm">
              {pendingVerifications > 99 ? "99+" : pendingVerifications}
            </span>
          )}
        </Link>

        {/* Profil admin */}
        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <Link href="/admin/profile" className="flex items-center gap-2.5" aria-label="Mon profil">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold-soft bg-midnight-950 font-display text-xs font-bold text-gold-300 shadow-sm">
              {initials(name)}
            </span>
            <span className="hidden text-left xl:block">
              <span className="block text-xs font-semibold leading-tight text-ink-950">{name}</span>
              <span className="block font-mono text-[10px] text-gold-strong">Super Admin</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
