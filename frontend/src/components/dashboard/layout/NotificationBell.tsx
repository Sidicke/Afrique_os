"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

/** Durée max du clignotement du titre (ms) — 12 alternances × 1,2 s */
const TITLE_BLINK_MS = 14_400;

/** Icône + couleur d'accent par type de notification */
const TYPE_META: Record<
  string,
  { label: string; badge: string; dot: string; icon: string }
> = {
  new_order: {
    label: "Commande",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-600",
    icon: "M21 8l-9-5-9 5v8l9 5 9-5V8z M3.3 8.3L12 13l8.7-4.7 M12 22V13",
  },
  order_paid: {
    label: "Paiement",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-600",
    icon: "M21 12a9 9 0 1 1-9-9 M21 3l-11 11 M15 3h6v6",
  },
  order_cancelled: {
    label: "Annulation",
    badge: "bg-red-100 text-red-600",
    dot: "bg-red-600",
    icon: "M18 6L6 18 M6 6l12 12",
  },
  new_message: {
    label: "Message",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-600",
    icon: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.25-3.5-.7L3 21l1.7-6A8.5 8.5 0 1 1 21 11.5z M8 13h5",
  },
  low_stock: {
    label: "Stock",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    icon: "M12 8v5 M12 16.5v.5 M10.3 3.9l-8.2 14A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.1l-8.2-14a2 2 0 0 0-3.4 0z",
  },
};

const TYPE_META_FALLBACK = {
  label: "Info",
  badge: "bg-ink-100 text-ink-600",
  dot: "bg-ink-400",
  icon: "M12 8v5 M12 16.5v.5",
};

/** Étiquette relative + groupe de date pour le tri du panneau */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function dayGroup(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(d)) / 86_400_000,
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/**
 * Petit « ding » doux (Web Audio) — A5 → E6, deux notes qui fondent.
 * Échoue silencieusement si l'audio est indisponible/autoplay bloqué.
 */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [880, 1320];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = now + idx * 0.18;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.75);
    });
    setTimeout(() => void ctx.close().catch(() => {}), 1100);
  } catch {
    // audio indisponible → alerte uniquement visuelle
  }
}

/**
 * Cloche de notifications du dashboard vendeur — panneau premium :
 * onglets (Toutes / Non lues), regroupement par date, icône par type.
 * Badge non-lues, « tout marquer lu », lien vers les commandes.
 */
export default function NotificationBell() {
  const {
    unreadCount,
    items,
    loading,
    markAsRead,
    markAllAsRead,
    deleteAll,
    newAlertKey,
  } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  /** Anime la secousse de la cloche quand une nouvelle notification arrive */
  const [ring, setRing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Dernier compteur connu — réutilisé par l'écouteur visibility stable */
  const unreadCountRef = useRef(unreadCount);
  /** true dès que l'utilisateur a interagi avec la page (autoplay audio) */
  const interactedRef = useRef(false);
  const originalTitleRef = useRef<string | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fermeture au clic extérieur + Échap
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // L'audio Web ne démarre qu'après une première interaction (politique autoplay)
  useEffect(() => {
    const mark = () => {
      interactedRef.current = true;
    };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);

  /** Arrête le clignotement et restaure le titre d'origine */
  const stopTitleBlink = useCallback(() => {
    if (blinkTimerRef.current) {
      clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
  }, []);

  /** Alterne le titre de l'onglet pour attirer l'œil (onglet caché) */
  const startTitleBlink = useCallback(() => {
    if (typeof document === "undefined") return;
    stopTitleBlink();
    const base = document.title || "Dashboard";
    originalTitleRef.current = base;
    let showAlert = true;
    blinkTimerRef.current = setInterval(() => {
      document.title = showAlert
        ? `🔔 Nouvelle notification : ${base}`
        : base;
      showAlert = !showAlert;
    }, 1200);
    blinkTimeoutRef.current = setTimeout(() => stopTitleBlink(), TITLE_BLINK_MS);
  }, [stopTitleBlink]);

  // Nouvelle notification détectée par le hook (polling) → alerte
  useEffect(() => {
    if (newAlertKey === 0) return;
    if (document.hidden) {
      startTitleBlink();
    } else {
      const t = setTimeout(() => setRing(true), 0);
      if (interactedRef.current) playChime();
      return () => clearTimeout(t);
    }
  }, [newAlertKey, startTitleBlink]);

  // Retour dans l'onglet : stop du clignotement + secousse si des non-lues
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) return;
      stopTitleBlink();
      if (unreadCountRef.current > 0) setRing(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopTitleBlink();
    };
  }, [stopTitleBlink]);

  // Secousse : on retire la classe après l'animation
  useEffect(() => {
    if (!ring) return;
    const t = setTimeout(() => setRing(false), 950);
    return () => clearTimeout(t);
  }, [ring]);

  const unread = items.filter((n) => !n.readAt);
  const visible = filter === "unread" ? unread : items;

  // Regroupement par date (Aujourd'hui / Hier / date)
  const groups: Array<{ label: string; items: typeof visible }> = [];
  for (const n of visible) {
    const label = dayGroup(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  const navigate = (n: (typeof items)[number]) => {
    if (!n.readAt) void markAsRead(n.id);
    setOpen(false);
    if (n.type === "new_message") router.push("/espace-vendeur/messagerie");
    else if (n.type === "low_stock") router.push("/espace-vendeur/produits");
    else router.push("/espace-vendeur/commandes");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => {
          stopTitleBlink();
          setOpen((o) => !o);
        }}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} non lues)`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative rounded-xl border border-line bg-surface p-2 text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700 cursor-pointer"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn("transition-colors", ring && "bell-ring")}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau déroulant */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-ink-950/10">
          {/* En-tête */}
          <div className="border-b border-line px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                Notifications
              </p>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 font-mono text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Onglets Toutes / Non lues */}
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-ink-50 p-1">
              {(
                [
                  { id: "all", label: "Toutes" },
                  { id: "unread", label: `Non lues (${unread.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  aria-pressed={filter === tab.id}
                  className={cn(
                    "rounded-lg py-1.5 font-mono text-[10px] font-semibold transition-colors cursor-pointer",
                    filter === tab.id
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-ink-500 hover:text-ink-800",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-2.5 flex items-center justify-end gap-1.5">
              {unread.length > 0 && (
                <button
                  onClick={() => void markAllAsRead()}
                  className="rounded-lg border border-line px-2 py-1 font-mono text-[10px] font-semibold text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Tout marquer lu
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Supprimer toutes les notifications ?")) {
                      void deleteAll();
                    }
                  }}
                  aria-label="Tout supprimer"
                  className="rounded-lg border border-red-200 px-2 py-1 font-mono text-[10px] font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                >
                  Tout supprimer
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-ink-50" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink-50">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-ink-400"
                    aria-hidden="true"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="mt-3 text-xs font-medium text-ink-700">
                  {filter === "unread"
                    ? "Aucune notification non lue"
                    : "Aucune notification"}
                </p>
                <p className="mt-1 text-[11px] text-ink-400">
                  {filter === "unread"
                    ? "Vous êtes à jour. 🎉"
                    : "Les nouvelles commandes, messages et alertes apparaîtront ici."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line/70">
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="sticky top-0 bg-white/95 px-4 pb-1 pt-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-400 backdrop-blur-sm">
                      {group.label}
                    </p>
                    <ul>
                      {group.items.map((n) => {
                        const isUnread = !n.readAt;
                        const meta = TYPE_META[n.type] ?? TYPE_META_FALLBACK;
                        return (
                          <li key={n.id}>
                            <button
                              onClick={() => navigate(n)}
                              className={cn(
                                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                                isUnread
                                  ? "bg-blue-50/50 hover:bg-blue-50"
                                  : "hover:bg-ink-50/70",
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                                  isUnread ? meta.badge : "bg-ink-50 text-ink-400",
                                )}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d={meta.icon} />
                                </svg>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                  <span
                                    className={cn(
                                      "truncate text-xs font-semibold leading-snug",
                                      isUnread ? "text-ink-950" : "text-ink-600",
                                    )}
                                  >
                                    {n.title}
                                  </span>
                                  {isUnread && (
                                    <span
                                      className={cn(
                                        "h-2 w-2 shrink-0 rounded-full",
                                        meta.dot,
                                      )}
                                    />
                                  )}
                                </span>
                                {n.message && (
                                  <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-500">
                                    {n.message}
                                  </span>
                                )}
                                <span className="mt-1 block font-mono text-[10px] text-ink-400">
                                  <span className="font-semibold text-ink-500">
                                    {meta.label}
                                  </span>
                                  {" · "}
                                  {timeLabel(n.createdAt)}
                                  {n.orderReference ? ` · ${n.orderReference}` : ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/espace-vendeur/commandes"
            onClick={() => setOpen(false)}
            className="block border-t border-line bg-ink-50/60 px-4 py-2.5 text-center font-mono text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Voir les commandes
          </Link>
        </div>
      )}
    </div>
  );
}
