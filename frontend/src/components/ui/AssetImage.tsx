"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AssetImageProps {
  src: string;
  alt: string;
  label?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  /** Recadrage : 1 = plein cadre, 2 = zoom serré haut (pour les visuels réutilisés) */
  mode?: 1 | 2;
}

/**
 * Image alimentée par le dossier `frontend/public/assets/`.
 * - La vraie photo est affichée dès qu'elle est déposée au bon chemin.
 * - Sinon, un placeholder élégant (pas une image temporaire) signale la case.
 */
export default function AssetImage({
  src,
  alt,
  label,
  className,
  sizes,
  priority = false,
  // 75 = qualité par défaut de Next.js (toujours autorisée par l'optimiseur,
  // même sans config `images.qualities`). Évite les 400 → placeholders.
  quality = 75,
  mode,
}: AssetImageProps) {
  const [error, setError] = useState(false);

  return (
    // Le conteneur s'étend sur tout son parent (relatif et dimensionné) :
    // sans cela, un Image en fill rendrait la div à hauteur 0.
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {error ? (
        <div
          role="img"
          aria-label={`${alt} (image à venir)`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 border border-dashed border-gold-400/30 bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-950 p-4 text-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/40 text-gold-300">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 8v5m0 3.5v.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold-300/80">
            {label ?? "Asset"}
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "100%"}
          priority={priority}
          quality={quality}
          onError={() => setError(true)}
          className={cn("object-cover", mode === 2 && "scale-110 object-[50%_25%]")}
        />
      )}
    </div>
  );
}
