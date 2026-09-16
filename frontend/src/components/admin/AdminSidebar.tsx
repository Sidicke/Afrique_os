"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn, initials } from "@/lib/utils";
import { useSession } from "@/lib/useSession";
import { logout } from "@/lib/accountStore";
import { motion, AnimatePresence } from "framer-motion";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

/** Icônes SVG — jeu cohérent (Heroicons/Lucide), aucun emoji (design system) */
const icon = (paths: React.ReactNode, w = 20) => (
  <svg
    width={w}
    height={w}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
);

const NAV_ICONS = {
  overview: icon(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  verification: icon(
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  stores: icon(
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v9h14v-9" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  users: icon(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  orders: icon(
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  subscriptions: icon(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  analytics: icon(
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  moderation: icon(
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </>
  ),
  settings: icon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
};

/** Navigation — 9 sections groupées par domaine (doc 02 : Core / Intelligence / Governance / Configuration) */
const NAV_GROUPS: Array<{
  group: string;
  items: Array<{ label: string; href: string; icon: React.ReactNode }>;
}> = [
  {
    group: "Core",
    items: [
      { label: "Overview", href: "/admin", icon: NAV_ICONS.overview },
      { label: "Verification", href: "/admin/verification", icon: NAV_ICONS.verification },
      { label: "Stores", href: "/admin/stores", icon: NAV_ICONS.stores },
      { label: "Users", href: "/admin/users", icon: NAV_ICONS.users },
      { label: "Orders", href: "/admin/orders", icon: NAV_ICONS.orders },
      { label: "Subscriptions", href: "/admin/subscriptions", icon: NAV_ICONS.subscriptions },
    ],
  },
  {
    group: "Intelligence",
    items: [{ label: "Analytics", href: "/admin/analytics", icon: NAV_ICONS.analytics }],
  },
  {
    group: "Governance",
    items: [{ label: "Moderation", href: "/admin/moderation", icon: NAV_ICONS.moderation }],
  },
  {
    group: "Configuration",
    items: [{ label: "Settings", href: "/admin/settings", icon: NAV_ICONS.settings }],
  },
];

export default function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();

  const handleLogout = async () => {
    await logout();
    onCloseMobile?.();
    router.push("/connexion");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="shrink-0 border-b border-line px-5 pb-5 pt-5">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="group flex items-center gap-3" onClick={onCloseMobile}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-soft bg-midnight-950 font-display text-xs font-bold text-gold-300 transition-colors group-hover:bg-midnight-800">
              AC
            </span>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold tracking-wide text-ink-950">
                ZennShop <span className="text-gold-strong">OS</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                Administration
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-950 lg:hidden"
              aria-label="Fermer le menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Badge de rôle — l'utilisateur suprême */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold-soft bg-gold-wash px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-strong">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">
            Super Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 [scrollbar-width:thin]">
        <nav className="flex flex-col gap-6" aria-label="Navigation administrateur">
          {NAV_GROUPS.map((group) => (
            <div key={group.group}>
              <h4 className="mb-2.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                {group.group}
              </h4>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-blue-700 text-white shadow-md shadow-blue-700/25"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-950"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className={cn(
                          "transition-colors",
                          isActive ? "text-gold-soft" : "text-ink-400 group-hover:text-gold-strong"
                        )}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Profil admin — zone utilisateur séparée des paramètres globaux (doc 02 §15) */}
      <div className="shrink-0 border-t border-line p-3.5">
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-soft bg-gold-wash font-display text-xs font-bold text-gold-strong">
              {initials(session?.user?.name ?? "Super Admin")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink-950">
                {session?.user?.name ?? "Super Admin"}
              </p>
              <p className="font-mono text-[10px] text-ink-400">Accès complet</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="cursor-pointer rounded-lg border border-line p-1.5 text-ink-400 transition-colors hover:border-red-100 hover:bg-red-100/60 hover:text-red-600"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-hidden border-r border-line bg-surface lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-ink-950/45 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-surface shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}


