"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/dashboard/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Largeur max de la fenêtre (ex. "max-w-lg") */
  size?: "md" | "lg" | "xl";
}

const sizes = { md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

export function Modal({ open, onClose, title, subtitle, children, size = "lg" }: ModalProps) {
  // Fermeture au clavier (Échap) + verrouillage du scroll de fond
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-ink-950/45 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Fenêtre */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full ${sizes[size]} rounded-2xl border border-line bg-surface shadow-2xl shadow-ink-950/25`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Liseré supérieur doré */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold-mid/70 to-transparent" />

            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-950">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-950"
                aria-label="Fermer"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Contenu défilable — jamais coupé sur petit écran (mobile-first) */}
            <div className="max-h-[70vh] overflow-y-auto p-5 sm:max-h-[78vh]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
