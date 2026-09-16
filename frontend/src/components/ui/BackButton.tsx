"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  label?: string;
  variant?: "dark" | "light";
  fallbackUrl?: string;
  className?: string;
}

/**
 * Bouton retour universel (dark & light).
 * Revient à la page précédente dans l'historique, ou vers fallbackUrl.
 */
export default function BackButton({
  label = "Retour",
  variant = "dark",
  fallbackUrl = "/",
  className,
}: BackButtonProps) {
  const router = useRouter();

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) router.back();
    else router.push(fallbackUrl);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border py-2 pl-3.5 pr-4 text-xs sm:text-sm font-semibold transition-all duration-200",
        variant === "dark"
          ? "border-white/10 bg-white/5 text-ivory-50/70 hover:border-gold-400/40 hover:bg-gold-400/10 hover:text-gold-300"
          : "border-midnight-950/12 bg-white text-midnight-950/75 shadow-sm hover:border-gold-500 hover:bg-gold-50/50 hover:text-midnight-950",
        className
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      >
        <path
          d="M10 3L5 8l5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
