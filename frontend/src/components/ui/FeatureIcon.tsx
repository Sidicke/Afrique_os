/**
 * Puce des listes de fonctionnalités (tarifs).
 * Badge « scellé » (rosette) rempli en dégradé or avec coche bleu nuit —
 * un marqueur de validation premium, lisible et immédiatement reconnaissable.
 * Léger halo doré pour ressortir sur les cartes sombres.
 */
export default function FeatureIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-6 w-6 shrink-0 items-center justify-center ${className}`}
    >
      {/* Halo doré doux derrière le badge */}
      <span className="absolute inset-0 rounded-full bg-gold-400/30 blur-[9px]" />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative h-6 w-6 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
      >
        <defs>
          <linearGradient id="feature-icon-gold" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f3dd96" />
            <stop offset="55%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#b8912a" />
          </linearGradient>
        </defs>
        {/* Rosette */}
        <path
          d="M12 1.6l2.5 2.19 3.23-.42 1.04 3.12 3.02 1.35-.94 3.16.94 3.16-3.02 1.35-1.04 3.12-3.23-.42L12 20.4l-2.5-2.19-3.23.42-1.04-3.12-3.02-1.35.94-3.16-.94-3.16 3.02-1.35 1.04-3.12 3.23.42L12 1.6z"
          fill="url(#feature-icon-gold)"
          stroke="#8f6f1d"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />
        {/* Coche */}
        <path
          d="M8.4 11.9l2.5 2.5 4.7-5.2"
          stroke="#0d1117"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
