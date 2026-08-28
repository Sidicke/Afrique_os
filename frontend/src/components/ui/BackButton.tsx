"use client";

import { useRouter } from "next/navigation";

/**
 * Bouton retour — flèche en haut de page (ex. /tarifs).
 * Revient à la page précédente ; repli vers l'accueil si aucun historique.
 */
export default function BackButton({ label = "Retour" }: { label?: string }) {
  const router = useRouter();

  const goBack = () => {
    // Next.js stocke l'index de navigation dans history.state.idx :
    // > 0 signifie qu'il existe une page précédente dans la session.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) router.back();
    else router.push("/");
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-2 pl-3 pr-4 text-sm text-ivory-50/70 transition-all duration-200 hover:border-gold-400/40 hover:bg-gold-400/10 hover:text-gold-300"
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
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
