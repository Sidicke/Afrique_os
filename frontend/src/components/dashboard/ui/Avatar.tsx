import { useState } from "react";
import { cn, initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

/** Avatar avec photo de profil ou initiales de secours */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-ink-50 shadow-xs",
          sizes[size],
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border border-gold-soft bg-gold-wash font-display font-bold text-gold-strong",
        sizes[size],
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
