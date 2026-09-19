"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getSessionUser } from "@/lib/api/session";
import { useSession } from "@/lib/useSession";

/**
 * Layout du dashboard Administrateur Général (Super Admin).
 *
 * Garde d'accès : réservé aux utilisateurs au rôle ADMIN (l'utilisateur
 * suprême). Les vendeurs et clients sont redirigés vers leur espace.
 * La coquille est volontairement SÉPARÉE de l'espace vendeur : mêmes
 * composants de base (design system), mais navigation et données propres.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Garde d'accès — se déclenche à la connexion comme à la déconnexion
  useEffect(() => {
    const user = getSessionUser();
    if (!user) {
      router.replace("/connexion");
      return;
    }
    if (user.role !== "ADMIN") {
      // Un non-administrateur n'accède jamais à la console plateforme
      router.replace(user.role === "CLIENT" ? "/espace-client" : "/espace-vendeur");
    }
  }, [router, session]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-paper text-ink-950 antialiased selection:bg-gold-soft selection:text-ink-950">
      {/* Sidebar — navigation administrateur (9 sections groupées) */}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Contenu principal : Topbar fixe en haut + zone de contenu défilante */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main
          id="main-content"
          className="dashboard-scroll w-full flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8"
        >
          <div className="mx-auto w-full max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
