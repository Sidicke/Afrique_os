"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/layout/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/layout/DashboardTopbar";
import { getSession, getSessionUser } from "@/lib/api/session";
import { refreshProfile } from "@/services/dashboardService";

import { LiveNotificationProvider } from "@/components/dashboard/ui/LiveNotificationProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("30_days");

  // Garde d'authentification + profil vendeur depuis l'API.
  // Si le refresh échoue (session réellement expirée), http.ts efface la
  // session → on redirige vers la connexion.
  useEffect(() => {
    // Un ADMIN ne reste jamais dans l'espace vendeur → sa console plateforme
    if (getSessionUser()?.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    if (!getSession()) {
      router.replace("/connexion");
      return;
    }
    let cancelled = false;
    void refreshProfile().then(() => {
      if (!cancelled && !getSession()) router.replace("/connexion");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // La coquille scroll en interne (h-screen + overflow) : la scrollbar de la
  return (
    <LiveNotificationProvider>
    <div className="flex h-screen w-full overflow-hidden bg-paper text-ink-950 antialiased selection:bg-gold-soft selection:text-ink-950">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
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
    </LiveNotificationProvider>
  );
}
