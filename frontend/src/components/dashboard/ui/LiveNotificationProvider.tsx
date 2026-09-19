"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/dashboard/icons";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  href?: string;
  tone?: "success" | "info" | "alert";
}

interface LiveNotificationContextType {
  notify: (notification: Omit<Notification, "id">) => void;
}

const LiveNotificationContext = createContext<LiveNotificationContextType | null>(null);

export function useLiveNotifications() {
  const ctx = useContext(LiveNotificationContext);
  if (!ctx) throw new Error("Missing LiveNotificationProvider");
  return ctx;
}

export function LiveNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (notif: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications((prev) => [...prev, { ...notif, id }]);
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const oldest = notifications[0];
    const timer = setTimeout(() => {
      dismiss(oldest.id);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notifications]);

  return (
    <LiveNotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
              className="pointer-events-auto flex w-max max-w-sm items-start gap-3 rounded-2xl border border-gold-soft/30 bg-ink-950/95 p-4 text-white shadow-2xl shadow-ink-950/30 backdrop-blur-xl"
            >
              <div
                className={`flex mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  n.tone === "alert"
                    ? "bg-red-500/20 text-red-400"
                    : n.tone === "success"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gold-mid/20 text-gold-strong"
                }`}
              >
                <Icon
                  name={n.tone === "alert" ? "alert" : n.tone === "success" ? "check" : "sparkle"}
                  size={16}
                />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-white leading-tight">{n.title}</p>
                <p className="mt-1 text-xs font-medium text-white/70 line-clamp-2">{n.message}</p>
                {n.href && (
                  <Link
                    href={n.href}
                    onClick={() => dismiss(n.id)}
                    className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-wider text-gold-strong hover:text-gold-300"
                  >
                    Voir les détails →
                  </Link>
                )}
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="absolute right-3 top-3 rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <Icon name="x" size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </LiveNotificationContext.Provider>
  );
}
