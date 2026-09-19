"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/api/session";

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
    if (typeof window !== "undefined") {
      // Pour éviter de retourner sur un site externe (Google etc.), on vérifie si
      // on peut intelligemment forcer le fallback applicatif pour un utilisateur connecté.
      // S'il n'y a pas d'historique local fiable, on utilise le fallback.
      if (window.history.length > 2) {
        router.back();
      } else {
        const user = getSessionUser();
        if (user?.role === "CLIENT") {
          router.push("/espace-client");
        } else if (user?.role === "ADMIN" || user?.role === "VENDEUR") {
          router.push("/espace-vendeur");
        } else {
          router.push(fallbackUrl);
        }
      }
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full border py-2 pl-3 pr-4 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none active:scale-95",
        variant === "dark"
          ? "border-white/20 bg-midnight-900/80 text-ivory-50/90 shadow-sm hover:border-gold-400/70 hover:bg-gold-400/15 hover:text-gold-300"
          : "border-midnight-950/20 bg-white text-midnight-950 shadow-sm shadow-midnight-950/5 hover:border-gold-500 hover:bg-midnight-950 hover:text-gold-300 hover:shadow-md",
        className
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200 group-hover:-translate-x-0.5",
          variant === "dark"
            ? "bg-white/10 text-ivory-50 group-hover:bg-gold-400/25 group-hover:text-gold-300"
            : "bg-midnight-950/8 text-midnight-950 group-hover:bg-gold-400/25 group-hover:text-gold-300"
        )}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 3L5 8l5 5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}
