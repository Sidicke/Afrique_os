"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/dashboard/icons";

/** Assets de la boutique — images produits (choix du logo, visuels…) */
export const BOUTIQUE_IMAGE_OPTIONS = [
  { src: "/assets/boutique/smartphone-pro.jpg", label: "Smartphone Pro" },
  { src: "/assets/boutique/ecouteurs.jpg", label: "Écouteurs" },
  { src: "/assets/boutique/powerbank.jpg", label: "Powerbank" },
  { src: "/assets/boutique/montre-connectee.jpg", label: "Montre connectée" },
  { src: "/assets/boutique/gadget-importe.jpg", label: "Gadget" },
  { src: "/assets/boutique/galaxy-s23-ultra.jpg", label: "Galaxy S23 Ultra" },
];

/** Images proposées pour la grande couverture de la boutique */
export const COVER_IMAGE_OPTIONS = [
  { src: "/assets/portraits/vitrine.jpg", label: "Vitrine" },
  { src: "/assets/portraits/boutique.jpg", label: "Boutique" },
  { src: "/assets/scenes/matiere.jpg", label: "Matière" },
  { src: "/assets/scenes/digital.jpg", label: "Digital" },
  { src: "/assets/scenes/ambiance-tissus.jpg", label: "Ambiance tissus" },
  { src: "/assets/scenes/ambiance-tech.jpg", label: "Ambiance tech" },
  { src: "/assets/scenes/ambiance-beaute.jpg", label: "Ambiance beauté" },
  { src: "/assets/scenes/finale.jpg", label: "Finale" },
  ...BOUTIQUE_IMAGE_OPTIONS,
];

interface AssetOption {
  src: string;
  label: string;
}

interface AssetPickerProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (src: string) => void;
  options: AssetOption[];
  /** Rendu de l'aperçu : cover (plein cadre) ou logo (carré, contenir) */
  kind?: "cover" | "logo";
}

/** Redimensionne un fichier image et le convertit en data URL (JPEG) */
function fileToDataUrl(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("canvas non supporté");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("image invalide"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("lecture impossible"));
    reader.readAsDataURL(file);
  });
}

/**
 * Choix d'une image pour la boutique : galerie des assets déjà disponibles +
 * upload classique depuis l'appareil (l'image est redimensionnée et stockée
 * en data URL — aucune saisie de chemin).
 */
export function AssetPicker({
  label,
  hint,
  value,
  onChange,
  options,
  kind = "cover",
}: AssetPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(false);
    try {
      const dataUrl = await fileToDataUrl(file, kind === "cover" ? 1200 : 600);
      onChange(dataUrl);
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-ink-600">
            {label}
          </p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            aria-label={`Importer ${label}`}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-xl border border-gold-soft bg-gold-wash px-3 py-1.5 text-xs font-semibold text-gold-strong transition-all hover:bg-gold-soft/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            <Icon name="download" size={13} />
            {uploading ? "Import…" : "Importer depuis l'appareil"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1 rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:border-red-100 hover:bg-red-100/60 hover:text-red-600 cursor-pointer"
            >
              <Icon name="trash" size={13} />
              Enlever
            </button>
          )}
        </div>
      </div>

      {/* Aperçu actuel */}
      <div
        className={cn(
          "mt-3 overflow-hidden rounded-xl border border-line bg-ink-50/60",
          kind === "cover" ? "h-32 w-full" : "h-24 w-24"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`Aperçu ${label}`}
            className={cn("h-full w-full", kind === "cover" ? "object-cover" : "object-contain p-1")}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-ink-300">
            <Icon name="eye" size={20} />
            <span className="px-2 font-mono text-[9px] uppercase tracking-wider">
              {kind === "logo" ? "Initiales affichées" : "Image par défaut"}
            </span>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="mt-2 rounded-lg bg-red-100/70 px-3 py-2 text-xs font-medium text-red-600">
          Impossible de lire cette image. Essayez-en une autre (JPG, PNG, WebP).
        </p>
      )}

      {/* Galerie des assets de la boutique */}
      {options.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
            Ou choisir parmi les assets de la boutique
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {options.map((opt) => {
              const selected = value === opt.src;
              return (
                <button
                  key={opt.src}
                  type="button"
                  onClick={() => onChange(opt.src)}
                  title={opt.label}
                  aria-pressed={selected}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg border-2 bg-ink-50 transition-all cursor-pointer",
                    selected
                      ? "border-gold-strong ring-2 ring-gold-mid/40"
                      : "border-transparent hover:border-gold-soft"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={opt.src}
                    alt={opt.label}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                  {selected && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-strong text-white">
                      <Icon name="check" size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

export default AssetPicker;
