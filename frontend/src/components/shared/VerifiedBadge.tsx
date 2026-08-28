import { cn } from "@/lib/utils";

/**
 * Badge de vérification — l'image officielle `verification.png`, affichée sur
 * la vitrine et les produits des boutiques vérifiées. Identique partout
 * (vitrine, espace client, dashboard) pour une confiance immédiate.
 */
export function VerifiedBadge({
  className,
  title = "Boutique vérifiée",
}: {
  className?: string;
  title?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/badges/verification.png"
      alt={title}
      title={title}
      className={cn(
        "inline-block h-4 w-4 shrink-0 object-contain align-middle",
        className
      )}
    />
  );
}

export default VerifiedBadge;
