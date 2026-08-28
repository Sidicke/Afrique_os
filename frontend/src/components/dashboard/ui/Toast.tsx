"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, IconName } from "@/components/dashboard/icons";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  tone?: "success" | "info";
}

/** Retour utilisateur discret — apparaît en bas, disparaît seul après 3s */
export function Toast({ message, onDismiss, tone = "success" }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2"
          role="status"
        >
          <div className="flex w-max max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-gold-soft/40 bg-ink-950/95 px-4 py-3 text-white shadow-2xl shadow-ink-950/30 backdrop-blur-xl">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                tone === "success" ? "bg-green-100 text-green-700" : "bg-gold-wash text-gold-strong"
              }`}
            >
              <Icon name={(tone === "success" ? "check" : "sparkle") as IconName} size={13} strokeWidth={2.2} />
            </span>
            <p className="text-sm font-medium text-white">{message}</p>
            <button
              onClick={onDismiss}
              className="ml-1 rounded-md p-0.5 text-white/50 transition-colors hover:text-white"
              aria-label="Fermer la notification"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
